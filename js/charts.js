/**
 * charts.js — Zone comparison, state ranking, 2-state comparison
 */
const DashboardCharts = (() => {
  const _inst = {};
  const F = "'DM Sans',sans-serif";
  const G = 'rgba(255,255,255,0.05)';
  const T = '#7a8ba5';
  const TIP = { backgroundColor:'rgba(10,18,32,.95)', titleColor:'#f0f4f8', bodyColor:'#c1cfdf', borderColor:'rgba(255,255,255,.08)', borderWidth:1, padding:12, titleFont:{family:F,weight:'600'}, bodyFont:{family:F} };

  function _destroy(k) { if (_inst[k]) { _inst[k].destroy(); delete _inst[k]; } }

  // Zone comparison
  function zoneChart(id) {
    _destroy('zone');
    const c = document.getElementById(id); if (!c) return;
    const zones = FuelData.getZoneAverages();
    const zColors = ['#c43a5e','#ef6461','#f59e42','#f7c948','#7bea6e','#00c6a7'];
    _inst.zone = new Chart(c, {
      type: 'bar',
      data: {
        labels: zones.map(z => z.zone),
        datasets: [{
          label: 'Avg ₦/Litre',
          data: zones.map(z => z.avg),
          backgroundColor: zColors.slice(0, zones.length),
          borderWidth: 0, borderRadius: 5, barPercentage: 0.65
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: ctx => {
          const z = zones[ctx.dataIndex];
          return [` Average: ₦${z.avg}/L`, ` Range: ₦${z.min} – ₦${z.max}`, ` States: ${z.count}`];
        }}}},
        scales: {
          x: { grid:{color:G}, ticks:{color:T,font:{size:10,family:F},callback:v=>`₦${v}`}, min: Math.min(...zones.map(z=>z.avg)) - 40 },
          y: { grid:{display:false}, ticks:{color:T,font:{size:11,family:F,weight:'500'}} }
        }
      }
    });
  }

  // State bar chart — improved: gradient colored, rounded, readable
  function stateChart(id, data) {
    _destroy('state');
    const c = document.getElementById(id); if (!c) return;
    const sorted = [...data].sort((a, b) => b.price - a.price);
    const stats = FuelData.getStats();
    const colors = sorted.map(d => {
      if (!stats) return '#4a9eff';
      const ratio = (d.price - stats.min) / (stats.max - stats.min);
      const idx = Math.min(Math.floor(ratio * Config.COLORS.length), Config.COLORS.length - 1);
      return Config.COLORS[idx];
    });

    _inst.state = new Chart(c, {
      type: 'bar',
      data: {
        labels: sorted.map(d => d.state),
        datasets: [{
          label: 'PMS Price (₦/L)',
          data: sorted.map(d => d.price),
          backgroundColor: colors,
          borderWidth: 0,
          borderRadius: 4,
          barPercentage: 0.82
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { ...TIP, callbacks: {
            title: items => items[0]?.label || '',
            label: ctx => {
              const d = sorted[ctx.dataIndex];
              const rank = ctx.dataIndex + 1;
              return [` ₦${d.price.toLocaleString(undefined,{maximumFractionDigits:2})}/L`, ` Rank: ${rank} of ${sorted.length}`, ` Zone: ${d.zone}`];
            }
          }}
        },
        scales: {
          x: {
            grid: { color: G },
            ticks: { color: T, font: { size: 10, family: F }, callback: v => `₦${v}` },
            min: 0
          },
          y: {
            grid: { display: false },
            ticks: { color: T, font: { size: 10, family: F }, padding: 4 }
          }
        }
      },
      plugins: [{
        id: 'avgLine',
        afterDraw(chart) {
          if (!stats) return;
          const ctx2 = chart.ctx, xA = chart.scales.x, yA = chart.scales.y;
          const px = xA.getPixelForValue(stats.avg);
          ctx2.save();
          ctx2.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx2.lineWidth = 1.5;
          ctx2.setLineDash([6, 4]);
          ctx2.beginPath(); ctx2.moveTo(px, yA.top); ctx2.lineTo(px, yA.bottom); ctx2.stroke();
          ctx2.fillStyle = 'rgba(255,255,255,0.55)';
          ctx2.font = `600 11px ${F}`;
          ctx2.textAlign = 'center';
          ctx2.fillText(`National Avg: ₦${Math.round(stats.avg)}`, px, yA.top - 6);
          ctx2.restore();
        }
      }, {
        id: 'priceLabels',
        afterDraw(chart) {
          const ctx2 = chart.ctx, xA = chart.scales.x;
          chart.getDatasetMeta(0).data.forEach((bar, i) => {
            const price = sorted[i].price;
            const x = xA.getPixelForValue(price);
            ctx2.save();
            ctx2.fillStyle = 'rgba(255,255,255,0.7)';
            ctx2.font = `600 9px ${F}`;
            ctx2.textAlign = 'left';
            ctx2.textBaseline = 'middle';
            ctx2.fillText(`₦${Math.round(price)}`, x + 5, bar.y);
            ctx2.restore();
          });
        }
      }]
    });
  }

  // 2-state comparison
  function comparisonChart(id, states) {
    _destroy('compare');
    const c = document.getElementById(id); if (!c) return;
    const stats = FuelData.getStats();
    const items = states.map(s => FuelData.data.find(d => d.state === s) || { state: s, price: 0 });
    const colors = items.map(d => {
      if (!stats || !d.price) return '#555';
      const ratio = (d.price - stats.min) / (stats.max - stats.min);
      const idx = Math.min(Math.floor(ratio * Config.COLORS.length), Config.COLORS.length - 1);
      return Config.COLORS[idx];
    });

    _inst.compare = new Chart(c, {
      type: 'bar',
      data: {
        labels: items.map(d => d.state),
        datasets: [
          {
            label: 'Price (₦/L)', data: items.map(d => d.price),
            backgroundColor: colors, borderWidth: 0, borderRadius: 6, barPercentage: 0.55
          },
          {
            label: 'National Average', data: items.map(() => stats?.avg || 0),
            type: 'line', borderColor: 'rgba(255,255,255,0.35)', borderWidth: 2,
            borderDash: [6, 4], pointRadius: 0, fill: false
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: T, font: { size: 10, family: F }, usePointStyle: true } },
          tooltip: { ...TIP, callbacks: { label: ctx => ctx.dataset.label === 'National Average' ? ` Avg: ₦${Math.round(ctx.parsed.y)}` : ` ₦${ctx.parsed.y.toLocaleString(undefined,{maximumFractionDigits:2})}/L` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: T, font: { size: 12, family: F, weight: '600' } } },
          y: { grid: { color: G }, ticks: { color: T, font: { size: 10, family: F }, callback: v => `₦${v}` }, min: stats ? Math.max(0, stats.min - 60) : 0 }
        }
      }
    });
  }

  return { zoneChart, stateChart, comparisonChart };
})();
