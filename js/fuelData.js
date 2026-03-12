/**
 * fuelData.js — All data from published Google Sheet
 */
const FuelData = (() => {
  let _data = [];

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      if (vals.length < headers.length) continue;
      const row = {};
      headers.forEach((h, j) => row[h] = vals[j]);
      rows.push(row);
    }
    return rows;
  }

  async function load() {
    try {
      const res = await fetch(Config.GOOGLE_SHEET_FUEL_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      _data = parseCSV(text).map(r => ({
        state: r.state?.trim(),
        price: parseFloat(r.price_ngn),
        date: r.price_date,
        zone: r.zone,
        source: r.source || 'NBS'
      })).filter(d => d.state && !isNaN(d.price));
      console.log(`[FuelData] Loaded ${_data.length} states from Google Sheet`);
      return _data;
    } catch (err) {
      console.error('[FuelData] Failed:', err);
      return [];
    }
  }

  function getPrice(stateName) {
    if (!stateName) return null;
    const resolved = Config.resolveStateName(stateName);
    const key = resolved.toLowerCase();
    const match = _data.find(d => d.state.toLowerCase() === key);
    if (match) return match.price;
    for (const d of _data) {
      if (d.state.toLowerCase().includes(key) || key.includes(d.state.toLowerCase())) return d.price;
    }
    return null;
  }

  function getStateData(stateName) {
    const resolved = Config.resolveStateName(stateName);
    return _data.find(d => d.state.toLowerCase() === resolved.toLowerCase()) || null;
  }

  function getStats() {
    if (!_data.length) return null;
    const prices = _data.map(d => d.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return {
      min: Math.min(...prices), max: Math.max(...prices),
      avg: Math.round(avg * 100) / 100, count: _data.length,
      date: _data[0]?.date || '—',
      cheapest: [..._data].sort((a, b) => a.price - b.price).slice(0, 5),
      costliest: [..._data].sort((a, b) => b.price - a.price).slice(0, 5),
      spread: Math.round((Math.max(...prices) - Math.min(...prices)) * 100) / 100
    };
  }

  function getByPrice(asc = false) {
    return [..._data].sort((a, b) => asc ? a.price - b.price : b.price - a.price);
  }

  function getZoneAverages() {
    const zones = {};
    _data.forEach(d => {
      if (!zones[d.zone]) zones[d.zone] = [];
      zones[d.zone].push(d.price);
    });
    return Object.entries(zones).map(([zone, prices]) => ({
      zone, avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min: Math.round(Math.min(...prices)), max: Math.round(Math.max(...prices)),
      count: prices.length
    })).sort((a, b) => b.avg - a.avg);
  }

  function getRank(stateName) {
    const sorted = getByPrice();
    const resolved = Config.resolveStateName(stateName);
    const idx = sorted.findIndex(d => d.state.toLowerCase() === resolved.toLowerCase());
    return idx >= 0 ? idx + 1 : null;
  }

  return { load, getPrice, getStateData, getStats, getByPrice, getZoneAverages, getRank, get data() { return _data; } };
})();
