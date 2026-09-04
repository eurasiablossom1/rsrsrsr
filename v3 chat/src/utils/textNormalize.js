/**
 * Text Normalizer
 * -------------------------------------------------
 * Reduces many word FORMS down to one root, so the keyword library
 * doesn't need to list every variant (e.g. "looking", "looked",
 * "look" all collapse toward "look"). Combined with the existing
 * Levenshtein fuzzy matcher, this lets the bot understand a much
 * wider range of phrasing without adding more keywords.
 *
 * Handles common English suffixes AND common Tagalog affixes/fillers,
 * plus collapses repeated letters from informal typing (e.g. "sooo"
 * -> "so", "plsss" -> "pls").
 */

const FILLER_WORDS = new Set([
  "po", "opo", "naman", "lang", "din", "rin", "nga", "kasi", "yung",
  "yun", "ung", "the", "a", "an", "is", "are", "please", "pls", "plss"
]);

// Common Tagalog verb affixes worth stripping for matching purposes
const TAGALOG_PREFIXES = ["mag", "nag", "pag", "makipag", "nakipag"];
const TAGALOG_SUFFIXES = ["han", "in", "an"];

function collapseRepeatedLetters(word) {
  // "hellooo" -> "hello", "sooo" -> "so"
  return word.replace(/(.)\1{2,}/g, "$1");
}

function stripEnglishSuffix(word) {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function stripTagalogAffixes(word) {
  for (const prefix of TAGALOG_PREFIXES) {
    if (word.length > prefix.length + 3 && word.startsWith(prefix)) {
      word = word.slice(prefix.length);
      break;
    }
  }
  for (const suffix of TAGALOG_SUFFIXES) {
    if (word.length > suffix.length + 3 && word.endsWith(suffix)) {
      word = word.slice(0, -suffix.length);
      break;
    }
  }
  return word;
}

/**
 * Normalizes a single token: lowercase, de-duplicate repeated letters,
 * strip common English/Tagalog affixes. Used before both exact and
 * fuzzy keyword matching.
 */
function normalizeToken(token) {
  let t = token.toLowerCase();
  t = collapseRepeatedLetters(t);
  t = stripEnglishSuffix(t);
  t = stripTagalogAffixes(t);
  return t;
}

/**
 * Normalizes a full message: tokenizes, drops filler words, and
 * normalizes each remaining token.
 */
function normalizeMessage(message) {
  return message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !FILLER_WORDS.has(w))
    .map(normalizeToken);
}

module.exports = { normalizeToken, normalizeMessage, collapseRepeatedLetters };
