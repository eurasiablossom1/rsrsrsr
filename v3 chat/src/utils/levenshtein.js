/**
 * Levenshtein Distance
 * -------------------------------------------------
 * Counts the minimum number of single-character edits
 * (insertions, deletions, substitutions) needed to turn
 * one string into another. Powers "typo tolerance" in the
 * keyword matcher: a user who types "condominum" instead of
 * "condominium" should still match the intended keyword.
 */

function levenshtein(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();

  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
  let currRow = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,
        prevRow[j] + 1,
        prevRow[j - 1] + cost
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[n];
}

/**
 * Returns true if `word` is "close enough" to `keyword` to be
 * considered a typo of it. Allowed distance scales with word length.
 */
function isFuzzyMatch(word, keyword) {
  word = word.toLowerCase();
  keyword = keyword.toLowerCase();

  if (word === keyword) return true;
  if (keyword.length <= 3) return false;

  const distance = levenshtein(word, keyword);

  let threshold;
  if (keyword.length <= 5) threshold = 1;
  else if (keyword.length <= 9) threshold = 2;
  else threshold = 3;

  return distance <= threshold;
}

module.exports = { levenshtein, isFuzzyMatch };
