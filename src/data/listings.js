/**
 * Property Listings — loaded from CSV (no hardcoding)
 * -------------------------------------------------
 * Reads src/data/properties.csv on first access and caches it in
 * memory. To update your inventory, just replace/edit that CSV
 * (export from Excel/Google Sheets as CSV) and restart the server —
 * no code changes needed.
 *
 * facebookPostUrl stays a dummy pattern (per property_id) since real
 * FB post links aren't in the sheet yet — swap in real links in the
 * CSV or here once you have them.
 */

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "properties.csv");

const TYPE_MAP = {
  "house & lot": "house_and_lot",
  "condominium": "condominium",
  "townhouse": "townhouse",
  "vacant lot": "lot_only"
};

/** Minimal RFC4180-ish CSV line splitter (handles quoted fields with commas/quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

function toNumber(val) {
  const n = parseFloat(val);
  return Number.isNaN(n) ? undefined : n;
}

function loadListings() {
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(raw);
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

  return rows.slice(1).map((r) => {
    const rawType = (r[idx.property_type] || "").trim().toLowerCase();
    return {
      id: r[idx.property_id],
      title: r[idx.title],
      type: TYPE_MAP[rawType] || rawType.replace(/\s+/g, "_"),
      location: r[idx.city],
      subdivision: r[idx.subdivision] || undefined,
      price: toNumber(r[idx.price]),
      lot_area: toNumber(r[idx.lot_area]) || undefined,
      floor_area: toNumber(r[idx.floor_area]) || undefined,
      bedrooms: toNumber(r[idx.bedrooms]) || undefined,
      bathrooms: toNumber(r[idx.bathrooms]) || undefined,
      turnover_status: r[idx.turnover_status] || undefined,
      financing: r[idx.financing] || undefined,
      availability: (r[idx.status] || "").trim().toLowerCase(), // "available" | "sold"
      facebookPostUrl: `https://facebook.com/yourpage/posts/${r[idx.property_id]}`
    };
  });
}

let _cache = null;

function getAllListings() {
  if (!_cache) _cache = loadListings();
  return _cache;
}

/** Call this if you edit properties.csv while the server is running (no restart needed). */
function reloadListings() {
  _cache = loadListings();
  return _cache;
}

module.exports = { getAllListings, reloadListings };
