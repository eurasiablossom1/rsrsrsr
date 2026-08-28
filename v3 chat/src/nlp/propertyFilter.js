/**
 * Filtering & Ranking Algorithm
 * -------------------------------------------------
 * Multi-criteria filtering/ranking (Xu et al., 2022): buyer criteria
 * (budget, location, type) compared against listings, each listing
 * scored by weighted relevance, top matches returned as a shortlist.
 */

const { isFuzzyMatch } = require("../utils/levenshtein");

const WEIGHTS = { type: 0.4, location: 0.35, budget: 0.25 };

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
  else if (/house|bahay/.test(lower)) criteria.type = "house_and_lot";
  else if (/lot only|vacant lot|raw land/.test(lower)) criteria.type = "lot_only";

  const tokens = lower.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const loc of knownLocations) {
    const locLower = loc.toLowerCase();
    if (lower.includes(locLower)) {
      criteria.location = loc;
      break;
    }
    const locWord = locLower.split(",")[0].trim();
    if (!locWord.includes(" ") && tokens.some((t) => isFuzzyMatch(t, locWord))) {
      criteria.location = loc;
      break;
    }
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
    if (listing.location.toLowerCase().includes(criteria.location.toLowerCase().split(",")[0])) {
      score += WEIGHTS.location;
    }
  }
  if (criteria.budget) {
    weightUsed += WEIGHTS.budget;
    if (listing.price <= criteria.budget) score += WEIGHTS.budget;
    else if (listing.price <= criteria.budget * 1.15) score += WEIGHTS.budget * 0.5;
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
