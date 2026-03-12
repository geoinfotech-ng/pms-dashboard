const Charts = (() => {
  const _i = {};
  const F = "system-ui, -apple-system, sans-serif";
  const TIP = { backgroundColor: '#1a1a2e', titleColor: '#fff', bodyColor: '#ccc', padding: 10, titleFont: { family: F }, bodyFont: { family: F } };
  function _d(k) { if (_i[k]) { _i[k].destroy(); delete _i[k]; } }

  function zoneBar(id) {
    _d('zone');
    const c = document.getElementById(id); if (!c) return;
    const zones = FuelData.getZoneAverages();
    const colors = ['#c0392b','#e74c3c','#e67e22','#f1c40f','#2ecc71','#27ae60'];
    _i.zone = new Chart(c, {
      type: 'bar',
      data: { labels: zones.map(z => z.zone), datasets: [{ data: zones.map(z => z.avg), backgroundColor: colors.slice(0, zones.length), borderWidth: 0, borderRadius: 4, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: ctx => ` ₦${zones[ctx.dataIndex].avg}/L (${zones[ctx.dataIndex].count} states)` } } },
        scales: {
          x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11, family: F }, callback: v => `₦${v}` }, min: Math.min(...zones.map(z => z.avg)) - 30 },
          y: { grid: { display: false }, ticks: { font: { size: 12, family: F, weight: '600' }, color: '#333' } }
        }
      }
    });
  }

  function zonePie(id) {
    _d('pie');
    const c = document.getElementById(id); if (!c) return;
    const zones = FuelData.getZoneAverages();
    const colors = ['#c0392b','#e67e22','#f1c40f','#2ecc71','#27ae60','#3498db'];
    _i.pie = new Chart(c, {
      type: 'pie',
      data: {
        labels: zones.map(z => z.zone),
        datasets: [{ data: zones.map(z => z.count), backgroundColor: colors.slice(0, zones.length), borderColor: '#fff', borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11, family: F }, padding: 12, usePointStyle: true } },
          tooltip: { ...TIP, callbacks: { label: ctx => ` ${zones[ctx.dataIndex].zone}: ${zones[ctx.dataIndex].count} states (avg ₦${zones[ctx.dataIndex].avg}/L)` } }
        }
      }
    });
  }

  function stateChart(id, data) {
    _d('state');
    const c = document.getElementById(id); if (!c) return;
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
          tooltip: { ...TIP, callbacks: {
            title: items => items[0]?.label,
            label: ctx => { const d = sorted[ctx.dataIndex]; return [` ₦${d.price.toLocaleString(undefined,{maximumFractionDigits:2})}/L`, ` Zone: ${d.zone}`, ` Rank: ${ctx.dataIndex + 1} of ${sorted.length}`]; }
          }}
        },
        scales: {
          x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 10, family: F }, callback: v => `₦${v}` }, min: stats ? stats.min - 20 : 0 },
          y: { grid: { display: false }, ticks: { font: { size: 10, family: F }, color: '#444' } }
        }
      },
      plugins: [{
        id: 'avg',
        afterDraw(chart) {
          if (!stats) return;
          const ctx2 = chart.ctx, x = chart.scales.x.getPixelForValue(stats.avg), y = chart.scales.y;
          ctx2.save(); ctx2.strokeStyle = '#c0392b'; ctx2.lineWidth = 1.5; ctx2.setLineDash([5, 3]);
          ctx2.beginPath(); ctx2.moveTo(x, y.top); ctx2.lineTo(x, y.bottom); ctx2.stroke();
          ctx2.fillStyle = '#c0392b'; ctx2.font = `600 10px ${F}`; ctx2.textAlign = 'center';
          ctx2.fillText(`Avg: ₦${Math.round(stats.avg)}`, x, y.top - 4); ctx2.restore();
        }
      }]
    });
  }

  function comparison(id, states) {
    _d('cmp');
    const c = document.getElementById(id); if (!c) return;
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
          { label: 'National Avg', data: items.map(() => stats?.avg || 0), type: 'line', borderColor: '#c0392b', borderWidth: 2, borderDash: [5, 3], pointRadius: 0, fill: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { font: { size: 11, family: F }, usePointStyle: true } }, tooltip: { ...TIP } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 13, family: F, weight: '700' }, color: '#222' } },
          y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 10, family: F }, callback: v => `₦${v}` }, min: stats ? Math.max(0, stats.min - 50) : 0 }
        }
      }
    });
  }

  return { zoneBar, zonePie, stateChart, comparison };
})();
