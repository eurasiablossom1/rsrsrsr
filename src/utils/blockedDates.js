/**
 * Blocked Dates Store
 * -------------------------------------------------
 * Lets the agent mark specific dates as fully unavailable, or block
 * individual time slots on a date (e.g. already booked, on leave).
 * Buyers then never see those as options when scheduling a viewing.
 *
 * In-memory (like sessionStore.js) — resets on server restart/
 * redeploy. That's fine for this use case since it only needs to
 * hold a rolling few weeks of blocks, not permanent history.
 */

const blockedFullDays = new Set(); // "YYYY-MM-DD" — agent-blocked whole days
const blockedSlots = new Map(); // "YYYY-MM-DD" -> Set of "Morning"/"Afternoon" — agent-blocked single slots
const bookedSlots = new Map(); // "YYYY-MM-DD" -> Set of "Morning"/"Afternoon" — buyer-confirmed bookings

function toDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDateBlocked(dateObj) {
  return blockedFullDays.has(toDateKey(dateObj));
}

function isBooked(dateKey, timeLabel) {
  return bookedSlots.get(dateKey)?.has(timeLabel) ?? false;
}

/** True if a slot is unavailable for ANY reason — agent block or an existing buyer booking. */
function isSlotBlocked(dateObj, timeLabel) {
  const key = toDateKey(dateObj);
  return (
    blockedFullDays.has(key) ||
    (blockedSlots.get(key)?.has(timeLabel) ?? false) ||
    isBooked(key, timeLabel)
  );
}

/** Marks a slot as taken by a confirmed buyer booking. */
function markBooked(dateKey, timeLabel) {
  if (!bookedSlots.has(dateKey)) bookedSlots.set(dateKey, new Set());
  bookedSlots.get(dateKey).add(timeLabel);
}

/** Cancels a confirmed booking, freeing the slot back up. */
function unbook(dateKey, timeLabel) {
  bookedSlots.get(dateKey)?.delete(timeLabel);
}

function getBookedSlotsForDate(dateKey) {
  return bookedSlots.get(dateKey) || new Set();
}

function toggleFullDay(dateKey) {
  if (blockedFullDays.has(dateKey)) blockedFullDays.delete(dateKey);
  else blockedFullDays.add(dateKey);
}

function toggleSlot(dateKey, timeLabel) {
  if (!blockedSlots.has(dateKey)) blockedSlots.set(dateKey, new Set());
  const set = blockedSlots.get(dateKey);
  if (set.has(timeLabel)) set.delete(timeLabel);
  else set.add(timeLabel);
}

function getBlockedSlotsForDate(dateKey) {
  return blockedSlots.get(dateKey) || new Set();
}

module.exports = {
  toDateKey,
  isDateBlocked,
  isSlotBlocked,
  toggleFullDay,
  toggleSlot,
  getBlockedSlotsForDate,
  markBooked,
  unbook,
  isBooked,
  getBookedSlotsForDate,
  blockedFullDays
};
