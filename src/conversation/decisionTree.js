/**
 * Decision Tree Conversation Engine
 * -------------------------------------------------
 * States: idle -> collecting_criteria -> showing_results ->
 * awaiting_date -> awaiting_time -> awaiting_contact -> confirmed
 *
 * "restart"/"reset" is intercepted globally from any state (see
 * handleMessage) and wipes the session back to idle.
 */

const { classifyIntent } = require("../nlp/keywordMatcher");
const { extractCriteria, filterAndRank } = require("../nlp/propertyFilter");
const { getAllListings } = require("../data/listings");
const { pick } = require("../data/responses");
const { getSmallTalkReply } = require("../services/llm");
const { createViewingEvent, deleteViewingEvent } = require("../services/googleCalendar");
const {
  parseDateFromText,
  parseTimeFromText,
  buildDateObject,
  isDateBookable,
  getAvailableTimeSlots,
  findNearestAvailableDate,
  formatDateLabel
} = require("../utils/calendar");
const { toDateKey, markBooked, unbook } = require("../utils/blockedDates");
const { logInteraction } = require("../utils/logger");

// Used ONLY for greeting/chit-chat/unmatched messages — see llm.js.
// Falls back to a static varied phrasing if the LLM is unavailable,
// disabled, or fails, so the bot always works even with zero LLM
// dependency.
async function naturalOrStatic(rawMessage, fallbackKey, contextHint) {
  const llmReply = await getSmallTalkReply(rawMessage, contextHint);
  return llmReply || pick(fallbackKey);
}

// Built from the live listings data (properties.csv) instead of a
// hardcoded list, so new cities in the sheet are picked up for free.
function getKnownLocations() {
  return [...new Set(getAllListings().map((l) => l.location))];
}

function formatPeso(amount) {
  return `₱${amount.toLocaleString("en-PH")}`;
}

function describeListing(listing, index) {
  const typeLabel = listing.type.replace(/_/g, " ");
  return (
    `${index + 1}. ${listing.title || typeLabel.toUpperCase()}\n` +
    `   ${typeLabel.toUpperCase()} — ${listing.location}` +
    (listing.subdivision ? `, ${listing.subdivision}` : "") +
    `\n   Price: ${formatPeso(listing.price)}` +
    (listing.bedrooms ? ` | ${listing.bedrooms}BR/${listing.bathrooms}BA` : "") +
    (listing.floor_area ? ` | ${listing.floor_area}sqm floor` : "") +
    (listing.lot_area ? ` | ${listing.lot_area}sqm lot` : "") +
    (listing.turnover_status ? `\n   Status: ${listing.turnover_status}` : "") +
    (listing.financing ? ` | Financing: ${listing.financing}` : "") +
    `\n   Photos: ${listing.facebookPostUrl}`
  );
}

// --- Top-level entry point (wraps the real logic with system logging) ---
async function handleMessage(session, rawMessage, senderId = "local-test-user") {
  const stateBefore = session.state;
  const { intent, matches } = classifyIntent(rawMessage);

  const reply = await routeMessage(session, rawMessage, intent);

  logInteraction({
    senderId,
    message: rawMessage,
    intent,
    matchType: matches?.[0]?.matchType,
    stateBefore,
    stateAfter: session.state,
    reply
  });

  return reply;
}

async function routeMessage(session, rawMessage, intent) {
  if (intent === "restart") {
    session.state = "idle";
    session.criteria = {};
    session.viewing = {};
    session.lastListings = [];
    return pick("restart");
  }
  if (intent === "cancel_booking") {
    return handleCancelBooking(session);
  }
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
  // If they just finished booking a viewing, give the LLM a heads-up
  // so it doesn't reset to "what are you looking for" on casual
  // replies like "ok" or "thanks" — only consumed once.
  const justBooked = session.justBooked;
  if (justBooked) session.justBooked = false;

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

  const contextHint = justBooked
    ? "The buyer just finished booking a property viewing a moment ago. Respond naturally to whatever they just said — don't repeat an offer to search for properties unless they're clearly asking for that."
    : undefined;

  return naturalOrStatic(rawMessage, "fallback", contextHint);
}

const SEARCH_INTENTS = ["property_inquiry", "schedule_viewing", "location", "budget", "property_type"];

async function handleCollectingCriteria(session, rawMessage, intent) {
  const newCriteria = extractCriteria(rawMessage, getKnownLocations());
  session.criteria = { ...session.criteria, ...newCriteria };

  const { type, location, budget } = session.criteria;

  if (!type && !location && !budget) {
    // They clearly signaled they want to search (e.g. "looking for one")
    // but gave no specifics — ask directly instead of letting the LLM
    // improvise a misleading "pulling up options" reply.
    if (SEARCH_INTENTS.includes(intent)) return pick("askType");
    return naturalOrStatic(rawMessage, "fallback");
  }
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
      session.viewing.propertyLabel = chosen.title || chosen.id;
      session.viewing.propertyLocation = chosen.location;
      session.state = "awaiting_date";

      return (
        `${pick("confirmViewing")} ${session.viewing.propertyLabel} (${chosen.location}).\n\n` +
        `What date would you like to visit, and morning or afternoon? (e.g. "September 20 morning")`
      );
    }
  }

  if (intent === "schedule_viewing") {
    return "Sure! Which listing number would you like to view? (1, 2, or 3)";
  }

  return "I didn't quite get that. Reply with the listing number to schedule a viewing, or say \"search again\" to look for something else.";
}

const AFFIRMATIVE = /^(yes|yep|yup|sure|ok|okay|oo|sige|opo)\b/i;

function suggestAlternative(session, fromDate, reason) {
  const nearest = findNearestAvailableDate(fromDate);
  session.state = "awaiting_date";

  if (!nearest) {
    session.viewing.suggestedDate = undefined;
    session.viewing.suggestedLabel = undefined;
    return `Sorry, ${reason} I couldn't find another open date nearby either. Could you try a different date?`;
  }

  session.viewing.suggestedDate = nearest.date;
  session.viewing.suggestedLabel = nearest.label;
  return `Sorry, ${reason} The closest available date is ${nearest.label} — should I book that, or give me another date?`;
}

function handleAwaitingDate(session, rawMessage) {
  const lower = rawMessage.trim().toLowerCase();

  let dateObj;
  let label;

  if (AFFIRMATIVE.test(lower) && session.viewing.suggestedDate) {
    dateObj = session.viewing.suggestedDate;
    label = session.viewing.suggestedLabel;
  } else {
    const parsed = parseDateFromText(rawMessage);
    if (!parsed) {
      return `Sorry, I couldn't catch the date. Could you give it like "September 20" or "9/20"?`;
    }

    const candidate = buildDateObject(parsed);
    if (!isDateBookable(candidate)) {
      const reason = candidate.getDay() === 0
        ? `we're closed Sundays, so ${formatDateLabel(candidate)} won't work.`
        : `${formatDateLabel(candidate)} isn't available.`;
      return suggestAlternative(session, candidate, reason);
    }

    dateObj = candidate;
    label = formatDateLabel(candidate);
  }

  session.viewing.suggestedDate = undefined;
  session.viewing.suggestedLabel = undefined;
  session.viewing.date = label;
  session.viewing.dateObj = dateObj;

  const openSlots = getAvailableTimeSlots(dateObj);
  const timeGuess = parseTimeFromText(rawMessage);

  if (openSlots.length === 0) {
    return suggestAlternative(session, new Date(dateObj.getTime() + 86400000), `${label} is fully booked.`);
  }

  if (timeGuess && openSlots.includes(timeGuess)) {
    session.viewing.time = timeGuess;
    session.state = "awaiting_contact";
    return `Got it — ${label}, ${timeGuess}. Could you share a contact number so our agent can confirm the appointment?`;
  }

  if (timeGuess && !openSlots.includes(timeGuess)) {
    session.state = "awaiting_time";
    return `${timeGuess} is already taken on ${label}. Would ${openSlots.join(" or ")} work instead?`;
  }

  session.state = "awaiting_time";
  return `Got it — ${label}. Morning or afternoon?`;
}

function handleAwaitingTime(session, rawMessage) {
  const openSlots = getAvailableTimeSlots(session.viewing.dateObj);

  if (openSlots.length === 0) {
    return suggestAlternative(session, new Date(session.viewing.dateObj.getTime() + 86400000), `${session.viewing.date} just got fully booked.`);
  }

  const timeGuess = parseTimeFromText(rawMessage);
  if (timeGuess) {
    if (!openSlots.includes(timeGuess)) {
      return `${timeGuess} isn't available on ${session.viewing.date}. Would ${openSlots.join(" or ")} work instead?`;
    }
    session.viewing.time = timeGuess;
    session.state = "awaiting_contact";
    return "Perfect. Lastly, could you share a contact number so our agent can confirm the appointment?";
  }

  // Not a time — they may be giving a different date instead (e.g.
  // after being told their preferred slot is taken). Re-run date
  // handling so this isn't a dead end.
  if (parseDateFromText(rawMessage)) {
    return handleAwaitingDate(session, rawMessage);
  }

  return `Please let me know — morning or afternoon? Or give me a different date if you'd like.`;
}

function looksLikeContact(text) {
  const digits = text.replace(/\D/g, "");
  return digits.length >= 7; // loose phone-number heuristic
}

async function handleAwaitingContact(session, rawMessage) {
  if (!looksLikeContact(rawMessage)) {
    return `That doesn't look like a valid contact number — could you share your mobile number (e.g. 09XXXXXXXXX)?`;
  }

  session.viewing.contact = rawMessage.trim();

  // Mark this slot as taken so it disappears for other buyers and
  // shows up on the agent's /admin calendar as booked.
  const dateKey = toDateKey(session.viewing.dateObj);
  markBooked(dateKey, session.viewing.time);

  // Best-effort: push to Google Calendar if configured. Never blocks
  // the confirmation — if it's not set up or fails, the viewing is
  // still recorded in the chat + system log.
  const calendarResult = await createViewingEvent({
    propertyLabel: session.viewing.propertyLabel,
    location: session.viewing.propertyLocation,
    dateObj: session.viewing.dateObj,
    timeLabel: session.viewing.time,
    contact: session.viewing.contact
  });

  const summary =
    `✅ Viewing request recorded!\n\n` +
    `Property: ${session.viewing.propertyLabel} (${session.viewing.propertyId})\n` +
    `Date: ${session.viewing.date}\n` +
    `Time: ${session.viewing.time}\n` +
    `Contact: ${session.viewing.contact}\n\n` +
    (calendarResult
      ? `Added to the agent's calendar: ${calendarResult.htmlLink}\n\n`
      : "") +
    `Our agent will reach out shortly to confirm. Thank you! ` +
    `(Say "cancel my booking" anytime if your plans change.)`;

  // Remembered so a later "cancel my booking" in THIS conversation
  // knows exactly what to undo.
  session.lastBooking = {
    propertyLabel: session.viewing.propertyLabel,
    dateLabel: session.viewing.date,
    dateKey,
    time: session.viewing.time,
    eventId: calendarResult?.eventId
  };

  session.state = "idle";
  session.criteria = {};
  session.viewing = {};
  session.justBooked = true;

  return summary;
}

async function handleCancelBooking(session) {
  if (!session.lastBooking) {
    return "I don't see an active booking in this conversation to cancel. If you already have an appointment, please contact our agent directly to cancel it.";
  }

  const { propertyLabel, dateLabel, dateKey, time, eventId } = session.lastBooking;
  unbook(dateKey, time);
  if (eventId) await deleteViewingEvent(eventId);

  session.lastBooking = null;

  return `Your viewing for ${propertyLabel} on ${dateLabel} (${time}) has been cancelled. Let me know if you'd like to schedule another one.`;
}

module.exports = { handleMessage };
