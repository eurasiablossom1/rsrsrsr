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
 * If ANTHROPIC_API_KEY is not set, this silently returns null and the
 * bot falls back to the static varied phrasings in responses.js — the
 * chatbot works fully rule-based with zero LLM dependency either way.
 */

const axios = require("axios");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-4-5-20251001";

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
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const res = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: MODEL,
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }]
      },
      {
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        timeout: 6000
      }
    );

    const textBlock = res.data?.content?.find((b) => b.type === "text");
    return textBlock?.text?.trim() || null;
  } catch (err) {
    console.error("[llm] small-talk call failed:", err.response?.data || err.message);
    return null;
  }
}

module.exports = { getSmallTalkReply };
