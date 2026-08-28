/**
 * Keyword-Based Matching Engine
 * -------------------------------------------------
 * Implements the "Keyword-Based Matching Algorithm" from the concept
 * paper (Wahyuni et al., 2022; Ojha et al., 2024), extended with:
 *
 *  1. NORMALIZATION — user tokens and keyword roots are both run
 *     through normalizeToken() (suffix/affix stripping + repeated-
 *     letter collapsing), so one root keyword ("look") matches many
 *     real phrasings ("looking", "looked", "lookin") without needing
 *     every variant listed in keywords.js.
 *  2. FUZZY MATCHING — Levenshtein distance catches typos on top of
 *     that ("condominum" -> "condominium").
 *
 * Still fully deterministic/rule-based — no ML/LLM involved.
 */

const keywords = require("../data/keywords");
const { isFuzzyMatch } = require("../utils/levenshtein");
const { normalizeToken, normalizeMessage } = require("../utils/textNormalize");

function buildKeywordIndex() {
  const index = [];

  for (const [intent, value] of Object.entries(keywords)) {
    if (Array.isArray(value)) {
      value.forEach((phrase) => index.push({ phrase, intent }));
    } else if (typeof value === "object") {
      for (const [subIntent, phrases] of Object.entries(value)) {
        phrases.forEach((phrase) =>
          index.push({ phrase, intent: "property_type", subtype: subIntent })
        );
      }
    }
  }

  return index;
}

const KEYWORD_INDEX = buildKeywordIndex();

/**
 * Matches a raw user message against the keyword library.
 * Returns matches sorted by confidence:
 *   { intent, subtype?, phrase, matchType: 'exact' | 'normalized' | 'fuzzy' }
 */
function matchMessage(message) {
  const rawLower = message.toLowerCase();
  const normalizedTokens = normalizeMessage(message);
  const matches = [];

  for (const entry of KEYWORD_INDEX) {
    const phrase = entry.phrase.toLowerCase();

    // 1) Exact substring match — handles multi-word phrases like
    //    "house and lot" verbatim.
    if (rawLower.includes(phrase)) {
      matches.push({ ...entry, matchType: "exact" });
      continue;
    }

    if (phrase.includes(" ")) continue; // multi-word: exact-only, to avoid false positives

    const normalizedKeyword = normalizeToken(phrase);

    // 2) Normalized match — catches word-form variants ("looking" -> "look")
    if (normalizedTokens.includes(normalizedKeyword)) {
      matches.push({ ...entry, matchType: "normalized" });
      continue;
    }

    // 3) Fuzzy match on normalized tokens — catches typos on top of
    //    word-form variation.
    const fuzzyHit = normalizedTokens.some((t) => isFuzzyMatch(t, normalizedKeyword));
    if (fuzzyHit) {
      matches.push({ ...entry, matchType: "fuzzy" });
    }
  }

  const rank = { exact: 0, normalized: 1, fuzzy: 2 };
  const seen = new Set();
  return matches
    .sort((a, b) => rank[a.matchType] - rank[b.matchType])
    .filter((m) => {
      const key = `${m.intent}:${m.subtype || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function classifyIntent(message) {
  const matches = matchMessage(message);
  if (matches.length === 0) return { intent: "fallback", matches: [] };
  return { intent: matches[0].intent, matches };
}

module.exports = { matchMessage, classifyIntent };
