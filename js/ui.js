/**
 * ui.js — Main UI controller
 */
const UI = (() => {
  let _el = {};

  async function init() {
    _cache();
    _events();
    _show('loadingOverlay', true);

    // 1. Init map
    DashboardMap.init('map');

    // 2. Load fuel prices from Google Sheet
    const fuelData = await FuelData.load();

    // 3. Load Nigeria boundaries & render choropleth
    const geo = await DashboardMap.loadBoundaries();
    if (geo && fuelData.length) {
      DashboardMap.renderChoropleth(geo);
    }

    // 4. Refineries
    await DashboardMap.renderRefineries(Config.REFINERIES_GEOJSON);

    // 5. Stats & insight cards
    if (fuelData.length) {
      renderStats();
      renderInsights();
      renderZoneStrip();
      populateCompareDropdowns();
    }

    // 6. Charts from NBS data
    if (fuelData.length) {
      DashboardCharts.stateChart('stateChart', fuelData);
      DashboardCharts.zoneChart('zoneChart');
      DashboardCharts.histogramChart('histChart');
      DashboardCharts.breakdownChart('breakdownChart');
      DashboardCharts.distanceChart('distanceChart');
    }

    // 7. Brent crude
    await loadOil();

    // 8. Timeline
    renderTimeline();

    _show('loadingOverlay', false);
    console.log('[UI] Dashboard ready');
  }

  async function loadOil() {
    setBrent(null, 'loading');
    const result = await OilData.fetchBrent();
    if (result.success) {
      const latest = OilData.getLatest();
      setBrent(latest, OilData.isLive() ? 'live' : 'sheet');
      const recent = OilData.getRecent(24);
      if (recent.length) DashboardCharts.trendChart('trendChart', recent);
    } else {
      setBrent(null, Config.hasApiKey() ? 'error' : 'no_key');
      showApiPrompt();
    }
  }

  function _cache() {
    ['brentPrice','brentDate','brentBadge','statAvg','statMin','statMax','statSpread',
     'stateHover','hoverName','hoverPrice','hoverRank',
     'sidebar','sidebarName','sidebarPrice','sidebarRank','sidebarVsAvg','sidebarZone',
     'insightText','zoneStrip','loadingOverlay','notifs',
     'apiSection','apiInput','apiBtn',
     'compareA','compareB','compareC','compareBtn',
     'themeBtn','refineryToggle','timeline'
    ].forEach(id => _el[id] = document.getElementById(id));
  }

  function _events() {
    _on('refineryToggle', 'change', e => DashboardMap.toggleRefineries(e.target.checked));
    _on('apiBtn', 'click', submitApiKey);
    _on('apiInput', 'keypress', e => { if (e.key === 'Enter') submitApiKey(); });
    _on('compareBtn', 'click', runComparison);
    _on('themeBtn', 'click', () => {
      const dark = DashboardMap.toggleTheme();
      document.body.classList.toggle('light-mode', !dark);
      const btn = _el.themeBtn;
      if (btn) btn.textContent = dark ? 'Light Mode' : 'Dark Mode';
    });
    _on('sidebarClose', 'click', () => { if (_el.sidebar) _el.sidebar.classList.remove('open'); });
  }

  function _on(id, evt, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  }

  async function submitApiKey() {
    const key = _el.apiInput?.value.trim();
    if (!key || key.length < 5) return notify('Enter a valid API key', 'warning');
    Config.ALPHA_VANTAGE_API_KEY = key;
    if (_el.apiSection) _el.apiSection.style.display = 'none';
    notify('Fetching live Brent crude data...', 'info');
    await loadOil();
  }

  // ── Brent display ──────────────────────────────────────
  function setBrent(data, status) {
    const p = _el.brentPrice, d = _el.brentDate, b = _el.brentBadge;
    if (!p) return;
    const states = {
      live:      { price: data ? OilData.formatUSD(data.price) : '—', date: data?.date || '', badge: 'LIVE', cls: 'live' },
      sheet:     { price: data ? OilData.formatUSD(data.price) : '—', date: data?.date || '', badge: 'CACHED', cls: 'cached' },
      loading:   { price: '···', date: '', badge: 'LOADING', cls: 'loading' },
      no_key:    { price: '—', date: '', badge: 'NO KEY', cls: 'no-key' },
      error:     { price: '—', date: '', badge: 'OFFLINE', cls: 'error' }
    };
    const s = states[status] || states.error;
    p.textContent = s.price;
    if (d) d.textContent = s.date;
    if (b) { b.textContent = s.badge; b.className = `badge ${s.cls}`; }
  }

  // ── Stats cards ────────────────────────────────────────
  function renderStats() {
    const s = FuelData.getStats();
    if (!s) return;
    if (_el.statAvg) _el.statAvg.textContent = `₦${s.avg.toLocaleString()}`;
    if (_el.statMin) _el.statMin.textContent = `₦${Math.round(s.min).toLocaleString()}`;
    if (_el.statMax) _el.statMax.textContent = `₦${Math.round(s.max).toLocaleString()}`;
    if (_el.statSpread) _el.statSpread.textContent = `₦${Math.round(s.spread).toLocaleString()}`;
  }

  // ── Auto-generated insight ─────────────────────────────
  function renderInsights() {
    const s = FuelData.getStats();
    if (!s || !_el.insightText) return;
    const top = s.costliest[0], bot = s.cheapest[0];
    const diff = Math.round(top.price - bot.price);
    const pct = ((diff / bot.price) * 100).toFixed(1);
    const zones = FuelData.getZoneAverages();
    const topZ = zones[0], botZ = zones[zones.length - 1];
    _el.insightText.innerHTML = `
      <strong>${top.state}</strong> pays <strong>₦${diff}</strong> more per litre than <strong>${bot.state}</strong> — a <strong>${pct}%</strong> premium.
      The <strong>${topZ.zone}</strong> is the most expensive zone (avg ₦${topZ.avg}/L),
      while the <strong>${botZ.zone}</strong> is cheapest (avg ₦${botZ.avg}/L).
      Data covers <strong>${s.count} states</strong> as of <strong>${s.date}</strong>.
    `;
  }

  // ── Zone strip ─────────────────────────────────────────
  function renderZoneStrip() {
    const strip = _el.zoneStrip;
    if (!strip) return;
    const zones = FuelData.getZoneAverages();
    const stats = FuelData.getStats();
    if (!stats) return;
    strip.innerHTML = zones.map(z => {
      const ratio = (z.avg - stats.min) / (stats.max - stats.min);
      const idx = Math.min(Math.floor(ratio * Config.COLORS.length), Config.COLORS.length - 1);
      return `<div class="zone-block" style="background:${Config.COLORS[idx]}20;border-left:3px solid ${Config.COLORS[idx]}">
        <span class="zone-name">${z.zone}</span>
        <span class="zone-price">₦${z.avg}</span>
      </div>`;
    }).join('');
  }

  // ── Hover info ─────────────────────────────────────────
  function updateHoverInfo(name, price, rank, stats) {
    const el = _el.stateHover;
    if (!el) return;
    el.classList.add('visible');
    if (_el.hoverName) _el.hoverName.textContent = name;
    if (_el.hoverPrice) _el.hoverPrice.textContent = price ? `₦${price.toLocaleString(undefined,{maximumFractionDigits:2})}/L` : 'No data';
    if (_el.hoverRank && rank) _el.hoverRank.textContent = `#${rank} of ${stats.count}`;
    else if (_el.hoverRank) _el.hoverRank.textContent = '';
  }

  function hideHoverInfo() {
    if (_el.stateHover) _el.stateHover.classList.remove('visible');
  }

  // ── Click sidebar ──────────────────────────────────────
  function showStateSidebar(name, price, rank, stats) {
    const sb = _el.sidebar;
    if (!sb) return;
    sb.classList.add('open');
    if (_el.sidebarName) _el.sidebarName.textContent = name;
    if (_el.sidebarPrice) _el.sidebarPrice.textContent = price ? `₦${price.toLocaleString(undefined,{maximumFractionDigits:2})}` : '—';
    if (_el.sidebarRank) _el.sidebarRank.textContent = rank ? `${rank} of ${stats.count}` : '—';
    if (_el.sidebarZone) {
      const d = FuelData.data.find(x => x.state.toLowerCase() === name.toLowerCase());
      _el.sidebarZone.textContent = d?.zone || '—';
    }
    if (_el.sidebarVsAvg && stats && price) {
      const diff = price - stats.avg;
      const sign = diff >= 0 ? '+' : '';
      const color = diff >= 0 ? '#e85a5a' : '#2dd4a0';
      _el.sidebarVsAvg.innerHTML = `<span style="color:${color}">${sign}₦${Math.round(diff)}</span> vs national avg`;
    }
  }

  // ── Comparison tool ────────────────────────────────────
  function populateCompareDropdowns() {
    const states = FuelData.getByPrice(true).map(d => d.state);
    ['compareA','compareB','compareC'].forEach((id, i) => {
      const sel = _el[id];
      if (!sel) return;
      sel.innerHTML = `<option value="">Select state...</option>` +
        states.map(s => `<option value="${s}" ${i < 3 && s === states[i] ? '' : ''}>${s}</option>`).join('');
      // Pre-select some defaults
      if (i === 0 && states.includes('Lagos')) sel.value = 'Lagos';
      if (i === 1 && states.includes('Borno')) sel.value = 'Borno';
      if (i === 2 && states.includes('Abuja')) sel.value = 'Abuja';
    });
  }

  function runComparison() {
    const selected = ['compareA','compareB','compareC']
      .map(id => _el[id]?.value).filter(Boolean);
    if (selected.length < 2) return notify('Select at least 2 states', 'warning');
    DashboardCharts.comparisonChart('compareChart', selected);
  }

  // ── Timeline ───────────────────────────────────────────
  function renderTimeline() {
    const el = _el.timeline;
    if (!el) return;
    el.innerHTML = Config.EVENTS.map(e => `
      <div class="tl-item">
        <div class="tl-date">${e.date}</div>
        <div class="tl-dot"></div>
        <div class="tl-content">
          <div class="tl-title">${e.title}</div>
          <div class="tl-desc">${e.desc}</div>
        </div>
      </div>
    `).join('');
  }

  // ── Helpers ────────────────────────────────────────────
  function _show(id, visible) {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? 'flex' : 'none';
  }

  function showApiPrompt() {
    if (_el.apiSection) _el.apiSection.style.display = 'block';
  }

  function notify(msg, type = 'info') {
    const area = _el.notifs || document.getElementById('notifs');
    if (!area) return;
    const n = document.createElement('div');
    n.className = `notif ${type}`;
    n.textContent = msg;
    area.appendChild(n);
    setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 400); }, 5000);
  }

  return { init, updateHoverInfo, hideHoverInfo, showStateSidebar, notify };
})();

document.addEventListener('DOMContentLoaded', UI.init);
