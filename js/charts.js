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

  function singleState(id, stateName) {
    _d('single');
    const c = document.getElementById(id); if (!c) return;
    const stats = FuelData.getStats();
    const state = FuelData.data.find(d => d.state === stateName);
    if (!stats || !state) return;
    const delta = Math.round((state.price - stats.avg) * 100) / 100;
    _i.single = new Chart(c, {
      type: 'bar',
      data: {
        labels: [state.state, 'National Avg'],
        datasets: [{
          label: 'PMS Price',
          data: [state.price, stats.avg],
          backgroundColor: [delta >= 0 ? '#c0392b' : '#27ae60', '#1a1d24'],
          borderWidth: 0,
          borderRadius: 5,
          barPercentage: 0.55
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...TIP, callbacks: { label: ctx => {
            return ` ₦${Number(ctx.raw).toLocaleString(undefined, { maximumFractionDigits: 2 })}/L`;
          } } }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: F, weight: '600' }, color: '#333' }
          },
          y: {
            grid: { color: '#f0f0f0' },
            ticks: { font: { size: 10, family: F }, callback: v => `₦${v}` }
          }
        }
      },
      plugins: [{
        id: 'singleLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          ctx.save();
          ctx.fillStyle = '#1a1d24';
          ctx.font = `600 10px ${F}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          meta.data.forEach((bar, index) => {
            const value = index === 0 ? state.price : stats.avg;
            ctx.fillText(`₦${Math.round(value)}`, bar.x, bar.y - 6);
          });
          ctx.restore();
        }
      }]
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
          const ctx2 = chart.ctx;
          const x = chart.scales.x.getPixelForValue(stats.avg);
          const yScale = chart.scales.y;
          // Dashed line
          ctx2.save();
          ctx2.strokeStyle = '#c0392b';
          ctx2.lineWidth = 2.5;
          ctx2.setLineDash([6, 4]);
          ctx2.beginPath();
          ctx2.moveTo(x, yScale.top);
          ctx2.lineTo(x, yScale.bottom);
          ctx2.stroke();
          ctx2.setLineDash([]);
          // Label with background pill
          const label = `Avg ₦${Math.round(stats.avg)}`;
          ctx2.font = `700 10px ${F}`;
          const tw = ctx2.measureText(label).width;
          const lx = x - tw / 2 - 5;
          const ly = yScale.top + 6;
          ctx2.fillStyle = '#c0392b';
          ctx2.beginPath();
          ctx2.roundRect(lx, ly, tw + 10, 14, 3);
          ctx2.fill();
          ctx2.fillStyle = '#fff';
          ctx2.textAlign = 'center';
          ctx2.textBaseline = 'middle';
          ctx2.fillText(label, x, ly + 7);
          ctx2.restore();
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
          { label: 'PMS Price', data: items.map(d => d.price), backgroundColor: colors, borderWidth: 0, borderRadius: 6, barPercentage: 0.5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...TIP, callbacks: {
            title: itemsTooltip => itemsTooltip[0]?.label,
            label: ctx => {
              const item = items[ctx.dataIndex];
              const delta = Math.round((item.price - stats.avg) * 100) / 100;
              const sign = delta >= 0 ? '+' : '';
              return [
                ` ₦${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}/L`,
                ` Zone: ${item.zone}`,
                ` Vs Avg: ${sign}₦${Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              ];
            }
          } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 13, family: F, weight: '700' }, color: '#222' } },
          y: {
            grid: { color: '#f0f0f0' },
            ticks: { font: { size: 10, family: F }, callback: v => `₦${v}` },
            min: stats ? Math.max(0, stats.min - 50) : 0
          }
        }
      }
    });
  }

  function priceJourney(canvasId) {
    const history = Config.PRICE_HISTORY;
    const canvas  = document.getElementById(canvasId);
    if (!canvas) return;
    if (canvas._chartInstance) canvas._chartInstance.destroy();

    const labels   = history.map(h => h.label);
    const prices   = history.map(h => h.price);
    const notes    = history.map(h => h.note);
    const ptColors = prices.map((_, i) => i <= 1 ? '#27ae60' : i === 6 ? '#c0392b' : i === prices.length - 1 ? '#2980b9' : '#e8583e');
    const ptSizes  = prices.map((_, i) => (i <= 1 || i === 6 || i === prices.length - 1) ? 8 : 4);
    const ptBorder = prices.map((_, i) => (i <= 1 || i === 6 || i === prices.length - 1) ? '#fff' : 'transparent');

    const ctx  = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(192,57,43,0.16)');
    grad.addColorStop(1, 'rgba(192,57,43,0.01)');

    canvas._chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Avg PMS (\u20a6/L)',
          data: prices,
          borderColor: '#c0392b',
          backgroundColor: grad,
          borderWidth: 2.5,
          pointBackgroundColor: ptColors,
          pointBorderColor: ptBorder,
          pointBorderWidth: 2,
          pointRadius: ptSizes,
          pointHoverRadius: 9,
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1d24',
            titleColor: '#fff',
            bodyColor: '#d0d4db',
            padding: 11,
            callbacks: {
              label: item => `  \u20a6${item.raw.toLocaleString(undefined, { minimumFractionDigits: 2 })}/L`,
              afterLabel: item => notes[item.dataIndex] ? `  ${notes[item.dataIndex]}` : ''
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10.5 }, color: '#8590a2' } },
          y: {
            min: 0,
            ticks: { callback: v => `\u20a6${v.toLocaleString()}`, font: { size: 10.5 }, color: '#8590a2' },
            grid: { color: '#f0f1f3' }
          }
        }
      }
    });
  }

  return { zoneBar, singleState, stateChart, comparison, priceJourney };
})();
