/**
 * charts.js — All Chart.js visualizations
 */
const DashboardCharts = (() => {
  const _instances = {};
  const F = "'DM Sans',sans-serif";
  const G = 'rgba(255,255,255,0.05)';
  const T = '#7a8ba5';
  const TIP = { backgroundColor: 'rgba(10,18,32,0.95)', titleColor: '#f0f4f8', bodyColor: '#c1cfdf', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, padding: 12, titleFont: { family: F, weight: '600' }, bodyFont: { family: F } };

  function _destroy(key) { if (_instances[key]) { _instances[key].destroy(); delete _instances[key]; } }
  function _canvas(id) { return document.getElementById(id); }

  // 1. Brent crude trend line
  function trendChart(id, data) {
    _destroy('trend');
    const c = _canvas(id); if (!c) return;
    _instances.trend = new Chart(c, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Brent Crude (USD/barrel)',
          data: data.map(d => d.price),
          borderColor: '#e8a838',
          backgroundColor: _gradient(c, '#e8a838', 0.2, 0),
          borderWidth: 2.5, pointRadius: 2, pointHoverRadius: 5,
          pointBackgroundColor: '#e8a838', fill: true, tension: 0.35
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: T, font: { size: 11, family: F }, usePointStyle: true, padding: 12 } }, tooltip: { ...TIP, callbacks: { label: ctx => ` $${ctx.parsed.y.toFixed(2)}/bbl` } } },
        scales: {
          x: { grid: { color: G }, ticks: { color: T, font: { size: 10, family: F }, maxTicksLimit: 10, maxRotation: 45 } },
          y: { grid: { color: G }, ticks: { color: T, font: { size: 10, family: F }, callback: v => `$${v}` } }
        }
      }
    });
  }

  // 2. State bar chart (horizontal)
  function stateChart(id, data) {
    _destroy('state');
    const c = _canvas(id); if (!c) return;
    const sorted = [...data].sort((a, b) => b.price - a.price);
    const stats = FuelData.getStats();
    const colors = sorted.map(d => {
      const ratio = stats ? (d.price - stats.min) / (stats.max - stats.min) : 0.5;
      const idx = Math.min(Math.floor(ratio * Config.COLORS.length), Config.COLORS.length - 1);
      return Config.COLORS[idx];
    });

    _instances.state = new Chart(c, {
      type: 'bar',
      data: {
        labels: sorted.map(d => d.state),
        datasets: [{ label: 'PMS Price (₦/L)', data: sorted.map(d => d.price), backgroundColor: colors, borderWidth: 0, borderRadius: 3, barPercentage: 0.8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: ctx => ` ₦${ctx.parsed.x.toLocaleString(undefined,{maximumFractionDigits:2})}/L` } } },
        scales: {
          x: { grid: { color: G }, ticks: { color: T, font: { size: 10, family: F }, callback: v => `₦${v}` } },
          y: { grid: { display: false }, ticks: { color: T, font: { size: 10, family: F } } }
        }
      },
      plugins: [{ id: 'avgLine', afterDraw(chart) {
        if (!stats) return;
        const ctx = chart.ctx, x = chart.scales.x, y = chart.scales.y;
        const px = x.getPixelForValue(stats.avg);
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(px, y.top); ctx.lineTo(px, y.bottom); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `11px ${F}`; ctx.textAlign = 'center';
        ctx.fillText(`Avg ₦${Math.round(stats.avg)}`, px, y.top - 5); ctx.restore();
      }}]
    });
  }

  // 3. Zone comparison (horizontal bar)
  function zoneChart(id) {
    _destroy('zone');
    const c = _canvas(id); if (!c) return;
    const zones = FuelData.getZoneAverages();
    const zoneColors = ['#e85a5a','#f0a033','#f6d95b','#73d98e','#2dd4a0','#4a9eff'];

    _instances.zone = new Chart(c, {
      type: 'bar',
      data: {
        labels: zones.map(z => z.zone),
        datasets: [{
          label: 'Average PMS Price (₦/L)',
          data: zones.map(z => z.avg),
          backgroundColor: zoneColors.slice(0, zones.length),
          borderWidth: 0, borderRadius: 4, barPercentage: 0.7
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { ...TIP, callbacks: { label: ctx => ` ₦${ctx.parsed.x}/L (${zones[ctx.dataIndex].count} states)` } }
        },
        scales: {
          x: { grid: { color: G }, ticks: { color: T, font: { size: 10, family: F }, callback: v => `₦${v}` },
            min: Math.min(...zones.map(z => z.avg)) - 30 },
          y: { grid: { display: false }, ticks: { color: T, font: { size: 11, family: F, weight: '500' } } }
        }
      }
    });
  }

  // 4. Price distribution histogram
  function histogramChart(id) {
    _destroy('hist');
    const c = _canvas(id); if (!c) return;
    const bins = FuelData.getHistogram(25);

    _instances.hist = new Chart(c, {
      type: 'bar',
      data: {
        labels: bins.map(b => b.label),
        datasets: [{
          label: 'Number of States',
          data: bins.map(b => b.count),
          backgroundColor: bins.map(b => {
            const mid = (b.low + b.high) / 2;
            const stats = FuelData.getStats();
            if (!stats) return '#4a9eff';
            const ratio = (mid - stats.min) / (stats.max - stats.min);
            const idx = Math.min(Math.floor(ratio * Config.COLORS.length), Config.COLORS.length - 1);
            return Config.COLORS[idx];
          }),
          borderWidth: 0, borderRadius: 3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...TIP, callbacks: { label: ctx => ` ${ctx.parsed.y} state${ctx.parsed.y !== 1 ? 's' : ''}` } }
        },
        scales: {
          x: { grid: { color: G }, ticks: { color: T, font: { size: 9, family: F }, maxRotation: 45 } },
          y: { grid: { color: G }, ticks: { color: T, font: { size: 10, family: F }, stepSize: 1 }, beginAtZero: true }
        }
      }
    });
  }

  // 5. Price breakdown donut
  function breakdownChart(id) {
    _destroy('breakdown');
    const c = _canvas(id); if (!c) return;
    const bd = Config.PRICE_BREAKDOWN;
    const labels = ['Crude Oil Cost', 'Refining Margin', 'Transportation', 'Taxes & Levies', 'Dealer Margin', 'FX Impact'];
    const values = [bd.crude_oil, bd.refining, bd.transport, bd.taxes_levies, bd.dealer_margin, bd.exchange_rate_impact];
    const colors = ['#e8a838','#f0a033','#e85a5a','#b91c4a','#73d98e','#4a9eff'];

    _instances.breakdown = new Chart(c, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderColor: '#0b1120', borderWidth: 2, hoverOffset: 8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'right', labels: { color: T, font: { size: 11, family: F }, padding: 10, usePointStyle: true } },
          tooltip: { ...TIP, callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
        }
      }
    });
  }

  // 6. Distance vs Price scatter
  function distanceChart(id) {
    _destroy('distance');
    const c = _canvas(id); if (!c) return;
    const distData = FuelData.getDistanceData();
    if (!distData.length) return;

    _instances.distance = new Chart(c, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'State',
          data: distData.map(d => ({ x: d.distance, y: d.price, state: d.state, nearest: d.nearest })),
          backgroundColor: distData.map(d => {
            const stats = FuelData.getStats();
            if (!stats) return '#4a9eff';
            const ratio = (d.price - stats.min) / (stats.max - stats.min);
            const idx = Math.min(Math.floor(ratio * Config.COLORS.length), Config.COLORS.length - 1);
            return Config.COLORS[idx] + 'CC';
          }),
          borderColor: 'transparent',
          pointRadius: 6, pointHoverRadius: 9
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...TIP, callbacks: {
            title: items => items[0]?.raw?.state || '',
            label: item => [
              ` Price: ₦${item.raw.y.toLocaleString(undefined,{maximumFractionDigits:2})}/L`,
              ` Distance: ${item.raw.x} km`,
              ` Nearest: ${item.raw.nearest}`
            ]
          }}
        },
        scales: {
          x: { grid: { color: G }, ticks: { color: T, font: { size: 10, family: F } },
            title: { display: true, text: 'Distance to Nearest Refinery (km)', color: T, font: { size: 11, family: F } } },
          y: { grid: { color: G }, ticks: { color: T, font: { size: 10, family: F }, callback: v => `₦${v}` },
            title: { display: true, text: 'PMS Price (₦/L)', color: T, font: { size: 11, family: F } } }
        }
      }
    });
  }

  // 7. State comparison mini chart
  function comparisonChart(id, stateNames) {
    _destroy('compare');
    const c = _canvas(id); if (!c) return;
    const data = stateNames.map(s => {
      const d = FuelData.data.find(x => x.state === s);
      return d || { state: s, price: 0 };
    });
    const stats = FuelData.getStats();

    _instances.compare = new Chart(c, {
      type: 'bar',
      data: {
        labels: data.map(d => d.state),
        datasets: [
          { label: 'State Price', data: data.map(d => d.price), backgroundColor: data.map(d => {
            if (!stats) return '#4a9eff';
            const r = (d.price - stats.min) / (stats.max - stats.min);
            return Config.COLORS[Math.min(Math.floor(r * Config.COLORS.length), Config.COLORS.length - 1)];
          }), borderWidth: 0, borderRadius: 4 },
          { label: 'National Avg', data: data.map(() => stats?.avg || 0), type: 'line', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, fill: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: T, font: { size: 10, family: F }, usePointStyle: true, padding: 10 } },
          tooltip: { ...TIP, callbacks: { label: ctx => ctx.dataset.label === 'National Avg' ? ` Avg: ₦${ctx.parsed.y}` : ` ₦${ctx.parsed.y.toLocaleString(undefined,{maximumFractionDigits:2})}/L` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: T, font: { size: 11, family: F } } },
          y: { grid: { color: G }, ticks: { color: T, font: { size: 10, family: F }, callback: v => `₦${v}` },
            min: stats ? stats.min - 30 : 0 }
        }
      }
    });
  }

  function _gradient(canvas, hex, topA, bottomA) {
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 250);
    const [r, gr, b] = [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    g.addColorStop(0, `rgba(${r},${gr},${b},${topA})`);
    g.addColorStop(1, `rgba(${r},${gr},${b},${bottomA})`);
    return g;
  }

  return { trendChart, stateChart, zoneChart, histogramChart, breakdownChart, distanceChart, comparisonChart };
})();
