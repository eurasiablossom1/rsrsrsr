/**
 * Session Store
 * -------------------------------------------------
 * Tracks each Facebook user's conversation state + collected
 * criteria. In-memory (resets on server restart) — swap for
 * Redis/DB in production for persistence across deploys.
 */

const sessions = new Map();

function getSession(senderId) {
  if (!sessions.has(senderId)) {
    sessions.set(senderId, {
      state: "idle",
      criteria: {},
      viewing: {},
      lastListings: []
    });
  }
  return sessions.get(senderId);
}

function resetSession(senderId) {
  sessions.set(senderId, { state: "idle", criteria: {}, viewing: {}, lastListings: [] });
}

module.exports = { getSession, resetSession };
