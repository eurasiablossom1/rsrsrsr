/**
 * Agent Admin Page — real calendar grid, block/unblock dates & slots
 * -------------------------------------------------
 * GET /admin?key=YOUR_KEY              -> current month
 * GET /admin?key=YOUR_KEY&month=2026-10 -> specific month
 *
 * Click a date number to block/unblock the whole day. Click AM/PM
 * inside a cell to block/unblock just that half of the day.
 *
 * Protected by ADMIN_KEY env var. In-memory (see blockedDates.js) —
 * resets on redeploy.
 */

const express = require("express");
const router = express.Router();
const {
  toDateKey,
  isDateBlocked,
  toggleFullDay,
  toggleSlot,
  getBlockedSlotsForDate,
  isBooked
} = require("../utils/blockedDates");
const { ALL_TIME_SLOTS } = require("../utils/calendar");

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseMonthParam(monthStr) {
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthParam(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function buildCell(dateObj, key, isCurrentMonth, isPast) {
  if (!isCurrentMonth) {
    return `<div class="cell empty"></div>`;
  }

  const dateKey = toDateKey(dateObj);
  const fullyBlocked = isDateBlocked(dateObj);
  const blockedSlots = getBlockedSlotsForDate(dateKey);
  const dayNum = dateObj.getDate();

  if (isPast) {
    return `<div class="cell past"><div class="daynum">${dayNum}</div></div>`;
  }

  const dayToggleUrl = `/admin?key=${encodeURIComponent(key)}&month=${monthParam(dateObj.getFullYear(), dateObj.getMonth())}&toggleDay=${dateKey}`;

  const slotButtons = ALL_TIME_SLOTS.map((t) => {
    const booked = isBooked(dateKey, t);
    const agentBlocked = fullyBlocked || blockedSlots.has(t);
    const shortLabel = t === "Morning" ? "AM" : "PM";

    if (booked) {
      // Buyer already booked this slot — shown for visibility only,
      // not click-toggleable (a real booking shouldn't be un-done here).
      return `<span class="slotbtn booked" title="Booked by a buyer">${shortLabel}</span>`;
    }

    const url = `/admin?key=${encodeURIComponent(key)}&month=${monthParam(dateObj.getFullYear(), dateObj.getMonth())}&toggleSlot=${dateKey}|${encodeURIComponent(t)}`;
    return `<a href="${url}" class="slotbtn ${agentBlocked ? "blocked" : "open"}">${shortLabel}</a>`;
  }).join("");

  return `
    <div class="cell ${fullyBlocked ? "fullyblocked" : ""}">
      <a href="${dayToggleUrl}" class="daynum-link">${dayNum}</a>
      <div class="slots">${slotButtons}</div>
    </div>`;
}

function renderPage(key, year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(buildCell(null, key, false, false));
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const isPast = dateObj < today;
    cells.push(buildCell(dateObj, key, true, isPast));
  }
  while (cells.length % 7 !== 0) cells.push(buildCell(null, key, false, false));

  const prevMonth = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const nextMonth = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const prevUrl = `/admin?key=${encodeURIComponent(key)}&month=${monthParam(prevMonth.y, prevMonth.m)}`;
  const nextUrl = `/admin?key=${encodeURIComponent(key)}&month=${monthParam(nextMonth.y, nextMonth.m)}`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Viewing Availability — Admin</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f0f2f5; margin:0; padding:16px; }
  .wrap { max-width: 480px; margin: 0 auto; }
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .header h1 { font-size:17px; margin:0; }
  .header a { text-decoration:none; color:#1877f2; font-size:20px; padding:4px 12px; border-radius:6px; }
  .header a:hover { background:#e7f0fd; }
  p.legend { font-size:12.5px; color:#65676b; margin:0 0 12px; }
  .grid { display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; background:#fff; padding:8px; border-radius:10px; }
  .daylabel { text-align:center; font-size:11px; font-weight:600; color:#65676b; padding:4px 0; }
  .cell { border-radius:8px; padding:4px; min-height:56px; display:flex; flex-direction:column; align-items:center; background:#f7f8fa; }
  .cell.empty { background:transparent; }
  .cell.past { background:#f0f0f0; opacity:0.4; }
  .cell.fullyblocked { background:#fde2e2; }
  .daynum-link { font-size:13px; font-weight:600; color:#050505; text-decoration:none; padding:2px 6px; border-radius:5px; }
  .daynum-link:hover { background:#e4e6eb; }
  .cell.fullyblocked .daynum-link { color:#e5484d; }
  .cell.past .daynum { font-size:13px; color:#8a8d91; padding:2px 6px; }
  .slots { display:flex; gap:2px; margin-top:3px; }
  .slotbtn { font-size:10px; font-weight:600; padding:2px 5px; border-radius:4px; text-decoration:none; }
  .slotbtn.open { background:#e9ebee; color:#050505; }
  .slotbtn.blocked { background:#e5484d; color:#fff; }
  .slotbtn.booked { background:#1877f2; color:#fff; cursor:default; }
</style></head>
<body>
  <div class="wrap">
    <div class="header">
      <a href="${prevUrl}">&larr;</a>
      <h1>${MONTH_NAMES[month]} ${year}</h1>
      <a href="${nextUrl}">&rarr;</a>
    </div>
    <p class="legend">Click a date number to block/unblock the whole day. Click AM/PM to block just that slot. Red = you blocked it. Blue = a buyer already booked it.</p>
    <div class="grid">
      ${DAY_HEADERS.map((d) => `<div class="daylabel">${d}</div>`).join("")}
      ${cells.join("")}
    </div>
  </div>
</body></html>`;
}

router.get("/", (req, res) => {
  const key = req.query.key;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden — missing or wrong ?key=");
  }

  const { year, month } = parseMonthParam(req.query.month);

  if (req.query.toggleDay) {
    toggleFullDay(req.query.toggleDay);
    return res.redirect(`/admin?key=${encodeURIComponent(key)}&month=${monthParam(year, month)}`);
  }
  if (req.query.toggleSlot) {
    const [dateKey, timeLabel] = req.query.toggleSlot.split("|");
    toggleSlot(dateKey, decodeURIComponent(timeLabel));
    return res.redirect(`/admin?key=${encodeURIComponent(key)}&month=${monthParam(year, month)}`);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderPage(key, year, month));
});

module.exports = router;
