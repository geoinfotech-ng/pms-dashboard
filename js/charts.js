const Charts = (() => {
  const _i = {};

  function _getTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      dark: isDark,
      grid: isDark ? '#2a2a28' : '#f0f0f0',
      text: isDark ? '#b0b0aa' : '#444',
      textBold: isDark ? '#ececea' : '#222',
      tipBg: isDark ? '#2a2a28' : '#1a1a1a',
      tipTitle: '#fff',
      tipBody: isDark ? '#ccc' : '#ccc',
      avgLine: isDark ? '#e85d4a' : '#ae2012',
      font: "system-ui, -apple-system, 'IBM Plex Sans', sans-serif"
    };
  }

  function _tip(t) {
    return { backgroundColor: t.tipBg, titleColor: t.tipTitle, bodyColor: t.tipBody, padding: 10, titleFont: { family: t.font }, bodyFont: { family: t.font } };
  }

  function _d(k) { if (_i[k]) { _i[k].destroy(); delete _i[k]; } }

  function zoneBar(id) {
    _d('zone');
    const c = document.getElementById(id); if (!c) return;
    const t = _getTheme();
    const zones = FuelData.getZoneAverages();
    const stats = FuelData.getStats();
    const colors = zones.map(z => {
      if (!stats) return '#999';
      const ratio = (z.avg - stats.min) / (stats.max - stats.min);
      const idx = Math.min(Math.floor(ratio * Config.CHOROPLETH.length), Config.CHOROPLETH.length - 1);
      return Config.CHOROPLETH[idx];
    });

    _i.zone = new Chart(c, {
      type: 'bar',
      data: { labels: zones.map(z => z.zone), datasets: [{ data: zones.map(z => z.avg), backgroundColor: colors, borderWidth: 0, borderRadius: 3, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { ..._tip(t), callbacks: { label: ctx => ` ₦${zones[ctx.dataIndex].avg}/L (${zones[ctx.dataIndex].count} states)` } } },
        scales: {
          x: { grid: { color: t.grid }, ticks: { font: { size: 11, family: t.font }, color: t.text, callback: v => `₦${v}` }, min: Math.min(...zones.map(z => z.avg)) - 30 },
          y: { grid: { display: false }, ticks: { font: { size: 12, family: t.font, weight: '600' }, color: t.textBold } }
        }
      }
    });
  }

  function pricePie(id) {
    _d('pie');
    const c = document.getElementById(id); if (!c) return;
    const t = _getTheme();
    const bands = FuelData.getPriceBandDistribution();
    if (!bands.length) return;

    _i.pie = new Chart(c, {
      type: 'doughnut',
      data: {
        labels: bands.map(b => b.label),
        datasets: [{
          data: bands.map(b => b.count),
          backgroundColor: bands.map(b => b.color),
          borderColor: t.dark ? '#1c1c1a' : '#fff',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '40%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { size: 10, family: t.font },
              color: t.text,
              padding: 8,
              usePointStyle: true,
              pointStyleWidth: 10,
              boxWidth: 10,
              boxHeight: 10
            }
          },
          tooltip: {
            ..._tip(t),
            callbacks: {
              label: ctx => {
                const band = bands[ctx.dataIndex];
                const total = bands.reduce((s, b) => s + b.count, 0);
                const pct = ((band.count / total) * 100).toFixed(0);
                return ` ${band.count} states (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  function stateChart(id, data) {
    _d('state');
    const c = document.getElementById(id); if (!c) return;
    const t = _getTheme();
    const sorted = [...data].sort((a, b) => a.price - b.price);
    const stats = FuelData.getStats();
    const colors = sorted.map(d => {
      if (!stats) return '#999';
      const r = (d.price - stats.min) / (stats.max - stats.min);
      const idx = Math.min(Math.floor(r * Config.CHOROPLETH.length), Config.CHOROPLETH.length - 1);
      return Config.CHOROPLETH[idx];
    });

    _i.state = new Chart(c, {
      type: 'bar',
      data: { labels: sorted.map(d => d.state), datasets: [{ data: sorted.map(d => d.price), backgroundColor: colors, borderWidth: 0, borderRadius: 3, barPercentage: 0.75 }] },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { ..._tip(t), callbacks: {
            title: items => items[0]?.label,
            label: ctx => { const d = sorted[ctx.dataIndex]; return [` ₦${d.price.toLocaleString(undefined,{maximumFractionDigits:2})}/L`, ` Zone: ${d.zone}`, ` Rank: ${ctx.dataIndex + 1} of ${sorted.length}`]; }
          }}
        },
        scales: {
          x: {
            grid: { color: t.grid },
            ticks: { font: { size: 10, family: t.font }, color: t.text, callback: v => `₦${v}` },
            min: stats ? stats.min - 20 : 0
          },
          y: { grid: { display: false }, ticks: { font: { size: 10, family: t.font }, color: t.text } }
        }
      },
      plugins: [{
        id: 'avgLine',
        afterDraw(chart) {
          if (!stats) return;
          const ctx2 = chart.ctx;
          const xScale = chart.scales.x;
          const yScale = chart.scales.y;
          const x = xScale.getPixelForValue(stats.avg);

          // Only draw if avg is within visible range
          if (x < xScale.left || x > xScale.right) return;

          ctx2.save();
          ctx2.strokeStyle = t.avgLine;
          ctx2.lineWidth = 1.5;
          ctx2.setLineDash([6, 4]);
          ctx2.beginPath();
          ctx2.moveTo(x, yScale.top);
          ctx2.lineTo(x, yScale.bottom);
          ctx2.stroke();

          // Label above the chart area
          ctx2.fillStyle = t.avgLine;
          ctx2.font = `600 11px ${t.font}`;
          ctx2.textAlign = 'center';
          ctx2.fillText(`Avg ₦${Math.round(stats.avg)}`, x, yScale.top - 6);
          ctx2.restore();
        }
      }]
    });
  }

  function comparison(id, states) {
    _d('cmp');
    const c = document.getElementById(id); if (!c) return;
    const t = _getTheme();
    const stats = FuelData.getStats();
    const items = states.map(s => FuelData.data.find(d => d.state === s) || { state: s, price: 0 });
    const colors = items.map(d => {
      if (!stats || !d.price) return '#ccc';
      const r = (d.price - stats.min) / (stats.max - stats.min);
      return Config.CHOROPLETH[Math.min(Math.floor(r * Config.CHOROPLETH.length), Config.CHOROPLETH.length - 1)];
    });

    _i.cmp = new Chart(c, {
      type: 'bar',
      data: {
        labels: items.map(d => d.state),
        datasets: [
          { label: 'PMS Price', data: items.map(d => d.price), backgroundColor: colors, borderWidth: 0, borderRadius: 6, barPercentage: 0.5 },
          { label: 'National Avg', data: items.map(() => stats?.avg || 0), type: 'line', borderColor: t.avgLine, borderWidth: 2, borderDash: [5, 3], pointRadius: 0, fill: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { font: { size: 11, family: t.font }, color: t.text, usePointStyle: true } }, tooltip: { ..._tip(t) } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 13, family: t.font, weight: '700' }, color: t.textBold } },
          y: { grid: { color: t.grid }, ticks: { font: { size: 10, family: t.font }, color: t.text, callback: v => `₦${v}` }, min: stats ? Math.max(0, stats.min - 50) : 0 }
        }
      }
    });
  }

  function refreshAll() {
    const data = FuelData.data;
    if (!data.length) return;
    zoneBar('zoneChart');
    pricePie('pieChart');
    stateChart('stateChart', data);
    // Don't auto-refresh comparison
  }

  return { zoneBar, pricePie, stateChart, comparison, refreshAll };
})();
