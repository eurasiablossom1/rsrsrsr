/**
 * Decision Tree Conversation Engine
 * -------------------------------------------------
 * States: idle -> collecting_criteria -> showing_results ->
 * awaiting_date -> awaiting_time -> awaiting_contact -> confirmed
 */

const { classifyIntent } = require("../nlp/keywordMatcher");
const { extractCriteria, filterAndRank } = require("../nlp/propertyFilter");
const { getAllListings } = require("../data/listings");
const { pick } = require("../data/responses");
const { getSmallTalkReply } = require("../services/llm");

// Used ONLY for greeting/chit-chat/unmatched messages — see llm.js.
// Falls back to a static varied phrasing if the LLM is unavailable,
// disabled, or fails, so the bot always works even with zero LLM
// dependency.
async function naturalOrStatic(rawMessage, fallbackKey) {
  const llmReply = await getSmallTalkReply(rawMessage);
  return llmReply || pick(fallbackKey);
}

const KNOWN_LOCATIONS = [
  "Bacoor, Cavite", "Dasmarinas, Cavite", "Imus, Cavite",
  "Las Pinas", "Quezon City", "Makati", "Taguig", "Paranaque", "Manila"
];

function formatPeso(amount) {
  return `₱${amount.toLocaleString("en-PH")}`;
}

function describeListing(listing, index) {
  const typeLabel = listing.type.replace(/_/g, " ");
  return (
    `${index + 1}. ${typeLabel.toUpperCase()} — ${listing.location}\n` +
    `   Price: ${formatPeso(listing.price)}` +
    (listing.bedrooms ? ` | ${listing.bedrooms}BR/${listing.bathrooms}BA` : "") +
    (listing.floor_area ? ` | ${listing.floor_area}sqm floor` : "") +
    (listing.lot_area ? ` | ${listing.lot_area}sqm lot` : "") +
    `\n   Photos: ${listing.facebookPostUrl}`
  );
}

async function handleMessage(session, rawMessage) {
  const { intent } = classifyIntent(rawMessage);

  if (intent === "goodbye") {
    return "Thank you for reaching out! Message us anytime you'd like to browse listings or schedule a viewing. 🏠";
  }
  if (intent === "agent_contact") {
    return "Sure — I'll flag this conversation for one of our agents to follow up with you personally. Feel free to keep browsing with me meanwhile!";
  }
  if (intent === "thanks") {
    return pick("thanks");
  }

  switch (session.state) {
    case "idle": return handleIdle(session, rawMessage, intent);
    case "collecting_criteria": return handleCollectingCriteria(session, rawMessage, intent);
    case "showing_results": return handleShowingResults(session, rawMessage, intent);
    case "awaiting_date": return handleAwaitingDate(session, rawMessage);
    case "awaiting_time": return handleAwaitingTime(session, rawMessage);
    case "awaiting_contact": return handleAwaitingContact(session, rawMessage);
    default:
      session.state = "idle";
      return handleIdle(session, rawMessage, intent);
  }
}

async function handleIdle(session, rawMessage, intent) {
  if (intent === "greeting") {
    session.state = "collecting_criteria";
    return naturalOrStatic(rawMessage, "greeting");
  }

  if (["property_inquiry", "location", "budget", "property_type"].includes(intent)) {
    session.state = "collecting_criteria";
    return handleCollectingCriteria(session, rawMessage, intent);
  }

  if (intent === "schedule_viewing") {
    session.state = "collecting_criteria";
    return "I'd be happy to help you schedule a viewing! First, let's find the right property — what type, budget, and location are you considering?";
  }

  return naturalOrStatic(rawMessage, "fallback");
}

async function handleCollectingCriteria(session, rawMessage, intent) {
  const newCriteria = extractCriteria(rawMessage, KNOWN_LOCATIONS);
  session.criteria = { ...session.criteria, ...newCriteria };

  const { type, location, budget } = session.criteria;

  if (!type && !location && !budget) return naturalOrStatic(rawMessage, "fallback");
  if (!type) return pick("askType");
  if (!location) return pick("askLocation");
  if (!budget) return pick("askBudget");

  const results = filterAndRank(getAllListings(), session.criteria, 3);
  session.lastListings = results;

  if (results.length === 0) {
    session.state = "collecting_criteria";
    session.criteria = {};
    return pick("noResults");
  }

  session.state = "showing_results";
  const listingText = results.map(describeListing).join("\n\n");
  return (
    `Here are the top matches for you:\n\n${listingText}\n\n` +
    `Reply with the number (e.g. "1") if you'd like to schedule a viewing, ` +
    `or say "search again" to change your criteria.`
  );
}

function handleShowingResults(session, rawMessage, intent) {
  const lower = rawMessage.toLowerCase().trim();

  if (/search again|different|change/.test(lower)) {
    session.state = "collecting_criteria";
    session.criteria = {};
    return "No problem! Let's start over — what type, budget, and location are you looking for?";
  }

  const numberMatch = lower.match(/\b([1-9])\b/);
  if (numberMatch) {
    const idx = parseInt(numberMatch[1], 10) - 1;
    const chosen = session.lastListings[idx];
    if (chosen) {
      session.viewing.propertyId = chosen.id;
      session.state = "awaiting_date";
      return (
        `${pick("confirmViewing")} Listing ${chosen.id} (${chosen.location}). ` +
        `What date works best for you? (e.g. "August 15")`
      );
    }
  }

  if (intent === "schedule_viewing") {
    return "Sure! Which listing number would you like to view? (1, 2, or 3)";
  }

  return "I didn't quite get that. Reply with the listing number to schedule a viewing, or say \"search again\" to look for something else.";
}

function handleAwaitingDate(session, rawMessage) {
  session.viewing.date = rawMessage.trim();
  session.state = "awaiting_time";
  return `Got it — ${session.viewing.date}. What time would you prefer?`;
}

function handleAwaitingTime(session, rawMessage) {
  session.viewing.time = rawMessage.trim();
  session.state = "awaiting_contact";
  return "Perfect. Lastly, could you share a contact number so our agent can confirm the appointment?";
}

function handleAwaitingContact(session, rawMessage) {
  session.viewing.contact = rawMessage.trim();

  const summary =
    `✅ Viewing request recorded!\n\n` +
    `Property: ${session.viewing.propertyId}\n` +
    `Date: ${session.viewing.date}\n` +
    `Time: ${session.viewing.time}\n` +
    `Contact: ${session.viewing.contact}\n\n` +
    `Our agent will reach out shortly to confirm. Thank you!`;

  // NOTE: persist this to a DB here for agent follow-up in production.

  session.state = "idle";
  session.criteria = {};
  session.viewing = {};

  return summary;
}

module.exports = { handleMessage };
