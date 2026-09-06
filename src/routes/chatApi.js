/**
 * Web Chat API (for testing without Facebook Messenger)
 * -------------------------------------------------
 * POST /api/chat  { sessionId, message } -> { reply }
 * Reuses the exact same session store + decision tree as the
 * Messenger webhook, so behavior is identical — just a different
 * transport. Useful for demos/defense when Messenger isn't reliable.
 */

const express = require("express");
const router = express.Router();

const { getSession } = require("../session/sessionStore");
const { handleMessage } = require("../conversation/decisionTree");

router.post("/", async (req, res) => {
  const { sessionId, message } = req.body || {};

  if (!sessionId || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  const session = getSession(`web:${sessionId}`);
  const reply = await handleMessage(session, message, `web:${sessionId}`);

  res.json({ reply });
});

module.exports = router;
