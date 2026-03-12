/**
 * oilData.js — Fetches Brent crude oil prices
 * Primary: Alpha Vantage API (live)
 * Fallback: Google Sheet brent_prices tab
 */
const OilData = (() => {
  let _monthly = [];
  let _latest = null;
  let _isLive = false;

  async function fetchBrent() {
    // Try Alpha Vantage first
    if (Config.hasApiKey()) {
      const result = await _fetchAlphaVantage();
      if (result) return { success: true, source: 'Alpha Vantage API' };
    }

    // Fallback to Google Sheet
    if (Config.GOOGLE_SHEET_BRENT_URL) {
      const result = await _fetchGoogleSheet();
      if (result) return { success: true, source: 'Google Sheet' };
    }

    console.warn('[OilData] No Brent data source available');
    return { success: false, source: null };
  }

  async function _fetchAlphaVantage() {
    try {
      const res = await fetch(Config.ALPHA_VANTAGE_BRENT_URL());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json['Error Message'] || json['Note'] || !json.data) return false;

      _monthly = json.data
        .filter(d => d.value && d.value !== '.')
        .map(d => ({ date: d.date, price: parseFloat(d.value) }));

      if (_monthly.length) {
        _latest = _monthly[0];
        _isLive = true;
        console.log(`[OilData] Loaded ${_monthly.length} months from Alpha Vantage (LIVE)`);
      }
      return true;
    } catch (err) {
      console.warn('[OilData] Alpha Vantage failed:', err.message);
      return false;
    }
  }

  async function _fetchGoogleSheet() {
    try {
      const res = await fetch(Config.GOOGLE_SHEET_BRENT_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      _monthly = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, j) => row[h] = vals[j]);
        if (row.date && row.price_usd) {
          _monthly.push({ date: row.date, price: parseFloat(row.price_usd) });
        }
      }
      _monthly.sort((a, b) => b.date.localeCompare(a.date));
      if (_monthly.length) _latest = _monthly[0];
      _isLive = false;
      console.log(`[OilData] Loaded ${_monthly.length} months from Google Sheet (fallback)`);
      return true;
    } catch (err) {
      console.warn('[OilData] Google Sheet fallback failed:', err.message);
      return false;
    }
  }

  function getRecent(n = 24) { return _monthly.slice(0, n).reverse(); }
  function getLatest() { return _latest; }
  function isLive() { return _isLive; }
  function formatUSD(p) { return `$${p.toFixed(2)}`; }

  return { fetchBrent, getRecent, getLatest, isLive, formatUSD, get monthly() { return _monthly; } };
})();
