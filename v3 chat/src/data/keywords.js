/**
 * Keyword / Synonym Library
 * -------------------------------------------------
 * Each intent lists its ROOT words — normalizeToken() (see
 * utils/textNormalize.js) strips common suffixes/affixes before
 * matching, so e.g. "gusto"/"gustong"/"gusto ko" and
 * "looking"/"look"/"looked" all resolve to the same root without
 * listing every inflection here. Combined with fuzzy (typo-tolerant)
 * matching, one root keyword covers a wide range of real phrasing.
 */

module.exports = {
  greeting: [
    "hi", "hello", "hey", "kumusta", "musta", "good morning",
    "good afternoon", "good evening", "magandang umaga",
    "magandang hapon", "magandang gabi"
  ],

  property_inquiry: [
    "property", "listing", "house", "condo", "condominium", "lot",
    "townhouse", "unit", "available", "inquire", "interested",
    "bahay", "look", "hanap", "gusto", "meron", "may", "search",
    "browse", "options", "choice"
  ],

  budget: [
    "budget", "price", "cost", "magkano", "presyo", "range",
    "afford", "million", "downpayment", "bayad", "halaga"
  ],

  location: [
    "location", "area", "city", "saan", "where", "near", "malapit",
    "province", "bacoor", "cavite", "dasmarinas", "imus", "manila",
    "quezon city", "makati", "taguig", "las pinas", "paranaque"
  ],

  property_type: {
    house_and_lot: ["house and lot", "house", "single detached", "bahay"],
    condominium: ["condo", "condominium", "unit", "flat"],
    lot_only: ["lot only", "vacant lot", "raw land", "lupa"]
  },

  schedule_viewing: [
    "schedule", "viewing", "view", "visit", "tour", "appointment",
    "book", "punta", "bisita", "tingin", "check"
  ],

  agent_contact: [
    "agent", "contact", "representative", "broker", "human", "tao"
  ],

  confirm: ["yes", "yep", "sure", "confirm", "okay", "ok", "oo", "sige", "opo"],
  deny: ["no", "nope", "cancel", "not now", "hindi", "ayaw"],

  thanks: ["thanks", "thank you", "salamat"],

  goodbye: ["bye", "goodbye", "paalam"]
};
