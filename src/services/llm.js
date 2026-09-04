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
 * Uses Groq's free API (OpenAI-compatible chat completions endpoint)
 * instead of a paid model — no cost for small-talk-only volume.
 * Get a free key at console.groq.com/keys.
 *
 * If GROQ_API_KEY is not set, this silently returns null and the bot
 * falls back to the static varied phrasings in responses.js — the
 * chatbot works fully rule-based with zero LLM dependency either way.
 */

const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Free-tier Groq model, good enough for short small talk.
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are the friendly front-desk voice of a Philippine real estate Facebook Page chatbot.
You ONLY handle small talk: greetings, thanks, chit-chat, and messages you can't otherwise classify.

STRICT RULES — never break these:
- NEVER state or imply specific prices, availability, addresses, unit counts, or any listing detail. That is handled by a separate rule-based property search system, not you.
- NEVER confirm or promise a viewing date, time, or agent follow-up.
- If the user seems to be asking about properties, budget, location, or scheduling a viewing, gently steer them back, e.g. "Sure! Just tell me the property type, budget, and location and I'll pull up matches for you."
- Keep replies to 1-2 short, warm sentences. Natural mix of English and Tagalog is welcome (Filipino buyers on Facebook Messenger).
- Do not use markdown formatting.`;

/**
 * Returns a short, natural small-talk reply, or null if the LLM is
 * unavailable/disabled/fails — callers must have a static fallback.
 */
async function getSmallTalkReply(userMessage) {
  if (!GROQ_API_KEY) return null;

  try {
    const res = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        max_tokens: 100,
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
        timeout: 6000
      }
    );

    const text = res.data?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.error("[llm] small-talk call failed:", err.response?.data || err.message);
    return null;
  }
}

module.exports = { getSmallTalkReply };
