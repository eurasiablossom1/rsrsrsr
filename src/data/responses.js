/**
 * Response Variations
 * -------------------------------------------------
 * Still 100% rule-based/deterministic in terms of WHICH reply is
 * triggered — but each trigger has a few natural phrasings to pick
 * from at random, so the conversation doesn't feel like it's reading
 * off a script. This is what makes the bot "sound" more human without
 * introducing any unpredictable AI-generated text.
 */

const RESPONSES = {
  greeting: [
    "Hi there! Welcome 🏡 I can help you look for a property or schedule a viewing. What are you looking for — house and lot, condo, townhouse, or lot only?",
    "Hello! 👋 Happy to help you find a place. Just tell me the property type, your budget, and where you'd like to look.",
    "Hey! Kumusta? Let's find you a property — what type, budget, and location are you thinking of?"
  ],

  askType: [
    "Got it. What type of property are you looking for — house and lot, condo, townhouse, or lot only?",
    "Okay! Are you after a house and lot, a condo unit, a townhouse, or just a lot?",
    "Noted. House and lot, condo, townhouse, or lot only — which one fits what you need?"
  ],

  askLocation: [
    "Which area or city are you interested in?",
    "Got it — saan mo gustong lugar? (Which location?)",
    "And what location are you considering?"
  ],

  askBudget: [
    "Understood. What's your approximate budget?",
    "Okay, magkano po ang budget mo?",
    "Got it — what price range are you working with?"
  ],

  noResults: [
    "Sorry, wala akong nahanap na tugma for that right now. Want to try a different budget, location, or type?",
    "Hmm, no exact matches at the moment. Should we adjust the budget or location a bit?",
    "I couldn't find a match for that combination. Want to try again with different criteria?"
  ],

  confirmViewing: [
    "Great choice! Let's set up your viewing.",
    "Perfect, let's get that scheduled.",
    "Nice pick! Let's lock in a viewing time."
  ],

  thanks: [
    "You're welcome! Let me know if you'd like to see more properties or book another viewing. 😊",
    "No problem! I'm here anytime you want to browse more listings.",
    "Walang anuman! Just message me again if you need anything else."
  ],

  restart: [
    "No problem, starting fresh! 🔄 What type of property are you looking for — house and lot, condo, townhouse, or lot only?",
    "Sige, let's restart! What property type, budget, and location are you looking for?",
    "Reset done ✅ Tell me the property type, budget, and location you'd like to search."
  ],

  fallback: [
    "Hmm, I didn't quite get that. You can ask about available properties (e.g. \"condo sa Bacoor, budget 3M\") or say \"schedule a viewing.\"",
    "Sorry, di ko masyadong nakuha yun 🙂 Try telling me the property type, budget, and location you're looking for.",
    "I'm not sure I understood. Try something like \"house and lot sa Imus, 3.5M budget.\""
  ]
};

function pick(key) {
  const options = RESPONSES[key] || [];
  if (options.length === 0) return "";
  return options[Math.floor(Math.random() * options.length)];
}

module.exports = { pick };
