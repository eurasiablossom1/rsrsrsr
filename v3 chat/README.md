# Rule-Based Chatbot for Real Estate Buyer Inquiry and Property Viewing

## Hybrid architecture (optional LLM layer)
`src/services/llm.js` adds a small, tightly-scoped LLM call used
**only** for greetings and chit-chat/fallback replies — never for
property matching, pricing, availability, or scheduling. Those stay
100% hardcoded rules exactly as before, so your paper's core claim
(deterministic, predictable, no hallucinated property data) still
holds. If `ANTHROPIC_API_KEY` is unset, the bot silently falls back
to the static varied phrasings — it works fully rule-based either
way. To enable it, add `ANTHROPIC_API_KEY` in Render's Environment
tab (get one at console.anthropic.com).

## What's new in this version
- **Sounds more human**: varied reply phrasing (`src/data/responses.js`)
  instead of one fixed line per prompt.
- **Broader English/Tagalog + typo coverage** without a huge keyword
  list: `src/utils/textNormalize.js` strips common suffixes/affixes
  ("looking"→"look", "gustong"→"gusto") and collapses repeated letters
  ("kumustaaa"→"kumusta") *before* matching, so a handful of root
  keywords cover many real phrasings. Levenshtein fuzzy matching
  still catches genuine typos on top of that.
- **Facebook post links**: each listing now includes a
  `facebookPostUrl` so buyers see a photo preview in Messenger.
- Still fully rule-based/deterministic — no external AI model, no
  hallucination risk — matching your paper's theoretical framework.

## Quick start (local test, no Facebook needed)
```bash
npm install
npm run test:chat
```
Try: `kumustaaa`, `gustong hanapin condominum sa bacor budget 3milion`, `1`, a date, a time, a number.

## Deploy so it's always online (GitHub + Render)

1. **Push to GitHub** — create a repo, push this folder. `.gitignore`
   already excludes `.env` and `node_modules`.
2. **Sign up at [render.com](https://render.com)** and connect your GitHub account.
3. **New > Web Service** → pick your repo. Build command: `npm install`. Start command: `npm start`.
4. **Get your Page Access Token first** (if you don't have it yet):
   - developers.facebook.com → My Apps → Create App
   - Add the **Messenger** product
   - Messenger > Settings > Access Tokens → Add your Page → Generate Token
5. **In Render, go to Environment** and add:
   - `PAGE_ACCESS_TOKEN` = the token from step 4
   - `VERIFY_TOKEN` = any secret string you make up
6. **Deploy.** Render gives you a permanent URL like `https://yourapp.onrender.com`.
7. **Register the webhook**: Meta App Dashboard > Messenger > Webhooks
   → Callback URL: `https://yourapp.onrender.com/webhook`, Verify
   Token: same as step 5, subscribe to `messages`.
8. **Test on your Facebook Page** — works from any device, no laptop needed.

Note: Render's free tier sleeps after 15 min idle; first message after
that takes ~30s to wake up. Message the Page a few minutes before a
live demo to warm it up.

## File map
```
server.js                  Express entrypoint
test-chat.js                local terminal test harness
src/routes/webhook.js       FB webhook verify + receive
src/services/messenger.js   FB Send API client
src/conversation/decisionTree.js   conversation state machine
src/session/sessionStore.js  per-user state (in-memory)
src/nlp/keywordMatcher.js    intent matching (normalized + fuzzy)
src/nlp/propertyFilter.js    criteria extraction + ranking
src/utils/levenshtein.js     typo distance
src/utils/textNormalize.js   word-form normalization (EN + Tagalog)
src/data/keywords.js         root keywords per intent
src/data/listings.js         sample property data
src/data/responses.js        varied reply phrasings
```
