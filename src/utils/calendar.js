/**
 * Simple Viewing Calendar
 * -------------------------------------------------
 * No external calendar service — generates the next available
 * viewing dates (skips Sundays + agent-blocked dates) and offers
 * Morning/Afternoon as the two viewing slots (minus whichever the
 * agent blocked for that date). Buyer picks by number, not free
 * text. Fully deterministic, matching the rule-based design.
 */

const { isDateBlocked, isSlotBlocked } = require("./blockedDates");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const ALL_TIME_SLOTS = ["Morning", "Afternoon"];

/** Returns the next `count` available dates (skips Sundays + agent-blocked full days), starting tomorrow. */
function getAvailableDates(count = 6) {
  const dates = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1); // start tomorrow

  let daysChecked = 0;
  while (dates.length < count && daysChecked < 90) {
    daysChecked++;
    if (cursor.getDay() !== 0 && !isDateBlocked(cursor)) {
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

/** Morning/Afternoon slots still open for a given date. */
function getAvailableTimeSlots(dateObj) {
  return ALL_TIME_SLOTS.filter((t) => !isSlotBlocked(dateObj, t));
}

function formatTimeOptions(dateObj) {
  const slots = getAvailableTimeSlots(dateObj);
  if (slots.length === 0) return "(No slots left that day — please pick a different date.)";
  return slots.map((t, i) => `${i + 1}. ${t}`).join("\n");
}

function parseDateSelection(input, dates) {
  const match = input.trim().match(/\b([1-9])\b/);
  if (!match) return null;
  const idx = parseInt(match[1], 10) - 1;
  return dates[idx] || null;
}

function parseTimeSelection(input, dateObj) {
  const match = input.trim().match(/\b([1-9])\b/);
  if (!match) return null;
  const idx = parseInt(match[1], 10) - 1;
  const slots = getAvailableTimeSlots(dateObj);
  return slots[idx] || null;
}

module.exports = {
  getAvailableDates,
  formatDateOptions,
  formatTimeOptions,
  getAvailableTimeSlots,
  parseDateSelection,
  parseTimeSelection,
  ALL_TIME_SLOTS
};
