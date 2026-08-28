const express = require("express");
const router = express.Router();

const { getSession } = require("../session/sessionStore");
const { handleMessage } = require("../conversation/decisionTree");
const { sendTextMessage } = require("../services/messenger");

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "dev-verify-token";

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[webhook] Verified successfully.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/", async (req, res) => {
  const body = req.body;
  if (body.object !== "page") return res.sendStatus(404);

  res.status(200).send("EVENT_RECEIVED");

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id;
      const messageText = event.message?.text;
      if (!senderId || !messageText) continue;

      const session = getSession(senderId);
      const reply = await handleMessage(session, messageText);
      await sendTextMessage(senderId, reply);
    }
  }
});

module.exports = router;
