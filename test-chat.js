const readline = require("readline");
const { getSession } = require("./src/session/sessionStore");
const { handleMessage } = require("./src/conversation/decisionTree");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const senderId = "local-test-user";
const session = getSession(senderId);

console.log("Real Estate Chatbot — local test mode. Type 'exit' to quit.\n");
console.log("Bot: Hi! Try Taglish + typos, e.g. 'kumusta', 'condominum sa bacor budget 3milion'.");
console.log("     Say 'restart' anytime to reset the session. Logs are saved to logs/chat-log.jsonl.\n");

rl.setPrompt("You: ");
rl.prompt();

rl.on("line", async (line) => {
  const input = line.trim();
  if (input.toLowerCase() === "exit") { rl.close(); return; }

  const reply = await handleMessage(session, input, senderId);
  console.log(`Bot: ${reply}\n`);
  rl.prompt();
});

rl.on("close", () => {
  console.log("\nSession ended.");
  process.exit(0);
});
