/**
 * config.js — All data from Google Sheet only
 */
const Config = {

  GOOGLE_SHEET_FUEL_URL:
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZkXp7HUOKoKUAkjl5tV14AYmf6-a4KimPacSbgonglGhUctuG_95W9FudhqujIoAfgLZf8CN1MmB2/pub?gid=1916161667&single=true&output=csv',

  NIGERIA_GEOJSON_URL:
    'https://raw.githubusercontent.com/geoBoundaries/geoBoundariesOpen/main/releaseData/gbOpen/NGA/ADM1/geoBoundaries-NGA-ADM1_simplified.geojson',

  REFINERIES_GEOJSON: 'data/refineries.geojson',

  MAP_CENTER: [9.05, 7.49],
  MAP_ZOOM: 6,
  TILE_DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  TILE_LIGHT: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  TILE_ATTR: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',

  COLORS: ['#00c6a7','#2ee8c0','#7bea6e','#c9e445','#f7c948','#f59e42','#ef6461','#c43a5e'],

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

  EVENTS: [
    { date: 'May 2023', title: 'Fuel Subsidy Removed', desc: 'President Tinubu announces end of decades-long petrol subsidy on inauguration day. Pump prices jump from ₦185 to over ₦500 overnight, triggering nationwide price shocks.', impact: 'high' },
    { date: 'Jun 2023', title: 'Price Deregulation Begins', desc: 'NNPC confirms complete deregulation of PMS pricing. Marketers begin setting prices based on market forces. Average price reaches ₦525/litre.', impact: 'high' },
    { date: 'Sep 2023', title: 'OPEC+ Deepens Cuts', desc: 'Saudi Arabia and Russia extend voluntary production cuts. Global oil prices surge above $93/barrel, increasing import costs for Nigeria.', impact: 'medium' },
    { date: 'Oct 2023', title: 'Naira Float Shock', desc: 'Central Bank allows naira to float freely. Exchange rate crashes from ₦460 to ₦800+ per dollar, dramatically increasing the naira cost of imported fuel.', impact: 'high' },
    { date: 'Jan 2024', title: 'Dangote Refinery Opens', desc: 'Africa\'s largest refinery begins processing crude oil in Lekki, Lagos. 650,000 bpd capacity raises hopes for reduced import dependence.', impact: 'medium' },
    { date: 'Sep 2024', title: 'Dangote Produces PMS', desc: 'Dangote refinery begins producing Premium Motor Spirit (petrol) for the first time. First domestically refined PMS in years enters the market.', impact: 'high' },
    { date: 'Oct 2024', title: 'Naira Hits ₦1,700/USD', desc: 'Continued exchange rate pressure pushes naira to record lows. Cost of importing refined products increases further.', impact: 'medium' },
    { date: 'Apr 2025', title: 'Dangote Cuts Prices', desc: 'Dangote Refinery reduces ex-depot PMS price to ₦835/litre — second cut in a week. Petrol retails at ₦890 in Lagos, providing some relief.', impact: 'medium' }
  ],

  CONTACT: {
    name: 'Geoinfotech',
    address: 'Oluwalogbon House, Testing Ground Bus Stop, Obafemi Awolowo Way, Alausa, Ikeja, Lagos.',
    email1: 'mail@geoinfotech.ng',
    email2: 'contact@geoinfotech.ng',
    phone1: '+234 816 322 2177',
    phone2: '+234 901 872 4833'
  }
};
