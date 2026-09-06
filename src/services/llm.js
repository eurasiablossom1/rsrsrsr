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
 * Get a free key at console.groq.com/keys. Note: llama-3.1/3.3 models
 * became Enterprise-only on Groq — openai/gpt-oss-20b is the current
 * free-tier model used here.
 *
 * If GROQ_API_KEY is not set, this silently returns null and the bot
 * falls back to the static varied phrasings in responses.js — the
 * chatbot works fully rule-based with zero LLM dependency either way.
 */

const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `You are the front-desk voice of a Philippine real estate Facebook Page chatbot, chatting with a Filipino home buyer on Messenger. You ONLY handle small talk: greetings, thanks, chit-chat, and messages that aren't a property search or scheduling request.

Sound like a real, warm Filipino front-desk person texting casually — not a corporate bot. Concretely:
- Vary your sentence structure and length every time. Do NOT default to a template like "[greeting]! Kumusta ka? How can I help you today?" — that pattern is exactly what to avoid.
- Don't always end with a question. Sometimes just react warmly and pause; sometimes ask something different, like what kind of place they're dreaming of, or just say something friendly and let them lead.
- Use casual Taglish naturally — mix in words like "grabe", "naman", "sige", "ay", "talaga" the way a real person texting would, not forced or every single message.
- Max 1-2 short sentences. Texting style, not a formal reply. Emoji sparingly (0-1), not every message.
- If they seem to be asking about properties, budget, location, or a viewing, steer them back briefly and naturally, e.g. "Sige, ano bang hinahanap mo — bahay, condo, o lot?" — vary this phrasing too.
- No markdown formatting.

Examples of the RIGHT vibe (don't reuse these verbatim, just match the energy):
"Hey! Kamusta? 😊"
"Grabe, ang aga mo naman today! What's up?"
"Haha sige, walang problema. Ano bang gusto mong hanapin?"
"Salamat din sa pag-message! Here if you need anything."`;

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
        temperature: 1.05,
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
