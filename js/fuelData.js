const FuelData = (() => {
  let _data = [];

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      if (vals.length < headers.length) return null;
      const row = {};
      headers.forEach((h, j) => row[h] = vals[j]);
      return row;
    }).filter(Boolean);
  }

  async function load() {
    try {
      const res = await fetch(Config.GOOGLE_SHEET_FUEL_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      _data = parseCSV(await res.text()).map(r => ({
        state: r.state?.trim(), price: parseFloat(r.price_ngn),
        date: r.price_date, zone: r.zone, source: r.source || 'NBS'
      })).filter(d => d.state && !isNaN(d.price));
      console.log(`[FuelData] Loaded ${_data.length} states`);
      return _data;
    } catch (err) { console.error('[FuelData] Failed:', err); return []; }
  }

  function getPrice(name) {
    if (!name) return null;
    const resolved = Config.resolveStateName(name).toLowerCase();
    const m = _data.find(d => d.state.toLowerCase() === resolved);
    if (m) return m.price;
    for (const d of _data) {
      if (d.state.toLowerCase().includes(resolved) || resolved.includes(d.state.toLowerCase())) return d.price;
    }
    return null;
  }

  function getStateData(name) {
    const resolved = Config.resolveStateName(name);
    return _data.find(d => d.state.toLowerCase() === resolved.toLowerCase()) || null;
  }

  function getStats() {
    if (!_data.length) return null;
    const p = _data.map(d => d.price);
    const avg = p.reduce((a, b) => a + b, 0) / p.length;
    return {
      min: Math.min(...p), max: Math.max(...p), avg: Math.round(avg * 100) / 100,
      count: _data.length, date: _data[0]?.date || '—',
      spread: Math.round((Math.max(...p) - Math.min(...p)) * 100) / 100,
      cheapest: [..._data].sort((a, b) => a.price - b.price).slice(0, 5),
      costliest: [..._data].sort((a, b) => b.price - a.price).slice(0, 5)
    };
  }

  function getByPrice(asc) { return [..._data].sort((a, b) => asc ? a.price - b.price : b.price - a.price); }
  function getRank(name) {
    const s = getByPrice();
    const r = Config.resolveStateName(name);
    const i = s.findIndex(d => d.state.toLowerCase() === r.toLowerCase());
    return i >= 0 ? i + 1 : null;
  }

  function getZoneAverages() {
    const z = {};
    _data.forEach(d => { if (!z[d.zone]) z[d.zone] = []; z[d.zone].push(d.price); });
    return Object.entries(z).map(([zone, prices]) => ({
      zone, avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      count: prices.length
    })).sort((a, b) => b.avg - a.avg);
  }

  function getZoneTotals() {
    const zones = {};
    _data.forEach(d => {
      if (!zones[d.zone]) zones[d.zone] = { zone: d.zone, total: 0, count: 0 };
      zones[d.zone].total += d.price;
      zones[d.zone].count += 1;
    });

    return Object.values(zones).map(zone => ({
      ...zone,
      total: Math.round(zone.total * 100) / 100,
      avg: Math.round((zone.total / zone.count) * 100) / 100
    })).sort((a, b) => b.total - a.total);
  }

  function getZoneSpreads() {
    const zones = {};
    _data.forEach(d => {
      if (!zones[d.zone]) zones[d.zone] = [];
      zones[d.zone].push(d);
    });

    return Object.entries(zones).map(([zone, items]) => {
      const sorted = [...items].sort((a, b) => a.price - b.price);
      const minItem = sorted[0];
      const maxItem = sorted[sorted.length - 1];
      const spread = maxItem.price - minItem.price;
      return {
        zone,
        min: Math.round(minItem.price * 100) / 100,
        max: Math.round(maxItem.price * 100) / 100,
        spread: Math.round(spread * 100) / 100,
        minState: minItem.state,
        maxState: maxItem.state,
        count: items.length
      };
    }).sort((a, b) => b.spread - a.spread);
  }

  return { load, getPrice, getStateData, getStats, getByPrice, getRank, getZoneAverages, getZoneTotals, getZoneSpreads, get data() { return _data; } };
})();
