/**
 * Simple Viewing Calendar
 * -------------------------------------------------
 * No external calendar service — just generates the next available
 * viewing dates (skips Sundays) and a fixed set of time slots, and
 * lets the buyer pick by number instead of free-typing a date/time.
 * Keeps everything deterministic, matching the rule-based design.
 */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const TIME_SLOTS = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"];

/** Returns the next `count` available dates (skips Sundays), starting tomorrow. */
function getAvailableDates(count = 6) {
  const dates = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1); // start tomorrow

  while (dates.length < count) {
    if (cursor.getDay() !== 0) { // skip Sunday
      dates.push({
        date: new Date(cursor),
        label: `${DAY_NAMES[cursor.getDay()]}, ${MONTH_NAMES[cursor.getMonth()]} ${cursor.getDate()}`
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function formatDateOptions(dates) {
  return dates.map((d, i) => `${i + 1}. ${d.label}`).join("\n");
}

function formatTimeOptions() {
  return TIME_SLOTS.map((t, i) => `${i + 1}. ${t}`).join("\n");
}

/** Parses a numbered selection ("2") against a list built by getAvailableDates(). */
function parseDateSelection(input, dates) {
  const match = input.trim().match(/\b([1-9])\b/);
  if (!match) return null;
  const idx = parseInt(match[1], 10) - 1;
  return dates[idx] || null;
}

/** Parses a numbered selection ("3") against TIME_SLOTS. */
function parseTimeSelection(input) {
  const match = input.trim().match(/\b([1-5])\b/);
  if (!match) return null;
  const idx = parseInt(match[1], 10) - 1;
  return TIME_SLOTS[idx] || null;
}

module.exports = {
  getAvailableDates,
  formatDateOptions,
  formatTimeOptions,
  parseDateSelection,
  parseTimeSelection,
  TIME_SLOTS
};
