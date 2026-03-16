const UI = (() => {
  let _el = {};
  let _boundaries = null;

  async function init() {
    _cache();
    _events();
    _loader(true);

    DashboardMap.init('map');
    const data = await FuelData.load();
    const geo = await DashboardMap.loadBoundaries();
    _boundaries = geo;
    if (geo && data.length) DashboardMap.renderChoropleth(geo);

    if (data.length) {
      renderStats();
      renderInsight();
      renderRankCards();
      populateSelects();
      Charts.zoneBar('zoneChart');
      Charts.stateChart('stateChart', data);
      renderImpact();
    }
    renderTimeline();
    _loader(false);
  }

  function _cache() {
    ['statAvg','statMin','statMax','statSpread','statDate','statCount',
     'hover','hoverName','hoverPrice','hoverRank',
     'detail','detailName','detailPrice','detailRank','detailZone','detailDate','detailVsAvg',
     'insight','topExpensive','topAffordable','zoneStrip',
    'selA','selB','selSingle','compareBtn','stateInfoBtn','singlePdfBtn','pdfBtn','timeline','stateInfo','compareInfo',
    'impactStats',
    'notifs'
    ].forEach(id => _el[id] = document.getElementById(id));
  }

  function _events() {
    _on('detailClose', 'click', () => _el.detail?.classList.remove('open'));
    _on('compareBtn', 'click', doCompare);
    _on('stateInfoBtn', 'click', doSingleState);
    _on('singlePdfBtn', 'click', doSinglePDF);
    _on('pdfBtn', 'click', doPDF);
  }

  function _on(id, ev, fn) { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); }
  function _loader(v) { const e = document.getElementById('loader'); if (e) e.style.display = v ? 'flex' : 'none'; }

  function renderStats() {
    const s = FuelData.getStats(); if (!s) return;
    _set('statAvg', `₦${s.avg.toLocaleString()}`);
    _set('statMin', `₦${Math.round(s.min).toLocaleString()}`);
    _set('statMax', `₦${Math.round(s.max).toLocaleString()}`);
    _set('statSpread', `₦${Math.round(s.spread).toLocaleString()}`);
    _set('statDate', s.date);
    _set('statCount', `${s.count} states`);
  }

  function renderInsight() {
    const s = FuelData.getStats(); if (!s || !_el.insight) return;
    const top = s.costliest[0], bot = s.cheapest[0];
    const diffVal = top.price - bot.price;
    const pct = ((diffVal / bot.price) * 100).toFixed(1);
    const fmt = v => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const zones = FuelData.getZoneAverages();
    _el.insight.innerHTML = `As of <b>${s.date}</b>, <b>${top.state}</b> has the highest PMS price at <b>₦${fmt(top.price)}/L</b>, while <b>${bot.state}</b> has the lowest at <b>₦${fmt(bot.price)}/L</b> — a gap of <b>₦${fmt(diffVal)}</b> (${pct}%). The <b>${zones[0].zone}</b> is the most expensive zone (avg ₦${zones[0].avg}/L). National average: <b>₦${s.avg}/L</b> across <b>${s.count}</b> states.`;
  }

  function renderRankCards() {
    const s = FuelData.getStats(); if (!s) return;
    const fmt = v => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (_el.topExpensive) _el.topExpensive.innerHTML = s.costliest.map((d, i) =>
      `<div class="rk-row"><span class="rk-n">${i + 1}.</span><span class="rk-s">${d.state}</span><span class="rk-p hi">₦${fmt(d.price)}</span></div>`
    ).join('');
    if (_el.topAffordable) _el.topAffordable.innerHTML = s.cheapest.map((d, i) =>
      `<div class="rk-row"><span class="rk-n">${i + 1}.</span><span class="rk-s">${d.state}</span><span class="rk-p lo">₦${fmt(d.price)}</span></div>`
    ).join('');
  }

  function showHover(name, price, rank) {
    if (!_el.hover) return;
    _el.hover.classList.add('vis');
    _set('hoverName', name);
    _set('hoverPrice', price ? `₦${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}/L` : '—');
    _set('hoverRank', rank ? `#${rank}` : '');
  }
  function hideHover() { if (_el.hover) _el.hover.classList.remove('vis'); }

  function showDetail(name, price, rank, sd, stats) {
    if (!_el.detail) return;
    _el.detail.classList.add('open');
    _set('detailName', name);
    _set('detailPrice', price ? `₦${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—');
    _set('detailRank', rank ? `${rank} of ${stats.count}` : '—');
    _set('detailZone', sd?.zone || '—');
    _set('detailDate', sd?.date || '—');
    if (_el.detailVsAvg && stats && price) {
      const d = price - stats.avg, sign = d >= 0 ? '+' : '';
      _el.detailVsAvg.innerHTML = `<span style="color:${d >= 0 ? '#c0392b' : '#27ae60'};font-weight:700">${sign}₦${Math.abs(Math.round(d))}</span> vs national average (₦${Math.round(stats.avg)})`;
    }
  }

  function populateSelects() {
    const states = FuelData.getByPrice(true).map(d => d.state);
    ['selA', 'selB', 'selSingle'].forEach((id, i) => {
      const s = _el[id]; if (!s) return;
      s.innerHTML = '<option value="">Select...</option>' + states.map(n => `<option>${n}</option>`).join('');
      if (i === 0 && states.includes('Lagos')) s.value = 'Lagos';
      if (i === 1 && states.includes('Borno')) s.value = 'Borno';
      if (i === 2 && states.includes('Abuja')) s.value = 'Abuja';
    });
  }

  function doSingleState() {
    const name = _el.selSingle?.value;
    if (!name) return notify('Select a state');
    const stats = FuelData.getStats();
    const state = FuelData.getStateData(name);
    const rank = FuelData.getRank(name);
    if (!stats || !state || !_el.stateInfo) return;

    const delta = Math.round((state.price - stats.avg) * 100) / 100;
    const sign = delta >= 0 ? '+' : '';
    _el.stateInfo.innerHTML = [
      ['Price', `₦${state.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}/L`],
      ['Rank', `${rank} of ${stats.count}`],
      ['Zone', state.zone || '—'],
      ['Vs Avg', `${sign}₦${Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 2 })}`]
    ].map(([label, value]) => `<div class="si-item"><span class="si-label">${label}</span><span class="si-value">${value}</span></div>`).join('');

    Charts.singleState('stateInfoChart', name);
  }

  function doCompare() {
    const sel = ['selA', 'selB'].map(id => _el[id]?.value).filter(Boolean);
    if (sel.length < 2) return notify('Select 2 states');
    const stats = FuelData.getStats();
    const items = sel.map(name => {
      const state = FuelData.getStateData(name);
      return state ? {
        ...state,
        rank: FuelData.getRank(name),
        delta: Math.round((state.price - stats.avg) * 100) / 100
      } : null;
    }).filter(Boolean);

    if (_el.compareInfo && stats) {
      _el.compareInfo.innerHTML = items.map(item => {
        const sign = item.delta >= 0 ? '+' : '';
        return `<div class="si-item">
          <span class="si-label">${item.state}</span>
          <span class="si-value">₦${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}/L</span>
          <span class="si-label">Rank</span>
          <span class="si-value">${item.rank} of ${stats.count}</span>
          <span class="si-label">Zone</span>
          <span class="si-value">${item.zone || '—'}</span>
          <span class="si-label">Vs Avg</span>
          <span class="si-value">${sign}₦${Math.abs(item.delta).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>`;
      }).join('');
    }

    Charts.comparison('cmpChart', sel);
    if (_el.pdfBtn) _el.pdfBtn.style.display = 'inline-block';
  }

  function formatCurrency(value) {
    return `NGN ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  function getZoneAverage(zoneName) {
    return FuelData.getZoneAverages().find(zone => zone.zone === zoneName)?.avg ?? null;
  }

  function getPriceClassification(price, stats) {
    const deltaPct = stats?.avg ? ((price - stats.avg) / stats.avg) * 100 : 0;
    if (deltaPct <= -6) return 'Very Low';
    if (deltaPct <= -2) return 'Low';
    if (deltaPct < 2) return 'Moderate';
    if (deltaPct < 6) return 'High';
    return 'Very High';
  }

  function getComparisonClassification(a, b) {
    const diffPct = Math.abs(a.price - b.price) / Math.min(a.price, b.price) * 100;
    if (diffPct < 3) return 'Narrow Differential';
    if (diffPct < 7) return 'Moderate Differential';
    return 'Wide Differential';
  }

  function getRegionalFactor(zone) {
    return {
      'South West': 'This zone benefits from access to coastal depots, the Lagos logistics corridor, the Dangote Refinery in Lekki, and proximity to import terminals at Apapa. However, urban demand pressure, port congestion, and high traffic density can sustain elevated pump prices.',
      'South South': 'The South South sits on Nigeria\'s principal oil-producing terrain, with coastal and riverine infrastructure, the Port Harcourt refinery complex, and the Warri refinery nearby. Despite upstream proximity, last-mile delivery bottlenecks, community disruptions, and uneven depot access still shape retail pricing.',
      'South East': 'This zone relies primarily on inland haulage from coastal depots via secondary road corridors. Onitsha serves as a major redistribution hub, but elevated trucking costs, depot-to-station delivery charges, and road condition variability influence pump prices across the zone.',
      'North Central': 'The North Central zone is a redistribution corridor receiving product from southern depots via the Kaduna pipeline and road transport. Prices absorb inland trucking costs, depot replenishment timing, and supply pass-through from southern entry points.',
      'North East': 'Long trucking distances from southern depots, limited pipeline infrastructure, difficult terrain on some corridors, and thin retail competition create persistent cost pressure on pump prices across this zone.',
      'North West': 'Long bulk haul distances, high transport operating costs, and regional supply balancing across high-demand corridors characterise the fuel supply environment in this zone. Cross-border leakage to neighbouring countries can also tighten domestic availability.'
    }[zone] || 'Local retail prices are influenced by distribution efficiency, depot access, road transport costs, and the broader national PMS supply environment.';
  }

  function getStateSpecificFactor(stateName) {
    const factors = {
      Lagos:      'Lagos hosts the Dangote Refinery at Lekki (650,000 bpd capacity), Apapa petroleum import terminals, and the most extensive depot infrastructure in Nigeria. Despite high demand and traffic congestion, proximity to primary supply sources keeps prices competitively positioned.',
      Ogun:       'Ogun benefits from its strategic location between Lagos and the interior, with access to depot supply from the Sagamu-Ore corridor and Lagos terminals. The state receives relatively prompt replenishment, keeping distribution costs moderate.',
      Oyo:        'Oyo\'s Ibadan is a secondary distribution hub for the South West, with access to pipeline-fed depots and Lagos-sourced supply. Road quality and urban concentration in Ibadan support relatively efficient last-mile delivery.',
      Osun:       'Osun is an inland South West state relying on road haulage from Ibadan and Lagos depots. Moderate trucking distances and fair road infrastructure mean prices are generally close to the zonal average.',
      Ondo:       'Ondo has historical ties to the petroleum sector through Okitipupa and Ilaje communities and benefits from some coastal accessibility. However, road network limitations in parts of the state can raise distribution costs.',
      Ekiti:      'Ekiti is among the more inland and hilly South West states, with no direct depot access. Product reaches Ekiti via road from Lagos or Ibadan, and limited retail competition in smaller towns can push prices above the zonal average.',
      Rivers:     'Rivers State hosts Port Harcourt, Nigeria\'s historic petroleum capital. The Port Harcourt Refinery — though operating at limited capacity — and multiple petroleum depot facilities provide supply depth. However, pipeline vandalism, community tensions, and depot operational constraints can add cost unpredictability.',
      Delta:      'Delta State is home to the Warri Refinery and Petrochemicals Company and the Escravos export terminal. Despite this oil-sector presence, the domestic retail market still absorbs distribution and handling costs, and uneven refinery utilisation means regular product import is often necessary.',
      'Cross River': 'Cross River has the Calabar port and deep-sea infrastructure, but petroleum product distribution from Calabar to upcountry communities involves significant road haulage costs. Retail prices in remote areas of the state can exceed urban benchmarks.',
      'Akwa Ibom': 'Akwa Ibom hosts the Qua Iboe terminal and ExxonMobil upstream operations. The state benefits from some local petroleum logistics infrastructure, though downstream retail prices still reflect national pricing norms with modest coastal supply advantage.',
      Bayelsa:    'Bayelsa is Nigeria\'s most riverine state with limited road connectivity. Most communities receive product via water transport or through Yenagoa by road from Port Harcourt. High last-mile distribution costs and logistical complexity are the primary price drivers.',
      Edo:        'Edo State is accessible from both Warri and Benin City depots. The state\'s position as a transitional zone between the coastal South South and the inland South East means pricing generally reflects a balance of coastal supply access and inland transport costs.',
      Anambra:    'Anambra is anchored by Onitsha, one of Nigeria\'s largest commercial hubs, which also serves as a key inland PMS redistribution centre for the South East. The availability of multiple traders in Onitsha generally supports competitive pricing, though remote parts of the state absorb extra delivery costs.',
      Imo:        'Imo State receives PMS through Owerri and the Onitsha corridor. Road infrastructure improvements in parts of the state have modestly supported distribution efficiency, but inland supply chain costs remain a factor.',
      Abia:       'Abia\'s Aba is a major commercial city with active fuel retail trade. The state has reasonable depot access from the Port Harcourt corridor and Onitsha, keeping prices broadly in line with South East averages.',
      Enugu:      'Enugu is a major urban centre in the South East but lacks direct coastal depot access. Product reaches the state via road from Port Harcourt or Onitsha, and transport cost pass-through influences retail benchmarks.',
      Ebonyi:     'Ebonyi is the most economically fragile state in the South East with limited transport infrastructure. The distance from major depots, poor road network in some areas, and low station density make Ebonyi consistently among the higher-priced South East states.',
      Abuja:      'The Federal Capital Territory benefits from active price monitoring, government proximity, and consistent depot supply from the Kaduna pipeline system. Competitive retail density between Abuja and satellite towns tends to suppress prices relative to many northern benchmarks.',
      Kogi:       'Kogi occupies a strategic gateway position at the confluence of the Niger and Benue rivers. The state receives PMS from both northern and southern supply routes via Lokoja, giving it a relative supply diversity advantage that moderates pricing.',
      Benue:      'Benue is an agricultural state with limited petroleum retail infrastructure and limited competition in remote LGAs. Road maintenance challenges and reduced tanker frequency on some routes can elevate prices above North Central averages.',
      Niger:      'Niger State\'s large landmass and dispersed population mean that many communities absorb long-distance trucking costs from Kaduna or Abuja depots. Road network quality variability and low station density in rural areas are recurring pricing factors.',
      Kwara:      'Kwara benefits from its position along the Lagos-Kano highway and access to Ilorin\'s depot-supplied retail market. The state\'s supply chain is relatively stable by North Central standards, though sub-urban and rural communities still pay transport premiums.',
      Nasarawa:   'Nasarawa sits adjacent to the FCT and benefits from Abuja-area supply overspill and the Kaduna corridor. Proximity to Abuja keeps Nasarawa prices broadly competitive, though eastern parts of the state face slightly higher delivery costs.',
      Plateau:    'Plateau State\'s high-altitude geography and Jos city\'s urban density create a dual pricing dynamic — competitive urban retail and more expensive rural supply. Road access to some plateau communities is interrupted by terrain and occasional security disruptions.',
      Kano:       'Kano is Nigeria\'s largest northern commercial city and serves as a major inland fuel redistribution hub for the North West. High retail demand, multiple active depots, and bulk buying by traders generally support stable pricing, though the distance from southern supply points sustains a structural cost premium.',
      Kaduna:     'Kaduna hosts the Kaduna Petroleum Products Depot, a major supply node for the north, and the Kaduna Refinery (currently operating at limited capacity). These facilities anchor wholesale supply for the North West and North Central zones, moderating local prices despite inland location.',
      Katsina:    'Katsina is a border state with significant cross-border trade with Niger Republic. Fuel smuggling to Niger reduces domestic availability and can create local supply tightness. Long haulage from southern depots via Kano adds to the baseline cost structure.',
      Kebbi:      'Kebbi is among the most remote states in Nigeria for fuel supply purposes, receiving product through long-haul trucking from Kano and Kaduna. Low retail density and thin competition mean that pump prices in Kebbi typically sit above neighbouring states.',
      Sokoto:     'Sokoto is at Nigeria\'s far northwestern extremity. The combination of extreme distance from southern depots, long-haul trucking costs, and limited retail competition creates one of the highest structural cost environments for PMS in the country.',
      Zamfara:    'Zamfara faces both geographic and security-related supply challenges. Some road corridors in the state are subject to banditry, which increases logistics risk premiums and can disrupt tanker schedules, contributing to price pressure above normal haulage costs.',
      Jigawa:     'Jigawa is a large, predominantly rural North West state bordering Niger Republic. Cross-border fuel leakage to Niger can reduce local availability, while long trucking routes from Kano add to distribution costs. Thin retail competition in smaller towns reinforces above-average pricing.',
      Borno:      'Borno is Nigeria\'s most geographically remote state for fuel supply, located at the far northeastern corner of the country. The combination of extreme haulage distance from southern depots, long-standing insecurity linked to Boko Haram activities in parts of the state, limited road infrastructure, and thin retail competition creates one of the structurally highest PMS cost environments in Nigeria.',
      Yobe:       'Yobe State shares Borno\'s structural supply challenges — long distance from southern depots, security constraints on some transport corridors, and low retail density. These factors result in consistently above-average pump prices relative to national benchmarks.',
      Adamawa:    'Adamawa\'s location on the far northeastern corridor, combined with challenging terrain and limited pipeline infrastructure, means that PMS arrives exclusively by road over long distances. Security considerations on some routes also increase haulage risk premiums.',
      Taraba:     'Taraba is one of Nigeria\'s least-supplied states for petroleum products, with a dispersed population across forested terrain. Limited depot access, poor road connectivity in parts of the state, and long delivery routes from southern nodes drive above-average prices.',
      Gombe:      'Gombe serves as a modest distribution hub for the lower North East but still relies heavily on road haulage from Yola or Maiduguri. The relatively small urban market limits bulk replenishment advantages, sustaining above-national-average pump prices.',
      Bauchi:     'Bauchi is an inland North East state with limited direct supply infrastructure. PMS arrives via road from Kano or Kaduna, with delivery costs reflecting both distance and road quality. Urban Bauchi prices are generally lower than remote local government areas.'
    };
    return factors[stateName] || null;
  }

  function getNationalFactorsText() {
    return 'Across Nigeria, PMS prices have been influenced by the May 2023 subsidy removal, exchange-rate pass-through after FX market unification, and the ongoing transition from import dependence toward domestic refining and depot-led distribution.';
  }

  function getInsecurityFactor(stateName, zone) {
    const byState = {
      Lagos: 'Security context: urban crime and episodic protest flashpoints can slow tanker turnaround in dense corridors, but major PMS routes are generally serviceable.',
      Ogun: 'Security context: periodic highway robbery and kidnapping alerts on some inter-state roads can raise haulage caution costs for selected routes.',
      Oyo: 'Security context: intermittent road-security incidents on Ibadan-linked corridors can affect delivery timing, especially for night movement.',
      Osun: 'Security context: localized road-security concerns occasionally disrupt movement windows, adding minor scheduling friction to PMS distribution.',
      Ondo: 'Security context: kidnapping and corridor-security alerts in parts of the state can increase route risk pricing for tanker operators.',
      Ekiti: 'Security context: occasional highway-security incidents on inland links can modestly increase logistics buffers and delivery uncertainty.',
      Rivers: 'Security context: pipeline vandalism, cult-related violence, and kidnapping risks in some corridors can disrupt product movement and raise distribution premiums.',
      Delta: 'Security context: oil infrastructure attacks and intermittent kidnapping risks in parts of the state can increase transport risk charges.',
      'Cross River': 'Security context: localized communal and border-corridor insecurity can affect reliability of long-haul deliveries to some areas.',
      'Akwa Ibom': 'Security context: mostly stable retail corridors, with occasional coastal and local security incidents that can briefly affect movement planning.',
      Bayelsa: 'Security context: riverine insecurity, piracy exposure, and infrastructure vulnerability can elevate last-mile fuel distribution risk and cost.',
      Edo: 'Security context: periodic kidnapping and highway insecurity on transit routes can increase delivery insurance and escort-related cost elements.',
      Anambra: 'Security context: separatist-related enforcement of sit-at-home orders and episodic armed attacks can disrupt station operations and intercity deliveries on affected days.',
      Imo: 'Security context: recurring sit-at-home disruptions and localized armed incidents can reduce operating hours and complicate replenishment cycles.',
      Abia: 'Security context: sit-at-home compliance pressure and sporadic attacks in parts of the state can interrupt normal fuel distribution windows.',
      Enugu: 'Security context: episodic separatist-linked disruptions and corridor incidents can increase uncertainty for scheduled PMS movement.',
      Ebonyi: 'Security context: intermittent South East security restrictions and road incidents can increase delivery lead times in some corridors.',
      Abuja: 'Security context: the FCT is comparatively controlled, though fringe-area kidnapping risks on select approach roads can still affect logistics planning.',
      Kogi: 'Security context: kidnapping and attack risks on key transit corridors can add route-variation costs to inland tanker movement.',
      Benue: 'Security context: farmer-herder and communal violence in parts of the state can disrupt road access and increase replenishment uncertainty.',
      Niger: 'Security context: banditry and kidnapping exposure on some forest and highway corridors can materially raise logistics risk premiums.',
      Kwara: 'Security context: recent escalation in armed attacks in parts of the state has increased transport-risk sensitivity for distribution planning.',
      Nasarawa: 'Security context: periodic communal clashes and kidnapping concerns on some routes can create occasional supply timing volatility.',
      Plateau: 'Security context: recurrent communal violence in parts of Plateau can affect corridor reliability and station restocking cycles.',
      Kano: 'Security context: generally stronger commercial security than nearby states, but regional spillover risk and corridor incidents can still affect haulage costs.',
      Kaduna: 'Security context: banditry and kidnapping risks on major highways can disrupt delivery schedules and increase inland transport premiums.',
      Katsina: 'Security context: armed attacks and kidnapping risk in parts of the state can tighten safe movement windows for PMS logistics.',
      Kebbi: 'Security context: insecurity in selected border and rural corridors can increase long-haul distribution risk and delivery variability.',
      Sokoto: 'Security context: cross-border and rural corridor insecurity can raise transport-risk pricing on already long-distance supply routes.',
      Zamfara: 'Security context: persistent bandit activity in parts of the state can significantly increase haulage risk pricing and route unpredictability.',
      Jigawa: 'Security context: largely better than core North West hotspots, but regional spillover and border-corridor risk can still affect supply reliability.',
      Borno: 'Security context: insurgency pressure in parts of Borno continues to affect route predictability, convoy practices, and distribution risk costs.',
      Yobe: 'Security context: insurgency-related threats on selected corridors can reduce movement flexibility and increase replenishment lead times.',
      Adamawa: 'Security context: localized insurgency and communal-security pressure in parts of Adamawa can raise last-mile distribution uncertainty.',
      Taraba: 'Security context: communal clashes and route-security incidents in parts of Taraba can materially affect delivery timing and stocking cycles.',
      Gombe: 'Security context: lower-risk than core North East hotspots, but regional insecurity spillover can still influence transport-risk assumptions.',
      Bauchi: 'Security context: mostly moderate corridor risk profile, with periodic incidents that can affect long-haul supply scheduling.'
    };

    if (byState[stateName]) return byState[stateName];
    if (zone === 'North East') return 'Security context: insurgency spillover risk in parts of the zone can influence tanker movement and restocking reliability.';
    if (zone === 'North West') return 'Security context: banditry and kidnapping exposure in parts of the zone can increase route-risk premiums.';
    if (zone === 'North Central') return 'Security context: corridor insecurity and communal incidents in some locations can affect distribution consistency.';
    if (zone === 'South East') return 'Security context: periodic sit-at-home disruptions can reduce operating hours and affect supply timing on impacted days.';
    if (zone === 'South South') return 'Security context: pipeline vandalism and localized insecurity can create periodic downstream supply interruptions.';
    return 'Security context: no persistent conflict hotspot is indicated for the selected state, but routine corridor-security risks still shape logistics planning.';
  }

  function variantIndex(seed, count) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
    return Math.abs(h) % count;
  }

  function pickVariant(seed, options) {
    return options[variantIndex(seed, options.length)];
  }

  function compactText(text, maxLen = 500) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    const clip = clean.slice(0, maxLen);
    const cut = clip.lastIndexOf(' ');
    return `${clip.slice(0, cut > 120 ? cut : maxLen).trim()}...`;
  }

  function buildSingleAnalysis(state, stats) {
    const rank = FuelData.getRank(state.state);
    const zoneAvg = getZoneAverage(state.zone);
    const delta = state.price - stats.avg;
    const zoneDelta = zoneAvg != null ? state.price - zoneAvg : null;
    const direction = delta >= 0 ? 'above' : 'below';
    const zoneDirection = zoneDelta != null && zoneDelta >= 0 ? 'above' : 'below';

    const insecurityText = getInsecurityFactor(state.state, state.zone);
    const stateSpecific = getStateSpecificFactor(state.state);

    const seed = `${state.state}-${state.zone}-${rank}-${Math.round(state.price * 10)}`;
    const opener = pickVariant(seed, [
      `In January 2026, ${state.state} is selling PMS at ${formatCurrency(state.price)}/L. It is ranked ${rank} out of ${stats.count} in Nigeria (Rank 1 means highest price).`,
      `${state.state} recorded ${formatCurrency(state.price)}/L in the January 2026 NBS report. Its national position is ${rank} of ${stats.count}, where lower rank means more expensive fuel.`,
      `The NBS January 2026 reading for ${state.state} is ${formatCurrency(state.price)}/L. That places the state at number ${rank} out of ${stats.count} in the national table.`
    ]);
    const positioning = `Compared with the national average (${formatCurrency(stats.avg)}/L), ${state.state} is ${formatCurrency(Math.abs(delta))} ${direction}.${zoneAvg != null ? ` In the ${state.zone}, it is ${formatCurrency(Math.abs(zoneDelta))} ${zoneDirection} the zonal average (${formatCurrency(zoneAvg)}/L).` : ''}`;

    const driversRaw = [
      getNationalFactorsText(),
      getRegionalFactor(state.zone),
      insecurityText,
      stateSpecific
    ].filter(Boolean).join(' ');

    const close = pickVariant(`${seed}-c`, [
      `In simple terms, ${state.state}'s pump price is shaped by two big things: the national price trend and local delivery challenges. If fuel has to travel farther, stations usually add that cost. If supply is steady and competition is stronger, prices can stay lower.`,
      `${state.state}'s result is not random. It reflects the wider national market and what happens on the ground, such as transport cost, depot access, and how often stations are restocked. These factors explain why some states stay above average for longer periods.`,
      `The interpretation is straightforward: national cost pressure sets the base, and local logistics decide the final pump price people pay. Where movement is harder or supply is less stable, prices tend to remain higher; where supply chains are smoother, prices are usually softer.`
    ]);

    return [
      `${opener} ${positioning}`,
      compactText(driversRaw, 740),
      close
    ];
  }

  function buildComparisonAnalysis(a, b, stats) {
    const diff = Math.abs(a.price - b.price);
    const higher = a.price >= b.price ? a : b;
    const lower = a.price < b.price ? a : b;
    const diffPct = (diff / lower.price) * 100;
    const rankA = FuelData.getRank(a.state);
    const rankB = FuelData.getRank(b.state);

    const insecurityA = getInsecurityFactor(a.state, a.zone);
    const insecurityB = getInsecurityFactor(b.state, b.zone);
    const insecurityCombined = [insecurityA, insecurityB].filter(Boolean).join(' ');
    const stateSpecificA = getStateSpecificFactor(a.state);
    const stateSpecificB = getStateSpecificFactor(b.state);
    const stateSpecificCombined = [stateSpecificA, stateSpecificB].filter(Boolean).join(' ');

    const seed = `${a.state}-${b.state}-${Math.round(diff * 10)}`;
    const lead = pickVariant(seed, [
      `${higher.state} has the higher PMS price at ${formatCurrency(higher.price)}/L, while ${lower.state} is at ${formatCurrency(lower.price)}/L. The gap is ${formatCurrency(diff)}/L (${diffPct.toFixed(1)}%).`,
      `Looking at both states, ${higher.state} is more expensive (${formatCurrency(higher.price)}/L) than ${lower.state} (${formatCurrency(lower.price)}/L). The difference is ${formatCurrency(diff)}/L.`,
      `In this comparison, ${higher.state} is priced higher at ${formatCurrency(higher.price)}/L and ${lower.state} is lower at ${formatCurrency(lower.price)}/L. That leaves a ${formatCurrency(diff)}/L spread.`
    ]);
    const rankLine = `National ranking shows ${a.state} at ${rankA} of ${stats.count} and ${b.state} at ${rankB} of ${stats.count} (Rank 1 = highest price).`;
    const driversRaw = [
      getNationalFactorsText(),
      getRegionalFactor(a.zone),
      getRegionalFactor(b.zone),
      insecurityCombined,
      stateSpecificCombined
    ].filter(Boolean).join(' ');
    const close = pickVariant(`${seed}-c`, [
      `For cost of living, ${higher.state} is under more pressure than ${lower.state} because transport, generator use, and daily goods movement are more expensive when PMS is higher. The ${formatCurrency(diff)}/L gap means households and small businesses in ${higher.state} are likely spending more each month on fuel-related needs than similar households in ${lower.state}.`,
      `Comparing living costs, ${higher.state} is expected to face the heavier day-to-day burden while ${lower.state} has relatively softer pressure. Higher PMS in ${higher.state} usually feeds into bus fares, delivery charges, and power-backup costs, so everyday expenses are likely to rise faster there than in ${lower.state}.`,
      `In practical terms, ${higher.state} and ${lower.state} are not just different in pump price; they are different in likely living-cost pressure. With PMS higher in ${higher.state}, residents and businesses often absorb extra costs through transport, food logistics, and generator fuel, while ${lower.state} benefits from lower pass-through pressure.`
    ]);

    return [
      `${lead} ${rankLine}`,
      compactText(driversRaw, 820),
      close
    ];
  }

  function buildSecurityNarrative(mode, items) {
    if (mode === 'single') {
      const s = items[0];
      const security = getInsecurityFactor(s.state, s.zone);
      return `${s.state}: ${security}`;
    }

    const a = items[0];
    const b = items[1];
    const sa = getInsecurityFactor(a.state, a.zone);
    const sb = getInsecurityFactor(b.state, b.zone);
    return `${a.state}: ${sa} ${b.state}: ${sb}`;
  }

  function drawParagraph(doc, text, x, y, width, lineHeight = 6.2) {
    const lines = doc.splitTextToSize(text, width);
    if (!lines.length) return y;

    lines.forEach((line, index) => {
      const isLast = index === lines.length - 1;
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (!isLast && words.length > 1) {
        const totalWordW = words.reduce((s, w) => s + doc.getTextWidth(w), 0);
        const gap = (width - totalWordW) / (words.length - 1);
        let cx = x;
        words.forEach(w => { doc.text(w, cx, y); cx += doc.getTextWidth(w) + gap; });
      } else {
        doc.text(line.trim(), x, y);
      }
      y += lineHeight;
    });

    return y;
  }

  function drawSectionHeading(doc, title, x, y, width) {
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(title, x, y);
    doc.setLineWidth(0.2);
    doc.setDrawColor(120);
    doc.line(x, y + 1.4, x + width, y + 1.4);
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    return y + 7;
  }

  function getChartImage(mode) {
    const canvasId = mode === 'single' ? 'stateInfoChart' : 'cmpChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof canvas.toDataURL !== 'function') return null;
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Chart image export failed:', e);
      return null;
    }
  }

  function collectGeoPoints(coords, out) {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      out.push(coords);
      return;
    }
    coords.forEach(c => collectGeoPoints(c, out));
  }

  function drawFeaturePath(ctx, geometry, project) {
    const drawRing = ring => {
      ring.forEach((point, idx) => {
        const [x, y] = project(point);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
    };

    if (geometry?.type === 'Polygon') {
      geometry.coordinates.forEach(drawRing);
    } else if (geometry?.type === 'MultiPolygon') {
      geometry.coordinates.forEach(poly => poly.forEach(drawRing));
    }
  }

  function getFeatureCentroid(feature) {
    const points = [];
    collectGeoPoints(feature?.geometry?.coordinates, points);
    if (!points.length) return null;
    const sx = points.reduce((a, p) => a + p[0], 0);
    const sy = points.reduce((a, p) => a + p[1], 0);
    return [sx / points.length, sy / points.length];
  }

  function renderInsetMap(labelByState) {
    if (!_boundaries?.features?.length) return null;

    const mapRegionH = 760;
    const legendRegionH = 56;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = mapRegionH + legendRegionH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const allPoints = [];
    _boundaries.features.forEach(f => collectGeoPoints(f.geometry?.coordinates, allPoints));
    if (!allPoints.length) return null;

    const xs = allPoints.map(p => p[0]);
    const ys = allPoints.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 24;
    const scale = Math.min((canvas.width - pad * 2) / (maxX - minX), (mapRegionH - pad * 2) / (maxY - minY));
    const offsetX = (canvas.width - ((maxX - minX) * scale)) / 2;
    const offsetY = (mapRegionH - ((maxY - minY) * scale)) / 2;
    const project = p => ([
      offsetX + ((p[0] - minX) * scale),
      mapRegionH - (offsetY + ((p[1] - minY) * scale))
    ]);

    // Backgrounds
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#dce9f5';
    ctx.fillRect(0, 0, canvas.width, mapRegionH);

    const stats = FuelData.getStats();
    const choropleth = Config.CHOROPLETH;
    function getStateFill(stateName) {
      if (!stats || stats.max === stats.min) return choropleth[choropleth.length - 1];
      const sd = FuelData.getStateData(stateName);
      if (!sd) return '#e0e0e0';
      const ratio = (sd.price - stats.min) / (stats.max - stats.min);
      return choropleth[Math.min(Math.floor(ratio * choropleth.length), choropleth.length - 1)];
    }

    const labelEntries = [];

    // First pass: fill all states
    _boundaries.features.forEach(feature => {
      const stateName = Config.resolveStateName(feature.properties?.shapeName || feature.properties?.name || '');
      ctx.beginPath();
      drawFeaturePath(ctx, feature.geometry, project);
      ctx.fillStyle = getStateFill(stateName);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });

    // Second pass: highlighted borders + collect label positions
    _boundaries.features.forEach(feature => {
      const stateName = Config.resolveStateName(feature.properties?.shapeName || feature.properties?.name || '');
      const marker = labelByState[stateName] || null;
      if (!marker) return;
      ctx.save();
      ctx.beginPath();
      drawFeaturePath(ctx, feature.geometry, project);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
      const centroid = getFeatureCentroid(feature);
      if (centroid) {
        const [cx, cy] = project(centroid);
        labelEntries.push({ marker, x: cx, y: cy });
      }
    });

    // Circle labels
    labelEntries.forEach(entry => {
      ctx.beginPath();
      ctx.fillStyle = '#111111';
      ctx.arc(entry.x, entry.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 21px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(entry.marker, entry.x, entry.y + 0.5);
    });

    // Legend title
    ctx.fillStyle = '#222222';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Nigeria PMS Retail Price Map — NBS January 2026 (₦/L)', canvas.width / 2, mapRegionH + 5);

    // Colour legend at bottom
    const legX = 36, legY = mapRegionH + 17;
    const legW = canvas.width - 72;
    const swatchW = legW / choropleth.length;
    choropleth.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(legX + i * swatchW, legY, swatchW, 20);
    });
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(legX, legY, legW, 20);
    ctx.fillStyle = '#333333';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Lower Price', legX, legY + 24);
    ctx.textAlign = 'right';
    ctx.fillText('Higher Price', legX + legW, legY + 24);

    return canvas.toDataURL('image/png');
  }

  function drawHeader(doc, summaryTitle) {
    const pageWidth = 210;
    doc.setDrawColor(40);
    doc.setLineWidth(0.7);
    doc.rect(1.5, 1.5, 207, 294);

    try { doc.addImage(LOGO_BASE64, 'PNG', 22, 15, 22, 22); } catch (e) { console.warn('Logo failed:', e); }

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('GEOINFOTECH RESOURCES LIMITED', pageWidth / 2, 24, { align: 'center' });
    doc.text('NIGERIA PMS PRICE REPORT', pageWidth / 2, 31.5, { align: 'center' });
    doc.text(summaryTitle.toUpperCase(), pageWidth / 2, 40, { align: 'center' });
  }

  function drawFooter(doc) {
    const c = Config.CONTACT;
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${c.address}`, 105, 270, { align: 'center' });
    doc.text(`${c.phone1} | ${c.phone2}`, 105, 274, { align: 'center' });
    doc.text(`${c.email1} | ${c.email2}`, 105, 278, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text('Generated automatically by Geoinfotech PMS Engine', 105, 284, { align: 'center' });
  }

  function generatePdfReport({ mode, states }) {
    if (typeof window.jspdf === 'undefined') return notify('PDF library not loaded. Try refreshing.');
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF('p', 'mm', 'a4');
    const stats = FuelData.getStats();
    if (!stats || !states.length) return;

    const left = 18;
    const contentWidth = 174;
    const labelValueX = 78;
    const items = states.map(name => FuelData.getStateData(name)).filter(Boolean);
    if ((mode === 'single' && items.length < 1) || (mode === 'compare' && items.length < 2)) return;

    const summaryTitle = mode === 'single' ? 'State Price Assessment Summary' : 'State Price Comparison Summary';
    const label = mode === 'single' ? 'Location' : 'Locations';
    const labelByState = mode === 'single'
      ? { [items[0].state]: 'A' }
      : { [items[0].state]: 'A', [items[1].state]: 'B' };
    const classification = mode === 'single'
      ? getPriceClassification(items[0].price, stats)
      : getComparisonClassification(items[0], items[1]);
    const analyses = mode === 'single' ? buildSingleAnalysis(items[0], stats) : buildComparisonAnalysis(items[0], items[1], stats);
    const insetMapImage = renderInsetMap(labelByState);
    drawHeader(doc, summaryTitle);

    const ensureRoom = needed => {
      if (y + needed <= 258) return true;
      doc.addPage();
      doc.setDrawColor(40);
      doc.setLineWidth(0.7);
      doc.rect(1.5, 1.5, 207, 294);
      y = 20;
      return true;
    };

    let y = 56;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(`${label}:`, left, y);
    doc.setFont('times', 'normal');
    doc.text(mode === 'single' ? items[0].state : `${items[0].state} and ${items[1].state}`, labelValueX, y);
    y += 9;

    doc.setFont('times', 'bold');
    doc.text(mode === 'single' ? 'Price Classification:' : 'Comparison Classification:', left, y);
    doc.setFont('times', 'normal');
    doc.text(classification, labelValueX, y);
    y += 12;

    doc.setDrawColor(120);
    doc.setLineWidth(0.25);
    doc.line(left, y, left + contentWidth, y);
    y += 6;

    const sections = mode === 'single'
      ? [
          { heading: 'EXECUTIVE SUMMARY', body: analyses[0] },
          { heading: 'MARKET DRIVERS', body: analyses[1] },
          { heading: 'INTERPRETATION', body: analyses[2] }
        ]
      : [
          { heading: 'EXECUTIVE SUMMARY', body: analyses[0] },
          { heading: 'MARKET DRIVERS', body: analyses[1] },
          { heading: 'COMPARATIVE INTERPRETATION', body: analyses[2] }
        ];

    sections.forEach(section => {
      ensureRoom(26);
      y += 2;
      y = drawSectionHeading(doc, section.heading, left, y, contentWidth);
      y = drawParagraph(doc, section.body, left, y, contentWidth, 5.4);
      y += 2.5;
    });

    const securityNarrative = buildSecurityNarrative(mode, items);
    ensureRoom(24);
    y += 2;
    y = drawSectionHeading(doc, mode === 'single' ? 'STATE SECURITY CONTEXT' : 'STATE SECURITY CONTEXT (COMPARATIVE)', left, y, contentWidth);
    y = drawParagraph(doc, securityNarrative, left, y, contentWidth, 5.4);
    y += 2.5;

    if (mode === 'single') {
      // --- NATIONAL IMPACT CONTEXT (single-state report only) ---
      const selected = items[0];
      const selectedRank = FuelData.getRank(selected.state);
      const selectedDelta = selected.price - stats.avg;
      const selectedDirection = selectedDelta >= 0 ? 'above' : 'below';
      const basePrice = 185;
      const peakPrice = 1189.12;
      const oldNMW = 30000;
      const newNMW = 70000;
      const pctRise = ((stats.avg - basePrice) / basePrice * 100).toFixed(1);
      const oldLitres = Math.round(oldNMW / basePrice);
      const newLitres = Math.round(newNMW / stats.avg);
      const accessDrop = ((oldLitres - newLitres) / oldLitres * 100).toFixed(0);
      const belowPeak = ((peakPrice - stats.avg) / peakPrice * 100).toFixed(1);

      ensureRoom(32);
      y += 2;
      y = drawSectionHeading(doc, 'NATIONAL IMPACT CONTEXT', left, y, contentWidth);
      const impactLead = pickVariant(`${mode}-${items.map(s => s.state).join('-')}-impact`, [
        `At national level, January 2026 PMS remains elevated despite easing from the 2024 peak, and ${selected.state} reflects how that pressure is transmitted locally.`,
        `The broader macro signal is partial relief, not full normalization, in January 2026 PMS pricing, with ${selected.state} showing the state-level pass-through pattern.`,
        `Nationally, PMS has moderated from peak levels but remains structurally high, and ${selected.state} demonstrates the local cost implications.`
      ]);
      const impactNarrative = `${impactLead} In this report, ${selected.state} is priced at ${formatCurrency(selected.price)}/L and ranked ${selectedRank} of ${stats.count}, which is ${formatCurrency(Math.abs(selectedDelta))} ${selectedDirection} the national average. The January 2026 national average stands at ${formatCurrency(stats.avg)}/L against the pre-removal benchmark of NGN 185/L, implying a cumulative increase of ${pctRise}% since subsidy withdrawal. In welfare terms, effective fuel affordability at minimum wage has declined materially: a worker who could purchase about ${oldLitres} litres/month at NGN 30,000 and NGN 185/L can now purchase about ${newLitres} litres/month at NGN 70,000 and current prices, a ${accessDrop}% reduction in practical fuel access. Although a moderation phase is visible, the current level remains only ${belowPeak}% below the December 2024 peak of NGN 1,189.12/L, indicating that relief is real but still incomplete.`;
      y = drawParagraph(doc, impactNarrative, left, y, contentWidth, 5.2);
      y += 3;
    }

    // --- VISUAL SUMMARY (full-width choropleth map, no stretch) ---
    const mapBoxH = 84;
    ensureRoom(mapBoxH + 14);
    y += 2;
    y = drawSectionHeading(doc, 'VISUAL SUMMARY', left, y + 1, contentWidth);
    const mapStartY = y + 1;
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.roundedRect(left, mapStartY, contentWidth, mapBoxH, 1.5, 1.5);
    if (insetMapImage) {
      const srcW = 1200;
      const srcH = 816;
      const innerW = contentWidth - 2;
      const innerH = mapBoxH - 2;
      const scale = Math.min(innerW / srcW, innerH / srcH);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const drawX = left + 1 + ((innerW - drawW) / 2);
      const drawY = mapStartY + 1 + ((innerH - drawH) / 2);
      doc.addImage(insetMapImage, 'PNG', drawX, drawY, drawW, drawH);
    } else {
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.text('Map unavailable', left + contentWidth / 2, mapStartY + mapBoxH / 2, { align: 'center' });
    }
    y = mapStartY + mapBoxH + 3;

    if (mode === 'single') {
      ensureRoom(36);
      const state = items[0];
      const rank = FuelData.getRank(state.state);
      const delta = state.price - stats.avg;
      const zoneAvg = getZoneAverage(state.zone);
      const facts = [
        `Current PMS price: ${formatCurrency(state.price)}/L`,
        `National rank: ${rank} of ${stats.count}`,
        `Zone: ${state.zone}`,
        `National average: ${formatCurrency(stats.avg)}/L`,
        `Difference vs average: ${delta >= 0 ? '+' : '-'}${formatCurrency(Math.abs(delta))}`,
        `Zonal average: ${zoneAvg != null ? `${formatCurrency(zoneAvg)}/L` : 'N/A'}`
      ];
      y += 2;
      y = drawSectionHeading(doc, 'KEY METRICS', left, y, contentWidth);
      doc.setFont('times', 'normal');
      doc.setFontSize(10.5);
      facts.forEach((fact, index) => {
        doc.text(fact, left, y + (index * 5.0));
      });
      y += 30;
    }

    if (mode === 'compare') {
      ensureRoom(20);
      y += 2;
      y = drawSectionHeading(doc, 'COMPARISON SNAPSHOT', left, y, contentWidth);
      doc.setFont('times', 'normal');
      doc.setFontSize(10.5);
      doc.text(`A - ${items[0].state}: ${formatCurrency(items[0].price)}/L | ${items[0].zone}`, left, y + 4);
      doc.text(`B - ${items[1].state}: ${formatCurrency(items[1].price)}/L | ${items[1].zone}`, left, y + 11);
      y += 14;
    }

    // DATA NOTE — styled callout box
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    const noteText = `Data source: NBS PMS Price Watch (January 2026 reporting cycle). This report uses a static survey snapshot and does not represent live pump feeds. Ranking is ordered from highest to lowest PMS price: Rank 1 is the most expensive observation and Rank ${stats.count} the most affordable. Security commentary reflects indicative state-level risk patterns from open-source reporting and is not a real-time incident feed. Reported values are in NGN per litre (NGN/L).`;
    const ntW = contentWidth - 18;
    const ntLines = doc.splitTextToSize(noteText, ntW);
    const ntBoxH = ntLines.length * 4.9 + 11;
    ensureRoom(ntBoxH + 14);
    y += 2;
    y = drawSectionHeading(doc, 'DATA NOTE & RANKING METHODOLOGY', left, y, contentWidth);
    doc.setFillColor(247, 248, 252);
    doc.roundedRect(left, y, contentWidth, ntBoxH, 2, 2, 'F');
    doc.setFillColor(41, 128, 185);
    doc.rect(left, y, 3, ntBoxH, 'F');
    let ny = y + 7;
    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 70, 90);
    ntLines.forEach((line, i) => {
      const isLast = i === ntLines.length - 1;
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (!isLast && words.length > 1) {
        const tw = words.reduce((s, w) => s + doc.getTextWidth(w), 0);
        const gap = (ntW - tw) / (words.length - 1);
        let cx = left + 9;
        words.forEach(w => { doc.text(w, cx, ny); cx += doc.getTextWidth(w) + gap; });
      } else {
        doc.text(line.trim(), left + 9, ny);
      }
      ny += 4.9;
    });
    doc.setTextColor(0, 0, 0);
    y = y + ntBoxH + 6;

    drawFooter(doc);
    const filename = mode === 'single'
      ? `PMS_State_Report_${items[0].state.replace(/\s+/g, '_')}.pdf`
      : `PMS_Comparison_${items[0].state.replace(/\s+/g, '_')}_vs_${items[1].state.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    notify('PDF downloaded');
  }

  // ── PDF Report ─────────────────────────────────────────
  function doSinglePDF() {
    const state = _el.selSingle?.value;
    if (!state) return notify('Select a state first');
    generatePdfReport({ mode: 'single', states: [state] });
  }

  function doPDF() {
    const sel = ['selA', 'selB'].map(id => _el[id]?.value).filter(Boolean);
    if (sel.length < 2) return notify('Run a comparison first');
    generatePdfReport({ mode: 'compare', states: sel });
  }

  // ── PMS Impact Section ──────────────────────────────────
  function renderImpact() {
    const stats = FuelData.getStats();
    if (!stats || !_el.impactStats) return;

    const cur      = stats.avg;
    const base     = 185;          // last subsidised price May 2023
    const peak     = 1189.12;      // NBS Dec 2024 — confirmed peak
    const oldNMW   = 30000;        // National Minimum Wage 2019–Jul 2024
    const newNMW   = 70000;        // National Minimum Wage Jul 2024–present
    const pctRise  = ((cur - base) / base * 100).toFixed(1);
    const oldL     = Math.round(oldNMW / base);   // litres/month at old wage & base price
    const newL     = Math.round(newNMW / cur);    // litres/month at new wage & current price
    const pwDrop   = ((oldL - newL) / oldL * 100).toFixed(0);
    const genMult  = (cur / base).toFixed(1);
    const pctBelowPeak = ((peak - cur) / peak * 100).toFixed(1);
    const fmt = v => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const genDay   = v => Math.round(0.8 * 6 * v).toLocaleString(); // 0.8L/hr × 6hrs typical backup gen

    _el.impactStats.innerHTML = [
      {
        val: `+${pctRise}%`,
        col: 'var(--red)',
        title: 'Total Price Rise Since Subsidy Removal',
        body: `PMS rose from <b>₦${fmt(base)}/L</b> (last subsidised price, May 2023) to <b>₦${fmt(cur)}/L</b> in January 2026 — a <b>${pctRise}% increase</b> in under three years, driven by subsidy removal, naira devaluation, and import cost pass-through.`,
        src: 'NBS PMS Price Watch series 2023–2026'
      },
      {
        val: `\u2212${pwDrop}%`,
        col: '#d35400',
        title: 'Fuel Purchasing Power (Minimum Wage)',
        body: `At the old national minimum wage (₦${oldNMW.toLocaleString()}/month) and subsidised price, a worker could buy <b>${oldL} litres/month</b>. At today's wage (₦${newNMW.toLocaleString()}/month) and price, that falls to just <b>${newL} litres/month</b> — a <b>${pwDrop}% drop</b> in fuel access despite a 133% nominal wage increase.`,
        src: 'Calculated from NBS data; Federal Government Minimum Wage Act 2024'
      },
      {
        val: `${genMult}\u00d7`,
        col: '#8e44ad',
        title: 'Generator Running-Cost Multiplier',
        body: `Nigeria has an estimated 25 million generators in daily use. Running a typical 2.5kVA set (~0.8L/hr for 6 hrs/day) now costs <b>₦${genDay(cur)}/day</b>, versus <b>₦${genDay(base)}/day</b> in the subsidised era — a <b>${genMult}&times;</b> increase bearing directly on households and businesses that depend on back-up power.`,
        src: 'NBS; World Bank Nigeria Electrification Data 2024'
      },
      {
        val: `\u2212${pctBelowPeak}%`,
        col: 'var(--green)',
        title: 'Below December 2024 Peak — Partial Relief',
        body: `January 2026 national average (₦${fmt(cur)}/L) is <b>${pctBelowPeak}% below</b> the December 2024 peak of <b>₦${fmt(peak)}/L</b>. This partial recovery reflects the ramp-up of domestic PMS supply from the Dangote Refinery and some naira stabilisation — the first annual price decline since 2023.`,
        src: 'NBS Dec 2024 & Jan 2026 PMS Price Watch'
      }
    ].map(s => `<div class="imp-stat">
      <div class="imp-stat-top"><span class="imp-stat-val" style="color:${s.col}">${s.val}</span></div>
      <div class="imp-stat-title">${s.title}</div>
      <div class="imp-stat-body">${s.body}</div>
      <div class="imp-stat-src">Source: ${s.src}</div>
    </div>`).join('');

    Charts.priceJourney('priceJourneyChart');
  }

  // ── Timeline ───────────────────────────────────────────
  function renderTimeline() {
    if (!_el.timeline) return;
    _el.timeline.innerHTML = Config.EVENTS.map(e => {
      const ic = { critical: '#c0392b', high: '#e67e22', medium: '#f1c40f' }[e.impact] || '#999';
      return `<div class="tl-card" tabindex="0">
        <div class="tl-head">
          <span class="tl-date">${e.date}</span>
          <span class="tl-dot" style="background:${ic}"></span>
          <span class="tl-impact" style="color:${ic}">${e.impact}</span>
        </div>
        <div class="tl-title">${e.title}</div>
        <div class="tl-body">
          <p>${e.detail}</p>
          <span class="tl-src">Source: ${e.source}</span>
        </div>
      </div>`;
    }).join('');

    _el.timeline.querySelectorAll('.tl-card').forEach(card => {
      card.addEventListener('click', () => {
        const open = card.classList.contains('open');
        _el.timeline.querySelectorAll('.tl-card').forEach(c => c.classList.remove('open'));
        if (!open) card.classList.add('open');
      });
    });
  }

  function _set(id, v) { if (_el[id]) _el[id].textContent = v; }
  function notify(msg) {
    const a = _el.notifs || document.getElementById('notifs'); if (!a) return;
    const n = document.createElement('div'); n.className = 'notif'; n.textContent = msg;
    a.appendChild(n); setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 300); }, 3500);
  }

  return { init, showHover, hideHover, showDetail, notify };
})();

document.addEventListener('DOMContentLoaded', UI.init);
