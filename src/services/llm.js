/**
 * Small-Talk LLM Layer (OPTIONAL, hybrid architecture)
 * -------------------------------------------------
 * IMPORTANT — read this before touching the rest of the codebase:
 *
 * This is the ONLY place an LLM is used. It is called ONLY for
 * greetings and unmatched/chit-chat messages — never for property
 * search, filtering, pricing, availability, or viewing scheduling.
 * Those remain fully rule-based (keywordMatcher.js, propertyFilter.js,
 * decisionTree.js) exactly as before, so your paper's core claim
 * (predictable, deterministic, no hallucinated property data) still
 * holds. Think of this as a friendlier front-desk voice bolted onto
 * an otherwise rule-based system, not a replacement for it.
 *
 * Uses Groq's free API (OpenAI-compatible chat completions endpoint).
 * Get a free key at console.groq.com/keys. Free tier for
 * openai/gpt-oss-20b: 30 req/min, 1,000 req/day, 8,000 tokens/min,
 * 200,000 tokens/day (resets daily).
 *
 * If GROQ_API_KEY is not set, or every attempt fails, this returns
 * null and the bot falls back to the static varied phrasings in
 * responses.js — the chatbot works fully rule-based either way.
 */

const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// Kept deliberately short. The ONE rule that must never be dropped:
// never state/imply real listing details — that's the thesis's core
// "no hallucinated property data" claim. Everything else is loose on
// purpose so replies don't sound scripted.
const SYSTEM_PROMPT = `You're the casual, friendly voice of a Philippine real estate Facebook Page chatbot, chatting with a Filipino home buyer on Messenger. Reply naturally, like texting a friend — keep it short (1-2 sentences), be warm and a little playful. Never use emojis — plain text only.

Match the buyer's language: if they write in English, reply in English. If they write in Tagalog or Taglish, reply in Tagalog or Taglish. Don't default to Tagalog when they wrote in English.

The ONLY hard rule: never state, imply, or guess specific prices, availability, addresses, unit counts, or any other listing detail — a separate system handles real property matching from the actual database, and you must not invent or estimate any of that yourself. If the buyer's message includes a real preference (property type, budget, location, etc.), just acknowledge it briefly and let them know you'll pull up real matches — don't answer with any specifics yourself.

Otherwise, respond however feels natural for the conversation, and always finish your thought — never cut a sentence off.`;

// Strips emoji as a safety net in case the model adds one anyway.
function stripEmoji(text) {
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, "").trim();
}

async function callGroq(userMessage) {
  const res = await axios.post(
    GROQ_URL,
    {
      model: MODEL,
      max_tokens: 200,
      temperature: 1.0,
      top_p: 0.95,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "content-type": "application/json"
      },
      timeout: 15000
    }
  );

  const text = res.data?.choices?.[0]?.message?.content?.trim();
  return text ? stripEmoji(text) : null;
}

/**
 * Returns a short, natural small-talk reply, or null if the LLM is
 * unavailable/disabled/fails (after one retry) — callers must have a
 * static fallback.
 */
async function getSmallTalkReply(userMessage) {
  if (!GROQ_API_KEY) return null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const reply = await callGroq(userMessage);
      if (reply) return reply;
    } catch (err) {
      const isLastAttempt = attempt === 2;
      console.error(
        `[llm] small-talk call failed (attempt ${attempt}):`,
        err.response?.data || err.message
      );
      if (isLastAttempt) return null;
    }
  }
  return null;
}

module.exports = { getSmallTalkReply };
