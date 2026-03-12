const Config = {
  GOOGLE_SHEET_FUEL_URL:
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZkXp7HUOKoKUAkjl5tV14AYmf6-a4KimPacSbgonglGhUctuG_95W9FudhqujIoAfgLZf8CN1MmB2/pub?gid=1916161667&single=true&output=csv',

  NIGERIA_GEOJSON_URL:
    'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM1/geoBoundaries-NGA-ADM1_simplified.geojson',

  REFINERIES_GEOJSON: 'data/refineries.geojson',

  MAP_CENTER: [9.05, 7.49],
  MAP_ZOOM: 6,
  TILE_URL: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  TILE_ATTR: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',

  CHOROPLETH: ['#d4edda','#b5dfca','#fce588','#f7c948','#f09142','#e8583e','#c0392b','#7b241c'],

  resolveStateName(geoName) {
    if (!geoName) return null;
    const k = geoName.toLowerCase().trim();
    return this._ALIASES[k] || geoName.trim();
  },
  _ALIASES: {
    'federal capital territory': 'Abuja',
    'fct': 'Abuja',
    'nassarawa': 'Nasarawa'
  },

  // Fact-checked events with sources
  EVENTS: [
    { date: '29 May 2023', title: 'Petrol Subsidy Removed', detail: 'President Bola Tinubu declares "the fuel subsidy is gone" during his inauguration speech. PMS prices jump from approximately ₦185 to ₦500 per litre by evening. The subsidy had cost Nigeria over ₦4 trillion in 2022.', source: 'Inaugural Address; NBS', impact: 'critical' },
    { date: '14 Jun 2023', title: 'Naira Exchange Rate Unified', detail: 'The Central Bank of Nigeria collapses multiple exchange rate windows into a single Investors and Exporters (I&E) window. The naira moves from the official rate of ₦460/USD to over ₦750/USD, sharply increasing the cost of imported fuel.', source: 'CBN Policy Statement', impact: 'critical' },
    { date: 'Sep 2023', title: 'Petrol Hits ₦617/Litre', detail: 'Average national PMS price reaches ₦617 per litre according to NBS, driven by exchange rate depreciation and global crude price increases. Northern states experience prices above ₦650.', source: 'NBS PMS Price Watch Sep 2023', impact: 'high' },
    { date: '22 Jan 2024', title: 'Dangote Refinery Starts Production', detail: 'Dangote Petroleum Refinery in Lekki, Lagos begins production of diesel and aviation fuel after receiving its first crude oil delivery on 12 December 2023. PMS production is not yet online.', source: 'Dangote Industries; Reuters', impact: 'high' },
    { date: '3 Sep 2024', title: 'Dangote Produces First PMS', detail: 'The 650,000 bpd Dangote Refinery commences petrol (PMS) production for the first time — Nigeria\'s first domestically refined petrol in 28 years. NNPC begins truck loading on 15 September.', source: 'Dangote Industries; NNPC; Vanguard', impact: 'critical' },
    { date: 'Oct 2024', title: 'NNPC Ends Sole Offtaker Role', detail: 'NNPC ends its exclusive purchase agreement with Dangote Refinery, allowing other marketers to buy directly. This effectively ends the hidden subsidy NNPC had been absorbing (approximately ₦133/litre), causing another price increase.', source: 'NNPC; Wikipedia/Dangote Refinery', impact: 'high' },
    { date: 'Apr 2025', title: 'Dangote Cuts Ex-Depot Price', detail: 'Dangote Refinery reduces ex-depot PMS price to ₦835/litre, its second cut within a week. Petrol retails at ₦890 in Lagos and similar levels in Abuja, offering some price relief.', source: 'Channels TV; Nairametrics', impact: 'medium' },
    { date: 'Dec 2025', title: 'National Average Drops 11.8%', detail: 'NBS reports the national average PMS price fell to ₦1,048.63, an 11.81% year-on-year decrease from December 2024 (₦1,189.12). This marks the first significant annual price decline since subsidy removal.', source: 'NBS PMS Price Watch Dec 2025', impact: 'high' }
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
