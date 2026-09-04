/**
 * System Log
 * -------------------------------------------------
 * Appends one JSON line per message handled: timestamp, user id,
 * raw message, detected intent + match type (exact/normalized/fuzzy),
 * conversation state before/after, and the bot's reply. Meant for
 * the thesis's structured observation / accuracy evaluation (Chapter 3)
 * — you can tally intent-detection accuracy, review misclassified
 * messages, or eyeball full conversation flow after a test session.
 *
 * Writes to logs/chat-log.jsonl (created automatically). Never
 * throws — logging failures shouldn't break the chatbot.
 */

const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "chat-log.jsonl");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * @param {Object} entry
 * @param {string} entry.senderId
 * @param {string} entry.message       raw user message
 * @param {string} entry.intent        classified intent
 * @param {string} [entry.matchType]   'exact' | 'normalized' | 'fuzzy' | undefined
 * @param {string} entry.stateBefore
 * @param {string} entry.stateAfter
 * @param {string} entry.reply         bot's reply text
 */
function logInteraction(entry) {
  try {
    ensureLogDir();
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch (err) {
    console.error("[logger] failed to write log:", err.message);
  }
}

/** Reads back all logged interactions (for a quick accuracy tally/export). */
function readLog() {
  try {
    ensureLogDir();
    if (!fs.existsSync(LOG_FILE)) return [];
    return fs
      .readFileSync(LOG_FILE, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch (err) {
    console.error("[logger] failed to read log:", err.message);
    return [];
  }
}

module.exports = { logInteraction, readLog, LOG_FILE };
