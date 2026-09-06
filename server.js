require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const webhookRouter = require("./src/routes/webhook");
const chatApiRouter = require("./src/routes/chatApi");

const app = express();
app.use(bodyParser.json());

// Health check — also what Render pings to confirm the service is up
app.get("/", (req, res) => {
  res.send("Rule-Based Real Estate Chatbot is running.");
});

app.use("/webhook", webhookRouter);

// Web test chat — bypasses Facebook Messenger entirely, same bot logic.
// Visit https://yourapp.onrender.com/chat in any browser.
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/chat", chatApiRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Webhook URL (local): http://localhost:${PORT}/webhook`);
  console.log(`Web test chat (local): http://localhost:${PORT}/chat.html`);
});
