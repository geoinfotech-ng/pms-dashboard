/**
 * fuelData.js — Loads and analyses Nigerian fuel price data
 * Source: NBS PMS Price Watch via published Google Sheet
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
    const url = Config.GOOGLE_SHEET_FUEL_URL;
    console.log('[FuelData] Fetching from Google Sheet...');
    try {
      const res = await fetch(url);
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
      console.error('[FuelData] Google Sheet fetch failed:', err);
      return [];
    }
  }

  function getPrice(stateName) {
    if (!stateName) return null;
    const resolved = Config.resolveStateName(stateName);
    const key = resolved.toLowerCase();
    const match = _data.find(d => d.state.toLowerCase() === key);
    if (match) return match.price;
    // Fuzzy: check if one contains the other
    for (const d of _data) {
      if (d.state.toLowerCase().includes(key) || key.includes(d.state.toLowerCase())) {
        return d.price;
      }
    }
    return null;
  }

  function getStats() {
    if (!_data.length) return null;
    const prices = _data.map(d => d.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(avg * 100) / 100,
      count: _data.length,
      date: _data[0]?.date || '—',
      cheapest: [..._data].sort((a, b) => a.price - b.price).slice(0, 3),
      costliest: [..._data].sort((a, b) => b.price - a.price).slice(0, 3),
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
      zone,
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min: Math.round(Math.min(...prices)),
      max: Math.round(Math.max(...prices)),
      count: prices.length
    })).sort((a, b) => b.avg - a.avg);
  }

  function getDistanceData() {
    const results = [];
    const refineries = Config.REFINERIES_COORDS;
    _data.forEach(d => {
      const centroid = Config.STATE_CENTROIDS[d.state];
      if (!centroid) return;
      let minDist = Infinity;
      let nearest = '';
      refineries.forEach(r => {
        const dist = haversine(centroid[0], centroid[1], r.lat, r.lng);
        if (dist < minDist) { minDist = dist; nearest = r.name; }
      });
      results.push({
        state: d.state,
        price: d.price,
        distance: Math.round(minDist),
        nearest
      });
    });
    return results;
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getHistogram(binSize = 25) {
    if (!_data.length) return [];
    const prices = _data.map(d => d.price);
    const min = Math.floor(Math.min(...prices) / binSize) * binSize;
    const max = Math.ceil(Math.max(...prices) / binSize) * binSize;
    const bins = [];
    for (let low = min; low < max; low += binSize) {
      const high = low + binSize;
      const count = _data.filter(d => d.price >= low && d.price < high).length;
      bins.push({ label: `₦${low}–${high}`, low, high, count });
    }
    return bins;
  }

  return {
    load, getPrice, getStats, getByPrice, getZoneAverages,
    getDistanceData, getHistogram,
    get data() { return _data; }
  };
})();
