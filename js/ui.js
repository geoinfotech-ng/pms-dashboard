const UI = (() => {
  let _el = {};
  let _geojson = null;

  async function init() {
    _cache();
    _events();
    _initDarkMode();
    _loader(true);

    DashboardMap.init('map');
    const data = await FuelData.load();
    _geojson = await DashboardMap.loadBoundaries();
    if (_geojson && data.length) DashboardMap.renderChoropleth(_geojson);

    if (data.length) {
      renderStats();
      renderInsight();
      renderRankCards();
      populateSelects();
      Charts.zoneBar('zoneChart');
      Charts.pricePie('pieChart');
      Charts.stateChart('stateChart', data);
    }
    renderTimeline();
    _loader(false);
  }

  function _cache() {
    ['statAvg','statMin','statMax','statSpread','statDate','statCount',
     'hover','hoverName','hoverPrice','hoverRank',
     'detail','detailName','detailPrice','detailRank','detailZone','detailDate','detailVsAvg',
     'insight','topExpensive','topAffordable',
     'selA','selB','compareBtn','pdfBtn','timeline',
     'darkToggle','notifs'
    ].forEach(id => _el[id] = document.getElementById(id));
  }

  function _events() {
    _on('detailClose', 'click', () => _el.detail?.classList.remove('open'));
    _on('compareBtn', 'click', doCompare);
    _on('pdfBtn', 'click', doPDF);
    _on('darkToggle', 'click', toggleDarkMode);
  }

  function _on(id, ev, fn) { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); }
  function _loader(v) { const e = document.getElementById('loader'); if (e) e.style.display = v ? 'flex' : 'none'; }

  // ── Dark Mode ──────────────────────────────────────────
  function _initDarkMode() {
    const saved = localStorage.getItem('pms-theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  }

  function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    if (isDark) {
      html.removeAttribute('data-theme');
      localStorage.setItem('pms-theme', 'light');
    } else {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('pms-theme', 'dark');
    }
    // Refresh map tiles
    DashboardMap.switchTiles(!isDark);
    // Re-render choropleth with correct border colors
    if (_geojson && FuelData.data.length) DashboardMap.renderChoropleth(_geojson);
    // Refresh charts for new theme colors
    Charts.refreshAll();
  }

  // ── Stats ──────────────────────────────────────────────
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
    const diff = Math.round(top.price - bot.price);
    const pct = ((diff / bot.price) * 100).toFixed(1);
    const zones = FuelData.getZoneAverages();
    _el.insight.innerHTML = `As of <b>${s.date}</b>, <b>${top.state}</b> has the highest PMS price at <b>₦${Math.round(top.price)}/L</b>, while <b>${bot.state}</b> has the lowest at <b>₦${Math.round(bot.price)}/L</b> — a gap of <b>₦${diff}</b> (${pct}%). The <b>${zones[0].zone}</b> is the most expensive zone (avg ₦${zones[0].avg}/L). National average: <b>₦${s.avg}/L</b> across <b>${s.count}</b> states.`;
  }

  function renderRankCards() {
    const s = FuelData.getStats(); if (!s) return;
    if (_el.topExpensive) _el.topExpensive.innerHTML = s.costliest.map((d, i) =>
      `<div class="rk-row"><span class="rk-n">${i + 1}.</span><span class="rk-s">${d.state}</span><span class="rk-p hi">₦${Math.round(d.price)}</span></div>`
    ).join('');
    if (_el.topAffordable) _el.topAffordable.innerHTML = s.cheapest.map((d, i) =>
      `<div class="rk-row"><span class="rk-n">${i + 1}.</span><span class="rk-s">${d.state}</span><span class="rk-p lo">₦${Math.round(d.price)}</span></div>`
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
      _el.detailVsAvg.innerHTML = `<span style="color:${d >= 0 ? 'var(--red)' : 'var(--green)'};font-weight:700">${sign}₦${Math.abs(Math.round(d))}</span> vs national average (₦${Math.round(stats.avg)})`;
    }
  }

  function populateSelects() {
    const states = FuelData.getByPrice(true).map(d => d.state);
    ['selA', 'selB'].forEach((id, i) => {
      const s = _el[id]; if (!s) return;
      s.innerHTML = '<option value="">Select…</option>' + states.map(n => `<option>${n}</option>`).join('');
      if (i === 0 && states.includes('Lagos')) s.value = 'Lagos';
      if (i === 1 && states.includes('Borno')) s.value = 'Borno';
    });
  }

  function doCompare() {
    const sel = ['selA', 'selB'].map(id => _el[id]?.value).filter(Boolean);
    if (sel.length < 2) return notify('Select 2 states');
    Charts.comparison('cmpChart', sel);
    if (_el.pdfBtn) _el.pdfBtn.style.display = 'inline-block';
  }

  // ── PDF Report (professional Geoinfotech style) ────────
  function doPDF() {
    if (typeof window.jspdf === 'undefined') return notify('PDF library not loaded. Try refreshing.');
    const jsPDF = window.jspdf.jsPDF;
    const sel = ['selA', 'selB'].map(id => _el[id]?.value).filter(Boolean);
    if (sel.length < 2) return notify('Run a comparison first');

    const stats = FuelData.getStats();
    const a = FuelData.data.find(d => d.state === sel[0]);
    const b = FuelData.data.find(d => d.state === sel[1]);
    if (!a || !b || !stats) return;
    const rA = FuelData.getRank(a.state), rB = FuelData.getRank(b.state);
    const higher = a.price >= b.price ? a : b;
    const lower = a.price < b.price ? a : b;
    const diff = Math.abs(a.price - b.price);
    const c = Config.CONTACT;
    const zones = FuelData.getZoneAverages();

    const doc = new jsPDF('p', 'mm', 'a4');
    const W = 210, M = 20, CW = W - 2 * M;
    let y = 18;

    // ── Header with logo ──
    try { doc.addImage(LOGO_BASE64, 'PNG', M, y, 20, 20); } catch (e) { console.warn('Logo failed:', e); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('GEOINFOTECH RESOURCES LIMITED', M + 24, y + 8);
    doc.setFontSize(12);
    doc.text('PMS PRICE COMPARISON REPORT', M + 24, y + 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
    doc.text('National Bureau of Statistics — PMS Price Watch', M + 24, y + 20);
    doc.setTextColor(0);

    y += 28;
    // Thick separator line
    doc.setDrawColor(174, 32, 18); doc.setLineWidth(1); doc.line(M, y, W - M, y);
    doc.setLineWidth(0.2); doc.setDrawColor(180);
    y += 12;

    // ── Subtitle ──
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(`${a.state}  vs  ${b.state}`, W / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Data Period: ${stats.date}  |  Generated: ${new Date().toLocaleDateString('en-NG')}`, W / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 14;

    // ── Comparison Table ──
    const col1 = M, col2 = M + 58, col3 = M + 116;
    const rh = 9;

    // Table header
    doc.setFillColor(45, 106, 79); doc.rect(M, y - 5.5, CW, rh, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255);
    doc.text('Metric', col1 + 4, y); doc.text(a.state, col2 + 4, y); doc.text(b.state, col3 + 4, y);
    doc.setTextColor(0);
    y += rh + 2;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    const rows = [
      ['Price per Litre', `₦${a.price.toFixed(2)}`, `₦${b.price.toFixed(2)}`],
      ['National Rank', `${rA} of ${stats.count}`, `${rB} of ${stats.count}`],
      ['Geopolitical Zone', a.zone, b.zone],
      ['vs National Average', `${a.price > stats.avg ? '+' : ''}₦${Math.round(a.price - stats.avg)}`, `${b.price > stats.avg ? '+' : ''}₦${Math.round(b.price - stats.avg)}`],
      ['Data Source', 'NBS PMS Price Watch', 'NBS PMS Price Watch']
    ];

    rows.forEach((row, i) => {
      if (i % 2 === 0) { doc.setFillColor(245, 245, 243); doc.rect(M, y - 5.5, CW, rh, 'F'); }
      doc.setDrawColor(220); doc.line(M, y + 3.5, W - M, y + 3.5);
      doc.text(row[0], col1 + 4, y); doc.text(row[1], col2 + 4, y); doc.text(row[2], col3 + 4, y);
      y += rh + 1;
    });
    y += 10;

    // ── Analysis Section ──
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Analysis', M, y);
    y += 2;
    doc.setDrawColor(174, 32, 18); doc.setLineWidth(0.6); doc.line(M, y, M + 30, y);
    doc.setLineWidth(0.2); doc.setDrawColor(180);
    y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);

    const para1 = `${higher.state} has a petrol price of ₦${higher.price.toFixed(2)} per litre, which is ₦${diff.toFixed(2)} (${((diff / lower.price) * 100).toFixed(1)}%) higher than ${lower.state} at ₦${lower.price.toFixed(2)} per litre.`;
    const para2 = `The national average PMS price stands at ₦${stats.avg.toLocaleString()} per litre across all ${stats.count} states. The most expensive state is ${stats.costliest[0].state} at ₦${Math.round(stats.costliest[0].price)} per litre, while the most affordable is ${stats.cheapest[0].state} at ₦${Math.round(stats.cheapest[0].price)} per litre, a spread of ₦${Math.round(stats.spread)}.`;
    const para3 = `At the zonal level, the ${zones[0].zone} records the highest average price at ₦${zones[0].avg} per litre, while the ${zones[zones.length - 1].zone} has the lowest at ₦${zones[zones.length - 1].avg} per litre. These disparities reflect differences in transportation costs from coastal depots, local supply chain dynamics, and proximity to refining infrastructure.`;

    [para1, para2, para3].forEach(text => {
      const lines = doc.splitTextToSize(text, CW);
      lines.forEach(line => {
        if (y > 258) { doc.addPage(); y = 20; }
        doc.text(line, M, y, { align: 'justify', maxWidth: CW });
        y += 6.5;
      });
      y += 3;
    });

    // ── Footer on every page ──
    const pc = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pc; p++) {
      doc.setPage(p);
      doc.setDrawColor(174, 32, 18); doc.setLineWidth(0.6); doc.line(M, 272, W - M, 272);
      doc.setLineWidth(0.2); doc.setDrawColor(180);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(80);
      doc.text(`${c.name}`, W / 2, 277, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
      doc.text(`${c.address}`, W / 2, 281, { align: 'center' });
      doc.text(`Email: ${c.email1} | ${c.email2}   Phone: ${c.phone1} | ${c.phone2}`, W / 2, 285, { align: 'center' });
      doc.text(`Page ${p} of ${pc}`, W / 2, 290, { align: 'center' });
      doc.setTextColor(0);
    }

    doc.save(`PMS_Comparison_${a.state}_vs_${b.state}.pdf`);
    notify('PDF downloaded');
  }

  // ── Timeline ───────────────────────────────────────────
  function renderTimeline() {
    if (!_el.timeline) return;
    const impactColors = { critical: '#ae2012', high: '#d56239', medium: '#dda15e' };

    _el.timeline.innerHTML = Config.EVENTS.map(e => {
      const ic = impactColors[e.impact] || '#999';
      return `<div class="tl-card" tabindex="0" style="border-left-color:${ic}">
        <div class="tl-head">
          <span class="tl-date">${e.date}</span>
          <span class="tl-badge" style="background:${ic}">${e.impact}</span>
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
