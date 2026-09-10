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

const blockedFullDays = new Set(); // "YYYY-MM-DD"
const blockedSlots = new Map(); // "YYYY-MM-DD" -> Set of "3:00 PM"

function toDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDateBlocked(dateObj) {
  return blockedFullDays.has(toDateKey(dateObj));
}

function isSlotBlocked(dateObj, timeLabel) {
  const key = toDateKey(dateObj);
  return blockedFullDays.has(key) || (blockedSlots.get(key)?.has(timeLabel) ?? false);
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
  blockedFullDays
};
