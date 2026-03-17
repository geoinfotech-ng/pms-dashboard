const Config = {
  GOOGLE_SHEET_FUEL_URL:
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZkXp7HUOKoKUAkjl5tV14AYmf6-a4KimPacSbgonglGhUctuG_95W9FudhqujIoAfgLZf8CN1MmB2/pub?gid=1916161667&single=true&output=csv',

  NIGERIA_GEOJSON_URL:
    'data/nigeria-states.geojson',

  REFINERIES_GEOJSON: 'data/refineries.geojson',

  MAP_CENTER: [9.05, 7.49],
  MAP_ZOOM: 6,
  TILE_URL: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  TILE_ATTR: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',

  CHOROPLETH: ['#d4edda','#b5dfca','#fce588','#f7c948','#f09142','#e8583e','#c0392b','#7b241c'],

  // National average PMS price series — NBS PMS Price Watch monthly reports + documented subsidised-era price
  PRICE_HISTORY: [
    { label: 'Jan 2022', price: 165,   note: 'Subsidised pump price — NBS-recorded throughout 2022' },
    { label: 'May 2023', price: 185,   note: 'Final subsidised price at pump before removal' },
    { label: 'Jun 2023', price: 502,   note: 'Subsidy removed 29 May 2023 — immediate price shock' },
    { label: 'Sep 2023', price: 617,   note: 'NBS Sep 2023 — naira devaluation adds further pressure' },
    { label: 'Dec 2023', price: 706,   note: 'NBS Dec 2023 — continued import cost pass-through' },
    { label: 'Jun 2024', price: 881,   note: 'NBS Jun 2024 — sustained FX and import cost pressure' },
    { label: 'Dec 2024', price: 1189,  note: 'NBS Dec 2024 peak — NNPC exits Dangote sole-offtaker Oct 2024' },
    { label: 'Dec 2025', price: 1049,  note: 'NBS Dec 2025 — first annual decline; Dangote supply effect' },
    { label: 'Jan 2026', price: 1035,  note: 'NBS Jan 2026 — current dataset for this dashboard' },
  ],

  resolveStateName(geoName) {
    if (!geoName) return null;
    const k = geoName.toLowerCase().trim();
    return this._ALIASES[k] || geoName.trim();
  },
  _ALIASES: {
    'federal capital territory': 'Abuja',
    'abuja federal capital territory': 'Abuja',
    'fct': 'Abuja',
    'nassarawa': 'Nasarawa'
  },

  // Fact-checked events with sources
  EVENTS: [
    { date: '29 May 2023', title: 'Petrol Subsidy Removed', detail: 'President Bola Tinubu declares "the fuel subsidy is gone" during his inauguration speech. PMS prices jump from approximately ₦185 to ₦500 per litre overnight. The subsidy had cost Nigeria over ₦4 trillion in 2022 alone, sustaining an artificially low pump price for decades.', source: 'Inaugural Address; NBS', impact: 'critical' },
    { date: '14 Jun 2023', title: 'Naira Exchange Rate Unified', detail: 'The Central Bank of Nigeria collapses multiple exchange rate windows into a single Investors and Exporters (I&E) window. The naira immediately weakens from ₦460/USD to over ₦750/USD. Since Nigeria imports the bulk of its refined petroleum, the FX devaluation directly raises the landing cost of PMS, compounding post-subsidy price pressure.', source: 'CBN Policy Statement', impact: 'critical' },
    { date: 'Sep 2023', title: 'PMS National Average Reaches ₦617/Litre', detail: 'The NBS PMS Price Watch for September 2023 records a national average of ₦617/litre, up from ₦500 in June. The increase is driven by naira depreciation, global crude price rises, and redistribution of import cost burden to consumers. Northern states record prices above ₦650/litre due to longer haulage distances.', source: 'NBS PMS Price Watch Sep 2023', impact: 'high' },
    { date: '22 Jan 2024', title: 'Dangote Refinery Begins Diesel & Jet Fuel Output', detail: 'The 650,000 bpd Dangote Petroleum Refinery in Lekki, Lagos commences production of automotive gas oil (diesel) and aviation fuel (Jet A1) following crude deliveries in December 2023. PMS (petrol) production from the refinery is not yet online at this stage.', source: 'Dangote Industries; Reuters; BBC', impact: 'high' },
    { date: '3 Sep 2024', title: 'Dangote Produces First Domestic PMS', detail: 'The Dangote Refinery commences petrol (PMS) production — marking Nigeria\'s first domestically refined petrol in approximately 28 years. NNPC begins loading trucks from the refinery on 15 September 2024. The event is expected to gradually reduce dependence on imported PMS and over time exert downward pressure on pump prices.', source: 'Dangote Industries; NNPC; Vanguard', impact: 'critical' },
    { date: '7 Oct 2024', title: 'NNPC Exits as Sole Dangote Offtaker', detail: 'NNPC ends its exclusive purchase arrangement with Dangote Refinery, having been buying PMS at ₦898.78/litre and reselling to marketers at ₦765.99/litre — absorbing a hidden subsidy of approximately ₦133/litre. Once NNPC withdraws, marketers must buy at full cost price, causing another jump at the pump.', source: 'Premium Times; BBC Pidgin; NNPC', impact: 'high' },
    { date: 'Apr 2025', title: 'Dangote Cuts Ex-Depot Price to ₦835/Litre', detail: 'Dangote Refinery reduces its ex-depot PMS loading price to ₦835/litre in successive cuts during April 2025, responding to naira appreciation and crude cost improvements. Retail prices in Lagos fall to around ₦890/litre, providing relief to pump consumers for the first time since the October 2024 NNPC exit.', source: 'Channels TV; Nairametrics', impact: 'medium' },
    { date: 'Sep 2025', title: 'Dangote Refinery Strike Threatens Supply', detail: 'The Dangote Refinery dismisses approximately 800 workers it accuses of sabotage. The Petroleum and Natural Gas Senior Staff Association of Nigeria (PENGASSAN) responds with a protest strike, briefly threatening nationwide PMS supply. The Federal Government intervenes to mediate, and supply disruption is limited.', source: 'AP News; PENGASSAN; Vanguard', impact: 'high' },
    { date: '26 Oct 2025', title: 'Dangote Announces Expansion to 1.4m bpd', detail: 'Aliko Dangote announces plans to expand the Dangote Refinery from 650,000 bpd to 1.4 million bpd, which would make it the largest single refinery in the world. The Federal Government pledges support for the expansion. Full completion is expected to further reduce PMS import dependence and supply-driven price pressures.', source: 'Bloomberg; Financial Times; Street Journal', impact: 'medium' },
    { date: 'Dec 2025', title: 'NBS Records First Annual PMS Price Decline', detail: 'The National Bureau of Statistics reports the national average PMS price fell to ₦1,048.63/litre in December 2025, an 11.81% year-on-year decline from ₦1,189.12 in December 2024. This is the first significant annual price drop since the May 2023 subsidy removal, attributed to Dangote Refinery output, reduced import volume, and some naira stabilisation.', source: 'NBS PMS Price Watch Dec 2025', impact: 'high' },
    { date: 'Jan 2026', title: 'NBS January 2026 PMS Price Watch Published', detail: 'The National Bureau of Statistics releases the PMS Price Watch for January 2026 — the data underpinning this dashboard. The report covers all 36 states and the FCT, recording state-level pump prices collected during the survey period. It forms the official reference base for the rankings, zone averages, and price classifications shown in this report.', source: 'NBS PMS Price Watch Jan 2026', impact: 'medium' },
    { date: 'Feb 2026', title: 'US-Iran Military Escalation Lifts Brent and Freight Costs', detail: 'Escalation between US and Iranian forces in the Gulf raises war-risk insurance and tanker freight premiums on Middle East routes. Even with rising domestic refining, Nigeria still relies on imported components and market-linked pricing, so higher global benchmark and shipping costs pass through to PMS ex-depot and retail prices.', source: 'Reuters; S&P Global; IEA Oil Market Reports', impact: 'high' },
    { date: 'Mar 2026', title: 'Naira Faces Fresh Pressure from Oil-Import Risk Sentiment', detail: 'The US-Iran conflict shock drives renewed FX demand and risk aversion across frontier markets. In Nigeria, added pressure on the naira increases the local-currency cost of petroleum imports and logistics, narrowing gains from earlier price moderation and raising volatility in state pump prices.', source: 'CBN Market Data; FMDQ; IMF Regional Updates', impact: 'high' },
    { date: 'Mar 2026', title: 'Nigeria Expands Supply Buffer Measures Amid Gulf Disruption Fears', detail: 'Nigerian downstream regulators and major marketers increase stock-cover planning and supply monitoring to reduce the risk of local shortages linked to potential Gulf shipping disruption. The response improves availability resilience but also adds inventory financing costs that can keep pump prices elevated in the short term.', source: 'NMDPRA Statements; Major Marketers Briefings; BusinessDay', impact: 'medium' }
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
