/**
 * Property Listings "Database"
 * -------------------------------------------------
 * Stand-in for a real DB query. Swap `getAllListings()` for a real
 * query when you connect live listings from the agent. Each listing
 * includes a facebookPostUrl so buyers get photos via Messenger's
 * automatic link preview.
 */

const listings = [
  {
    id: "L001",
    type: "condominium",
    location: "Bacoor, Cavite",
    price: 2500000,
    floor_area: 28,
    bedrooms: 1,
    bathrooms: 1,
    availability: "available",
    facebookPostUrl: "https://facebook.com/yourpage/posts/L001"
  },
  {
    id: "L002",
    type: "house_and_lot",
    location: "Dasmarinas, Cavite",
    price: 4800000,
    lot_area: 90,
    floor_area: 65,
    bedrooms: 3,
    bathrooms: 2,
    availability: "available",
    facebookPostUrl: "https://facebook.com/yourpage/posts/L002"
  },
  {
    id: "L003",
    type: "house_and_lot",
    location: "Imus, Cavite",
    price: 3200000,
    lot_area: 60,
    floor_area: 45,
    bedrooms: 2,
    bathrooms: 1,
    availability: "available",
    facebookPostUrl: "https://facebook.com/yourpage/posts/L003"
  },
  {
    id: "L004",
    type: "lot_only",
    location: "Bacoor, Cavite",
    price: 1800000,
    lot_area: 100,
    availability: "available",
    facebookPostUrl: "https://facebook.com/yourpage/posts/L004"
  },
  {
    id: "L005",
    type: "condominium",
    location: "Las Pinas",
    price: 3600000,
    floor_area: 32,
    bedrooms: 1,
    bathrooms: 1,
    availability: "reserved",
    facebookPostUrl: "https://facebook.com/yourpage/posts/L005"
  },
  {
    id: "L006",
    type: "house_and_lot",
    location: "Bacoor, Cavite",
    price: 5200000,
    lot_area: 120,
    floor_area: 80,
    bedrooms: 4,
    bathrooms: 3,
    availability: "available",
    facebookPostUrl: "https://facebook.com/yourpage/posts/L006"
  }
];

function getAllListings() {
  return listings;
}

module.exports = { getAllListings };
