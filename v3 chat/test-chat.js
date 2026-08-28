const readline = require("readline");
const { getSession } = require("./src/session/sessionStore");
const { handleMessage } = require("./src/conversation/decisionTree");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const session = getSession("local-test-user");

console.log("Real Estate Chatbot — local test mode. Type 'exit' to quit.\n");
console.log("Bot: Hi! Try Taglish + typos, e.g. 'kumusta', 'condominum sa bacor budget 3milion'.\n");

rl.setPrompt("You: ");
rl.prompt();

rl.on("line", async (line) => {
  const input = line.trim();
  if (input.toLowerCase() === "exit") { rl.close(); return; }

  const reply = await handleMessage(session, input);
  console.log(`Bot: ${reply}\n`);
  rl.prompt();
});

rl.on("close", () => {
  console.log("\nSession ended.");
  process.exit(0);
});
