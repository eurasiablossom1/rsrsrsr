require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const webhookRouter = require("./src/routes/webhook");

const app = express();
app.use(bodyParser.json());

// Health check — also what Render pings to confirm the service is up
app.get("/", (req, res) => {
  res.send("Rule-Based Real Estate Chatbot is running.");
});

app.use("/webhook", webhookRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Webhook URL (local): http://localhost:${PORT}/webhook`);
});
