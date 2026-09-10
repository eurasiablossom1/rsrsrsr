/**
 * Filtering & Ranking Algorithm
 * -------------------------------------------------
 * Multi-criteria filtering/ranking (Xu et al., 2022): buyer criteria
 * (budget, location, type, turnover status, financing) compared
 * against listings, each listing scored by weighted relevance, top
 * matches returned as a shortlist.
 *
 * type/location/budget are REQUIRED before showing results (decision
 * tree asks for them explicitly). turnover_status/financing are
 * OPTIONAL bonus criteria — only applied if the buyer happens to
 * mention them; the bot never blocks on them.
 */

const { isFuzzyMatch } = require("../utils/levenshtein");

function stripDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const WEIGHTS = {
  type: 0.35,
  location: 0.30,
  budget: 0.20,
  turnover_status: 0.08,
  financing: 0.07
};

const TURNOVER_PATTERNS = [
  { value: "RFO", regex: /\brfo\b|ready for occupancy|move[\s-]?in/ },
  { value: "Pre-Selling", regex: /pre[\s-]?selling|preselling/ },
  { value: "NRFO", regex: /\bnrfo\b|near ready/ }
];

const FINANCING_PATTERNS = [
  { value: "Bank", regex: /\bbank\b/ },
  { value: "Cash", regex: /\bcash\b/ },
  { value: "Pag-IBIG", regex: /pag[\s-]?ibig/ },
  { value: "In-House", regex: /in[\s-]?house/ }
];

function extractBudget(lowerMessage) {
  const tokens = lowerMessage.replace(/[^\w\s.]/g, " ").split(/\s+/).filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const numMatch = tokens[i].match(/^(\d+(?:\.\d+)?)([a-z]*)$/);
    if (!numMatch) continue;

    const num = parseFloat(numMatch[1]);
    let unit = numMatch[2];

    if (!unit && tokens[i + 1] && /^[a-z]+$/.test(tokens[i + 1])) {
      unit = tokens[i + 1];
    }

    if (unit) {
      if (unit === "m" || isFuzzyMatch(unit, "million")) return Math.round(num * 1_000_000);
      if (unit === "k" || isFuzzyMatch(unit, "thousand")) return Math.round(num * 1_000);
    }

    if (!unit && Number.isInteger(num) && numMatch[1].length >= 6 && numMatch[1].length <= 9) {
      return num;
    }
  }
  return undefined;
}

function extractCriteria(message, knownLocations) {
  const lower = message.toLowerCase();
  const criteria = {};

  const budget = extractBudget(lower);
  if (budget) criteria.budget = budget;

  if (/condo/.test(lower)) criteria.type = "condominium";
  else if (/town ?house/.test(lower)) criteria.type = "townhouse";
  else if (/house|bahay/.test(lower)) criteria.type = "house_and_lot";
  else if (/vacant lot|lot only|raw land|\blupa\b/.test(lower)) criteria.type = "lot_only";

  const lowerNorm = stripDiacritics(lower);
  const tokens = lowerNorm.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const loc of knownLocations) {
    const locLower = stripDiacritics(loc.toLowerCase());
    if (lowerNorm.includes(locLower)) {
      criteria.location = loc;
      break;
    }
    if (!locLower.includes(" ") && tokens.some((t) => isFuzzyMatch(t, locLower))) {
      criteria.location = loc;
      break;
    }
  }

  for (const { value, regex } of TURNOVER_PATTERNS) {
    if (regex.test(lower)) { criteria.turnover_status = value; break; }
  }

  for (const { value, regex } of FINANCING_PATTERNS) {
    if (regex.test(lower)) { criteria.financing = value; break; }
  }

  return criteria;
}

function scoreListing(listing, criteria) {
  let score = 0;
  let weightUsed = 0;

  if (criteria.type) {
    weightUsed += WEIGHTS.type;
    if (listing.type === criteria.type) score += WEIGHTS.type;
  }
  if (criteria.location) {
    weightUsed += WEIGHTS.location;
    const listingLoc = stripDiacritics(listing.location.toLowerCase());
    const criteriaLoc = stripDiacritics(criteria.location.toLowerCase().split(",")[0]);
    if (listingLoc.includes(criteriaLoc)) {
      score += WEIGHTS.location;
    }
  }
  if (criteria.budget) {
    weightUsed += WEIGHTS.budget;
    if (listing.price <= criteria.budget) score += WEIGHTS.budget;
    else if (listing.price <= criteria.budget * 1.15) score += WEIGHTS.budget * 0.5;
  }
  if (criteria.turnover_status) {
    weightUsed += WEIGHTS.turnover_status;
    if ((listing.turnover_status || "").toLowerCase() === criteria.turnover_status.toLowerCase()) {
      score += WEIGHTS.turnover_status;
    }
  }
  if (criteria.financing) {
    weightUsed += WEIGHTS.financing;
    if ((listing.financing || "").toLowerCase().includes(criteria.financing.toLowerCase())) {
      score += WEIGHTS.financing;
    }
  }

  return weightUsed > 0 ? score / weightUsed : 0;
}

function filterAndRank(listings, criteria, limit = 3) {
  return listings
    .filter((l) => l.availability === "available")
    .map((listing) => ({ listing, score: scoreListing(listing, criteria) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.listing);
}

module.exports = { extractCriteria, scoreListing, filterAndRank };
