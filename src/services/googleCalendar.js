/**
 * Google Calendar Integration (OPTIONAL)
 * -------------------------------------------------
 * Creates a real event on your agency's Google Calendar when a buyer
 * confirms a viewing — so the agent sees it show up automatically.
 *
 * Setup (one-time):
 *  1. console.cloud.google.com -> new project -> enable "Google Calendar API"
 *  2. IAM & Admin > Service Accounts > Create service account -> Keys ->
 *     Add Key -> JSON. Download it.
 *  3. Open the downloaded JSON, copy its ENTIRE content.
 *  4. In Render > Environment, add GOOGLE_SERVICE_ACCOUNT_KEY = paste
 *     that whole JSON as the value (one env var, JSON string).
 *  5. Open Google Calendar (the calendar you want appointments on) ->
 *     Settings > Share with specific people -> add the service
 *     account's email (looks like xxx@xxx.iam.gserviceaccount.com),
 *     permission: "Make changes to events".
 *  6. Copy that calendar's ID (Settings > Integrate calendar > Calendar ID
 *     — for your primary calendar this is just your Gmail address).
 *  7. In Render > Environment, add GOOGLE_CALENDAR_ID = that ID.
 *
 * If either env var is missing, this silently no-ops (returns null) —
 * viewing requests still work and get recorded in the chat + system
 * log, they just won't appear on Google Calendar.
 */

const { google } = require("googleapis");

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const SLOT_DURATION_MINUTES = 60;

let cachedAuth = null;

function getAuth() {
  if (cachedAuth) return cachedAuth;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  try {
    const credentials = JSON.parse(raw);
    cachedAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar"]
    });
    return cachedAuth;
  } catch (err) {
    console.error("[googleCalendar] invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON:", err.message);
    return null;
  }
}

/** Combines a Date (midnight, from calendar.js) with a "Morning"/"Afternoon" label. */
function combineDateAndTime(dateObj, timeLabel) {
  const hours = timeLabel === "Afternoon" ? 14 : 9; // 2:00 PM / 9:00 AM anchor times
  const combined = new Date(dateObj);
  combined.setHours(hours, 0, 0, 0);
  return combined;
}

/**
 * Creates a viewing event on Google Calendar.
 * @returns {Promise<{htmlLink: string, eventId: string}|null>} null if
 *   Calendar isn't configured or the call fails.
 */
async function createViewingEvent({ propertyLabel, location, dateObj, timeLabel, contact }) {
  if (!CALENDAR_ID) return null;
  const auth = getAuth();
  if (!auth) return null;

  try {
    const calendar = google.calendar({ version: "v3", auth });
    const start = combineDateAndTime(dateObj, timeLabel);
    const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `Property Viewing — ${propertyLabel}`,
        location,
        description: `Booked via Messenger chatbot.\nBuyer contact: ${contact}`,
        start: { dateTime: start.toISOString(), timeZone: "Asia/Manila" },
        end: { dateTime: end.toISOString(), timeZone: "Asia/Manila" }
      }
    });

    if (!res.data.htmlLink || !res.data.id) return null;
    return { htmlLink: res.data.htmlLink, eventId: res.data.id };
  } catch (err) {
    console.error("[googleCalendar] failed to create event:", err.response?.data || err.message);
    return null;
  }
}

/** Deletes a previously-created viewing event. Best-effort — never throws. */
async function deleteViewingEvent(eventId) {
  if (!CALENDAR_ID || !eventId) return;
  const auth = getAuth();
  if (!auth) return;

  try {
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
  } catch (err) {
    console.error("[googleCalendar] failed to delete event:", err.response?.data || err.message);
  }
}

module.exports = { createViewingEvent, deleteViewingEvent };
