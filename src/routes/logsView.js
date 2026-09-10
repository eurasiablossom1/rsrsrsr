/**
 * Log Viewer (for thesis transcripts — no shell access needed)
 * -------------------------------------------------
 * GET /logs?key=YOUR_KEY        -> readable transcript grouped by sender
 * GET /logs?key=YOUR_KEY&raw=1  -> raw JSONL (for archiving/appendix)
 *
 * Protected by LOG_ACCESS_KEY env var so randoms can't read your logs.
 * Set it in Render > Environment, e.g. LOG_ACCESS_KEY=defense2026
 */

const express = require("express");
const router = express.Router();
const { readLog } = require("../utils/logger");

function formatTranscript(entries) {
  const bySender = {};
  for (const e of entries) {
    (bySender[e.senderId] = bySender[e.senderId] || []).push(e);
  }

  let out = "";
  for (const [senderId, msgs] of Object.entries(bySender)) {
    out += `===== Session: ${senderId} =====\n\n`;
    for (const m of msgs) {
      out += `[${m.timestamp}]\n`;
      out += `User: ${m.message}\n`;
      out += `Bot: ${m.reply}\n`;
      out += `(intent: ${m.intent}${m.matchType ? `, match: ${m.matchType}` : ""}, state: ${m.stateBefore} -> ${m.stateAfter})\n\n`;
    }
    out += "\n";
  }
  return out || "(no log entries yet)";
}

router.get("/", (req, res) => {
  const key = req.query.key;
  if (!process.env.LOG_ACCESS_KEY || key !== process.env.LOG_ACCESS_KEY) {
    return res.status(403).send("Forbidden — missing or wrong ?key=");
  }

  const entries = readLog();

  if (req.query.raw) {
    res.setHeader("Content-Type", "application/json");
    return res.send(entries.map((e) => JSON.stringify(e)).join("\n"));
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(formatTranscript(entries));
});

module.exports = router;
