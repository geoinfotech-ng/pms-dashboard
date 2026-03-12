/**
 * config.js — Central configuration
 */
const Config = {

  // ── Google Sheet (live NBS data) ───────────────────────
  GOOGLE_SHEET_FUEL_URL:
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZkXp7HUOKoKUAkjl5tV14AYmf6-a4KimPacSbgonglGhUctuG_95W9FudhqujIoAfgLZf8CN1MmB2/pub?gid=1916161667&single=true&output=csv',

  GOOGLE_SHEET_BRENT_URL: '',

  // ── Alpha Vantage API ──────────────────────────────────
  ALPHA_VANTAGE_API_KEY: 'BRAI8NFGOK6E7LIW',
  ALPHA_VANTAGE_BRENT_URL() {
    return `https://www.alphavantage.co/query?function=BRENT&interval=monthly&apikey=${this.ALPHA_VANTAGE_API_KEY}`;
  },
  hasApiKey() {
    return this.ALPHA_VANTAGE_API_KEY && this.ALPHA_VANTAGE_API_KEY !== 'YOUR_API_KEY_HERE' && this.ALPHA_VANTAGE_API_KEY.length > 5;
  },

  // ── geoBoundaries ──────────────────────────────────────
  NIGERIA_GEOJSON_URL:
    'https://raw.githubusercontent.com/geoBoundaries/geoBoundariesOpen/main/releaseData/gbOpen/NGA/ADM1/geoBoundaries-NGA-ADM1_simplified.geojson',

  REFINERIES_GEOJSON: 'data/refineries.geojson',

  // ── Map ────────────────────────────────────────────────
  MAP_CENTER: [9.05, 7.49],
  MAP_ZOOM: 6,
  TILE_DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  TILE_LIGHT: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  TILE_ATTR: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',

  // ── Choropleth palette ─────────────────────────────────
  COLORS: ['#2dd4a0','#73d98e','#f6d95b','#f0a033','#e85a5a','#b91c4a'],

  // ── geoBoundaries shapeName → NBS state name ───────────
  resolveStateName(geoName) {
    if (!geoName) return null;
    const key = geoName.toLowerCase().trim();
    return this._ALIASES[key] || geoName.trim();
  },

  _ALIASES: {
    'federal capital territory': 'Abuja',
    'fct': 'Abuja',
    'abuja federal capital territory': 'Abuja',
    'nassarawa': 'Nasarawa'
  },

  // ── Refinery locations (for distance chart) ────────────
  REFINERIES_COORDS: [
    { name: 'Dangote', lat: 6.4006, lng: 3.8355 },
    { name: 'Port Harcourt', lat: 4.779, lng: 7.082 },
    { name: 'Warri', lat: 5.546, lng: 5.731 },
    { name: 'Kaduna', lat: 10.576, lng: 7.409 }
  ],

  // ── State centroids (lat, lng) for distance calc ───────
  STATE_CENTROIDS: {
    'Abia':[5.53,7.49],'Abuja':[9.06,7.49],'Adamawa':[9.33,12.40],
    'Akwa Ibom':[4.95,7.85],'Anambra':[6.21,6.94],'Bauchi':[10.31,9.84],
    'Bayelsa':[4.77,6.07],'Benue':[7.34,8.77],'Borno':[11.85,13.15],
    'Cross River':[5.87,8.53],'Delta':[5.53,5.90],'Ebonyi':[6.26,8.09],
    'Edo':[6.63,5.93],'Ekiti':[7.72,5.31],'Enugu':[6.45,7.51],
    'Gombe':[10.29,11.17],'Imo':[5.57,7.06],'Jigawa':[12.23,9.56],
    'Kaduna':[10.52,7.43],'Kano':[11.99,8.52],'Katsina':[12.99,7.60],
    'Kebbi':[12.45,4.20],'Kogi':[7.73,6.74],'Kwara':[8.97,4.54],
    'Lagos':[6.52,3.38],'Nasarawa':[8.54,8.52],'Niger':[9.93,5.90],
    'Ogun':[7.16,3.35],'Ondo':[7.10,5.05],'Osun':[7.56,4.52],
    'Oyo':[8.12,3.93],'Plateau':[9.22,9.75],'Rivers':[4.84,6.92],
    'Sokoto':[13.06,5.24],'Taraba':[7.87,10.73],'Yobe':[12.29,11.75],
    'Zamfara':[12.17,6.25]
  },

  // ── Price breakdown model (educational) ────────────────
  PRICE_BREAKDOWN: {
    crude_oil: 42,
    refining: 15,
    transport: 18,
    taxes_levies: 10,
    dealer_margin: 8,
    exchange_rate_impact: 7
  },

  // ── Timeline events ────────────────────────────────────
  EVENTS: [
    { date: '2023-05', title: 'Subsidy Removal Announced', desc: 'President Tinubu announces end of petrol subsidy on inauguration day. Prices jump from ₦185 to ₦500+ overnight.' },
    { date: '2023-06', title: 'Subsidy Officially Ends', desc: 'NNPC confirms no more subsidy payments. PMS price deregulated. Average price hits ₦525/litre.' },
    { date: '2023-09', title: 'OPEC+ Cuts Production', desc: 'Saudi Arabia and Russia extend voluntary oil output cuts. Brent crude rises above $93/barrel.' },
    { date: '2023-10', title: 'Naira Floated', desc: 'CBN allows naira to float. Exchange rate crashes from ₦460 to ₦800+/USD, increasing import costs.' },
    { date: '2024-01', title: 'Dangote Refinery Begins', desc: 'Dangote refinery starts processing crude oil. Expected to reduce Nigeria\'s import dependence.' },
    { date: '2024-09', title: 'Dangote Starts PMS', desc: 'Dangote refinery begins producing petrol (PMS). First domestic refined petrol in years.' },
    { date: '2024-10', title: 'Naira Hits ₦1700/USD', desc: 'Exchange rate deterioration continues, pushing up cost of imported refined products.' },
    { date: '2025-04', title: 'Dangote Cuts Ex-Depot Price', desc: 'Dangote reduces ex-depot PMS price to ₦835/litre, providing some relief at the pump.' }
  ]
};
