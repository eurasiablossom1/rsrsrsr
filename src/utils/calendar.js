/**
 * Viewing Date/Time Parsing
 * -------------------------------------------------
 * No external calendar service, no numbered picker — the buyer just
 * types a date (and optionally morning/afternoon) in plain text, e.g.
 * "September 20 morning", "9/20 pm", "Sept 20". If that date/slot
 * isn't bookable (Sunday, in the past, or agent-blocked), we find and
 * suggest the closest actually-available date instead. Deterministic:
 * no LLM involved in any of this, just parsing + rule checks.
 */

const { isDateBlocked, isSlotBlocked } = require("./blockedDates");
const { isFuzzyMatch } = require("./levenshtein");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const ALL_TIME_SLOTS = ["Morning", "Afternoon"];

const MONTH_MAP = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sept: 8, sep: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11
};
const MONTH_NAMES_PATTERN = Object.keys(MONTH_MAP).sort((a, b) => b.length - a.length).join("|");

function formatDateLabel(dateObj) {
  return `${DAY_NAMES[dateObj.getDay()]}, ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getDate()}`;
}

/** Extracts {month, day, year?} from free text, or null if no date found. */
function parseDateFromText(text) {
  const lower = text.toLowerCase();

  // "September 20[, 2026]" / "Sept 20th" / "sep. 20"
  let m = lower.match(new RegExp(`\\b(${MONTH_NAMES_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`, "i"));
  if (m) {
    return { month: MONTH_MAP[m[1]], day: parseInt(m[2], 10), year: m[3] ? parseInt(m[3], 10) : null };
  }

  // "20 September[, 2026]"
  m = lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES_PATTERN})\\.?(?:,?\\s*(\\d{4}))?`, "i"));
  if (m) {
    return { month: MONTH_MAP[m[2]], day: parseInt(m[1], 10), year: m[3] ? parseInt(m[3], 10) : null };
  }

  // "9/20" or "9-20" or "9/20/2026"
  m = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (m) {
    const month = parseInt(m[1], 10) - 1;
    const day = parseInt(m[2], 10);
    let year = m[3] ? parseInt(m[3], 10) : null;
    if (year !== null && year < 100) year += 2000;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) return { month, day, year };
  }

  return null;
}

/** Extracts "Morning" or "Afternoon" from free text (typo-tolerant), or null. */
function parseTimeFromText(text) {
  const lower = text.toLowerCase();

  // am/pm are too short to fuzzy-match safely, so check these literally first.
  if (/\bam\b|\ba\.m\.?\b/.test(lower)) return "Morning";
  if (/\bpm\b|\bp\.m\.?\b/.test(lower)) return "Afternoon";

  const tokens = lower.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (isFuzzyMatch(t, "morning") || isFuzzyMatch(t, "umaga")) return "Morning";
    if (isFuzzyMatch(t, "afternoon") || isFuzzyMatch(t, "hapon")) return "Afternoon";
  }
  return null;
}

/** Builds a midnight Date from {month, day, year?}. Rolls to next year if year omitted and the date already passed. */
function buildDateObject({ month, day, year }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const y = year || today.getFullYear();
  let d = new Date(y, month, day);
  d.setHours(0, 0, 0, 0);

  if (!year && d < today) {
    d = new Date(y + 1, month, day);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

/** Whether a date can be booked at all (ignores specific AM/PM slot availability). */
function isDateBookable(dateObj) {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateObj < tomorrow) return false;
  if (dateObj.getDay() === 0) return false; // closed Sundays
  if (isDateBlocked(dateObj)) return false;
  return true;
}

/** Morning/Afternoon slots still open for a date (empty array if fully booked). */
function getAvailableTimeSlots(dateObj) {
  return ALL_TIME_SLOTS.filter((t) => !isSlotBlocked(dateObj, t));
}

/** Finds the nearest bookable date on/after `fromDate` (or tomorrow, whichever is later). */
function findNearestAvailableDate(fromDate) {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const cursor = new Date(Math.max(fromDate.getTime(), tomorrow.getTime()));
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 90; i++) {
    if (isDateBookable(cursor)) {
      return { date: new Date(cursor), label: formatDateLabel(cursor) };
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

module.exports = {
  parseDateFromText,
  parseTimeFromText,
  buildDateObject,
  isDateBookable,
  getAvailableTimeSlots,
  findNearestAvailableDate,
  formatDateLabel,
  ALL_TIME_SLOTS
};
