/**
 * Agent Admin Page — block/unblock viewing dates & time slots
 * -------------------------------------------------
 * GET /admin?key=YOUR_KEY  -> shows the next 21 days, click to
 * toggle a full-day block or an individual time slot block.
 *
 * Protected by ADMIN_KEY env var. Set it in Render > Environment,
 * e.g. ADMIN_KEY=agent2026
 *
 * In-memory (see blockedDates.js) — resets on redeploy. Bookmark
 * this URL; the agent doesn't need a Google account or any setup.
 */

const express = require("express");
const router = express.Router();
const {
  toDateKey,
  isDateBlocked,
  toggleFullDay,
  toggleSlot,
  getBlockedSlotsForDate
} = require("../utils/blockedDates");
const { ALL_TIME_SLOTS } = require("../utils/calendar");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function renderPage(key, days) {
  const rows = days
    .map((d) => {
      const key2 = toDateKey(d);
      const fullyBlocked = isDateBlocked(d);
      const blockedSlots = getBlockedSlotsForDate(key2);

      const dayLabel = `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
      const dayToggleUrl = `/admin?key=${encodeURIComponent(key)}&toggleDay=${key2}`;

      const slotButtons = ALL_TIME_SLOTS.map((t) => {
        const isBlocked = fullyBlocked || blockedSlots.has(t);
        const url = `/admin?key=${encodeURIComponent(key)}&toggleSlot=${key2}|${encodeURIComponent(t)}`;
        const style = isBlocked
          ? "background:#e5484d;color:#fff;"
          : "background:#e9ebee;color:#050505;";
        return `<a href="${url}" style="display:inline-block;padding:6px 10px;margin:2px;border-radius:6px;text-decoration:none;font-size:13px;${style}">${t}</a>`;
      }).join("");

      return `
        <tr style="border-bottom:1px solid #e4e6eb;">
          <td style="padding:10px 8px; white-space:nowrap;">
            <a href="${dayToggleUrl}" style="display:inline-block;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;${fullyBlocked ? "background:#e5484d;color:#fff;" : "background:#31a24c;color:#fff;"}">
              ${dayLabel}
            </a>
          </td>
          <td style="padding:10px 8px;">${slotButtons}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Viewing Availability — Admin</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f0f2f5; margin:0; padding:20px; }
  h1 { font-size:18px; }
  p.legend { font-size:13px; color:#65676b; }
  table { border-collapse: collapse; width:100%; max-width:700px; background:#fff; border-radius:8px; overflow:hidden; }
</style></head>
<body>
  <h1>Viewing Availability</h1>
  <p class="legend">Click a date to block/unblock the whole day (red = blocked). Click a time slot to block/unblock just that slot.</p>
  <table>${rows}</table>
</body></html>`;
}

router.get("/", (req, res) => {
  const key = req.query.key;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden — missing or wrong ?key=");
  }

  if (req.query.toggleDay) {
    toggleFullDay(req.query.toggleDay);
    return res.redirect(`/admin?key=${encodeURIComponent(key)}`);
  }
  if (req.query.toggleSlot) {
    const [dateKey, timeLabel] = req.query.toggleSlot.split("|");
    toggleSlot(dateKey, decodeURIComponent(timeLabel));
    return res.redirect(`/admin?key=${encodeURIComponent(key)}`);
  }

  const days = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  for (let i = 0; i < 21; i++) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderPage(key, days));
});

module.exports = router;
