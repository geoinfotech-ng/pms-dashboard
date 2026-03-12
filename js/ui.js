/**
 * ui.js — Main controller, PDF report, interactive timeline
 */
const UI = (() => {
  let _el = {};

  async function init() {
    _cache();
    _events();
    _showLoader(true);

    DashboardMap.init('map');
    const data = await FuelData.load();
    const geo = await DashboardMap.loadBoundaries();
    if (geo && data.length) DashboardMap.renderChoropleth(geo);
    await DashboardMap.renderRefineries(Config.REFINERIES_GEOJSON);

    if (data.length) {
      renderStats();
      renderInsights();
      renderZoneStrip();
      populateDropdowns();
      DashboardCharts.stateChart('stateChart', data);
      DashboardCharts.zoneChart('zoneChart');
    }

    renderTimeline();
    _showLoader(false);
  }

  function _cache() {
    ['statAvg','statMin','statMax','statSpread','statDate',
     'hover','hoverName','hoverPrice','hoverRank',
     'detail','detailName','detailPrice','detailRank','detailZone','detailVsAvg','detailDate',
     'insightText','zoneStrip',
     'compareA','compareB','compareBtn','downloadPdf',
     'themeBtn','refineryToggle','timeline',
     'loadingOverlay','notifs',
     'topCostly','topCheap'
    ].forEach(id => _el[id] = document.getElementById(id));
  }

  function _events() {
    _on('refineryToggle', 'change', e => DashboardMap.toggleRefineries(e.target.checked));
    _on('themeBtn', 'click', () => {
      const dark = DashboardMap.toggleTheme();
      document.body.classList.toggle('light-mode', !dark);
      _el.themeBtn.textContent = dark ? 'Light Mode' : 'Dark Mode';
    });
    _on('detailClose', 'click', () => _el.detail?.classList.remove('open'));
    _on('compareBtn', 'click', runComparison);
    _on('downloadPdf', 'click', generatePDF);
  }

  function _on(id, evt, fn) { const el = document.getElementById(id); if (el) el.addEventListener(evt, fn); }
  function _showLoader(v) { const el = document.getElementById('loadingOverlay'); if (el) el.style.display = v ? 'flex' : 'none'; }

  // ── Stats ──────────────────────────────────────────────
  function renderStats() {
    const s = FuelData.getStats(); if (!s) return;
    if (_el.statAvg) _el.statAvg.textContent = `₦${s.avg.toLocaleString()}`;
    if (_el.statMin) _el.statMin.textContent = `₦${Math.round(s.min).toLocaleString()}`;
    if (_el.statMax) _el.statMax.textContent = `₦${Math.round(s.max).toLocaleString()}`;
    if (_el.statSpread) _el.statSpread.textContent = `₦${Math.round(s.spread).toLocaleString()}`;
    if (_el.statDate) _el.statDate.textContent = s.date;

    // Top/bottom cards
    if (_el.topCostly) _el.topCostly.innerHTML = s.costliest.map((d,i) =>
      `<div class="rank-item"><span class="ri-pos">${i+1}</span><span class="ri-name">${d.state}</span><span class="ri-price">₦${Math.round(d.price)}</span></div>`
    ).join('');
    if (_el.topCheap) _el.topCheap.innerHTML = s.cheapest.map((d,i) =>
      `<div class="rank-item"><span class="ri-pos">${i+1}</span><span class="ri-name">${d.state}</span><span class="ri-price cheap">₦${Math.round(d.price)}</span></div>`
    ).join('');
  }

  // ── Auto-generated insight ─────────────────────────────
  function renderInsights() {
    const s = FuelData.getStats(); if (!s || !_el.insightText) return;
    const top = s.costliest[0], bot = s.cheapest[0];
    const diff = Math.round(top.price - bot.price);
    const pct = ((diff / bot.price) * 100).toFixed(1);
    const zones = FuelData.getZoneAverages();
    _el.insightText.innerHTML = `<strong>${top.state}</strong> pays <strong>₦${diff}</strong> more per litre than <strong>${bot.state}</strong> — a <strong>${pct}%</strong> premium. The <strong>${zones[0].zone}</strong> is the most expensive zone at ₦${zones[0].avg}/L, while the <strong>${zones[zones.length-1].zone}</strong> is cheapest at ₦${zones[zones.length-1].avg}/L. Data covers <strong>${s.count} states</strong> as of <strong>${s.date}</strong>.`;
  }

  // ── Zone strip ─────────────────────────────────────────
  function renderZoneStrip() {
    if (!_el.zoneStrip) return;
    const zones = FuelData.getZoneAverages();
    const stats = FuelData.getStats(); if (!stats) return;
    _el.zoneStrip.innerHTML = zones.map(z => {
      const ratio = (z.avg - stats.min) / (stats.max - stats.min);
      const idx = Math.min(Math.floor(ratio * Config.COLORS.length), Config.COLORS.length - 1);
      return `<div class="zone-block" style="border-left:3px solid ${Config.COLORS[idx]}"><span class="zb-name">${z.zone}</span><span class="zb-price">₦${z.avg}/L</span><span class="zb-count">${z.count} states</span></div>`;
    }).join('');
  }

  // ── Hover ──────────────────────────────────────────────
  function showHover(name, price, rank, stats) {
    if (!_el.hover) return;
    _el.hover.classList.add('visible');
    if (_el.hoverName) _el.hoverName.textContent = name;
    if (_el.hoverPrice) _el.hoverPrice.textContent = price ? `₦${price.toLocaleString(undefined,{maximumFractionDigits:2})}/L` : 'No data';
    if (_el.hoverRank && rank) _el.hoverRank.textContent = `#${rank} of ${stats.count}`;
  }
  function hideHover() { if (_el.hover) _el.hover.classList.remove('visible'); }

  // ── State detail panel ─────────────────────────────────
  function showStateDetail(name, price, rank, stateData, stats) {
    if (!_el.detail) return;
    _el.detail.classList.add('open');
    if (_el.detailName) _el.detailName.textContent = name;
    if (_el.detailPrice) _el.detailPrice.textContent = price ? `₦${price.toLocaleString(undefined,{maximumFractionDigits:2})}` : '—';
    if (_el.detailRank) _el.detailRank.textContent = rank ? `${rank} of ${stats.count}` : '—';
    if (_el.detailZone) _el.detailZone.textContent = stateData?.zone || '—';
    if (_el.detailDate) _el.detailDate.textContent = stateData?.date || '—';
    if (_el.detailVsAvg && stats && price) {
      const diff = price - stats.avg;
      const sign = diff >= 0 ? '+' : '';
      const color = diff >= 0 ? 'var(--red)' : 'var(--green)';
      _el.detailVsAvg.innerHTML = `<span style="color:${color};font-weight:700">${sign}₦${Math.abs(Math.round(diff))}</span> vs national average (₦${Math.round(stats.avg)})`;
    }
  }

  // ── Comparison tool ────────────────────────────────────
  function populateDropdowns() {
    const states = FuelData.getByPrice(true).map(d => d.state);
    ['compareA','compareB'].forEach((id, i) => {
      const sel = _el[id]; if (!sel) return;
      sel.innerHTML = '<option value="">Select state...</option>' + states.map(s => `<option value="${s}">${s}</option>`).join('');
      if (i === 0 && states.includes('Lagos')) sel.value = 'Lagos';
      if (i === 1 && states.includes('Borno')) sel.value = 'Borno';
    });
  }

  function runComparison() {
    const selected = ['compareA','compareB'].map(id => _el[id]?.value).filter(Boolean);
    if (selected.length < 2) return notify('Select 2 states to compare', 'warning');
    DashboardCharts.comparisonChart('compareChart', selected);
    if (_el.downloadPdf) _el.downloadPdf.style.display = 'inline-block';
  }

  // ── PDF Report ─────────────────────────────────────────
  function generatePDF() {
    const statesSelected = ['compareA','compareB'].map(id => _el[id]?.value).filter(Boolean);
    if (statesSelected.length < 2) return notify('Run a comparison first', 'warning');

    const stats = FuelData.getStats();
    const stA = FuelData.data.find(d => d.state === statesSelected[0]);
    const stB = FuelData.data.find(d => d.state === statesSelected[1]);
    if (!stA || !stB || !stats) return;

    const rankA = FuelData.getRank(stA.state);
    const rankB = FuelData.getRank(stB.state);
    const diff = Math.abs(stA.price - stB.price);
    const higher = stA.price >= stB.price ? stA : stB;
    const lower = stA.price < stB.price ? stA : stB;
    const c = Config.CONTACT;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const W = 210, M = 20, CW = W - 2 * M;
    let y = 15;

    // Logo
    try { doc.addImage(LOGO_BASE64, 'PNG', M, y, 22, 22); } catch(e) {}
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Geoinfotech', M + 26, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Geospatial Intelligence & Technology', M + 26, y + 16);
    doc.setTextColor(0);

    // Line
    y += 28;
    doc.setDrawColor(200);
    doc.line(M, y, W - M, y);
    y += 10;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PMS Price Comparison Report', W / 2, y, { align: 'center' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data Period: ${stats.date}  |  Source: NBS PMS Price Watch  |  Generated: ${new Date().toLocaleDateString()}`, W / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 12;

    // Comparison header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`${stA.state}  vs  ${stB.state}`, W / 2, y, { align: 'center' });
    y += 12;

    // Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const lineH = 8;
    const col1 = M, col2 = M + 60, col3 = M + 120;

    // Header row
    doc.setFillColor(240, 240, 240);
    doc.rect(M, y - 5, CW, lineH + 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Metric', col1, y);
    doc.text(stA.state, col2, y);
    doc.text(stB.state, col3, y);
    y += lineH + 4;

    doc.setFont('helvetica', 'normal');
    const rows = [
      ['Price per Litre', `₦${stA.price.toLocaleString(undefined,{maximumFractionDigits:2})}`, `₦${stB.price.toLocaleString(undefined,{maximumFractionDigits:2})}`],
      ['National Rank', `${rankA} of ${stats.count}`, `${rankB} of ${stats.count}`],
      ['Geopolitical Zone', stA.zone, stB.zone],
      ['vs National Average', `${stA.price > stats.avg ? '+' : ''}₦${Math.round(stA.price - stats.avg)}`, `${stB.price > stats.avg ? '+' : ''}₦${Math.round(stB.price - stats.avg)}`],
      ['Data Source', 'NBS PMS Price Watch', 'NBS PMS Price Watch']
    ];

    rows.forEach((row, i) => {
      if (i % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(M, y - 5, CW, lineH + 2, 'F'); }
      doc.text(row[0], col1, y);
      doc.text(row[1], col2, y);
      doc.text(row[2], col3, y);
      y += lineH + 2;
    });

    y += 8;

    // Analysis
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Analysis', M, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const analysis = `${higher.state} has a petrol price of ₦${higher.price.toLocaleString(undefined,{maximumFractionDigits:2})} per litre, which is ₦${diff.toFixed(2)} (${((diff / lower.price) * 100).toFixed(1)}%) higher than ${lower.state} at ₦${lower.price.toLocaleString(undefined,{maximumFractionDigits:2})} per litre. The national average PMS price is ₦${stats.avg.toLocaleString()} per litre across ${stats.count} states. The price spread between the most expensive state (${stats.costliest[0].state}, ₦${Math.round(stats.costliest[0].price)}) and cheapest state (${stats.cheapest[0].state}, ₦${Math.round(stats.cheapest[0].price)}) is ₦${Math.round(stats.spread)}, reflecting transportation costs, supply logistics, and regional market dynamics.`;

    const lines = doc.splitTextToSize(analysis, CW);
    lines.forEach(line => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(line, M, y, { align: 'justify', maxWidth: CW });
      y += 7.2; // 1.5 line spacing at 12pt
    });

    y += 8;

    // National context
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('National Context', M, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    const zones = FuelData.getZoneAverages();
    const context = `As of ${stats.date}, the NBS PMS Price Watch data shows significant price variation across Nigeria's six geopolitical zones. The ${zones[0].zone} has the highest average price at ₦${zones[0].avg} per litre, while the ${zones[zones.length-1].zone} has the lowest at ₦${zones[zones.length-1].avg} per litre. These disparities are primarily driven by transportation costs from coastal refineries and import terminals, exchange rate fluctuations, and local market conditions.`;

    const ctxLines = doc.splitTextToSize(context, CW);
    ctxLines.forEach(line => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(line, M, y, { align: 'justify', maxWidth: CW });
      y += 7.2;
    });

    // Footer on every page
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setDrawColor(200);
      doc.line(M, 275, W - M, 275);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`${c.name}, ${c.address}`, W / 2, 280, { align: 'center' });
      doc.text(`Email: ${c.email1} | ${c.email2}  •  Phone: ${c.phone1} | ${c.phone2}`, W / 2, 284, { align: 'center' });
      doc.text(`Page ${p} of ${pageCount}`, W / 2, 289, { align: 'center' });
      doc.setTextColor(0);
    }

    doc.save(`PMS_Comparison_${stA.state}_vs_${stB.state}_${stats.date}.pdf`);
    notify('PDF report downloaded', 'info');
  }

  // ── Interactive Timeline ───────────────────────────────
  function renderTimeline() {
    if (!_el.timeline) return;
    _el.timeline.innerHTML = Config.EVENTS.map((e, i) => {
      const impactClass = `impact-${e.impact}`;
      return `<div class="tl-card ${impactClass}" data-idx="${i}">
        <div class="tl-top">
          <span class="tl-date">${e.date}</span>
          <span class="tl-badge ${impactClass}">${e.impact} impact</span>
        </div>
        <div class="tl-title">${e.title}</div>
        <div class="tl-desc">${e.desc}</div>
      </div>`;
    }).join('');

    // Click to expand/collapse
    _el.timeline.querySelectorAll('.tl-card').forEach(card => {
      card.addEventListener('click', () => {
        const wasOpen = card.classList.contains('expanded');
        _el.timeline.querySelectorAll('.tl-card').forEach(c => c.classList.remove('expanded'));
        if (!wasOpen) card.classList.add('expanded');
      });
    });
  }

  function notify(msg, type = 'info') {
    const area = _el.notifs || document.getElementById('notifs');
    if (!area) return;
    const n = document.createElement('div');
    n.className = `notif ${type}`;
    n.textContent = msg;
    area.appendChild(n);
    setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 400); }, 4000);
  }

  return { init, showHover, hideHover, showStateDetail, notify };
})();

document.addEventListener('DOMContentLoaded', UI.init);
