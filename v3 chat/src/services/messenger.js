const axios = require("axios");

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GRAPH_API_URL = "https://graph.facebook.com/v19.0/me/messages";

async function sendTextMessage(recipientId, text) {
  if (!PAGE_ACCESS_TOKEN) {
    console.warn("[messenger] PAGE_ACCESS_TOKEN not set — reply would have been:\n", text);
    return;
  }

  try {
    await axios.post(
      GRAPH_API_URL,
      { recipient: { id: recipientId }, message: { text } },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch (err) {
    console.error("[messenger] Failed to send message:", err.response?.data || err.message);
  }
}

module.exports = { sendTextMessage };
