const DashboardMap = (() => {
  let _map, _statesLayer, _tileLayer, _legend;

  function init(id) {
    _map = L.map(id, { center: Config.MAP_CENTER, zoom: Config.MAP_ZOOM, minZoom: 5, maxZoom: 12, zoomControl: false });
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    _tileLayer = L.tileLayer(isDark ? Config.TILE_URL_DARK : Config.TILE_URL, { attribution: Config.TILE_ATTR, subdomains: 'abcd' }).addTo(_map);
    L.control.zoom({ position: 'bottomright' }).addTo(_map);
  }

  function switchTiles(dark) {
    if (!_map || !_tileLayer) return;
    _map.removeLayer(_tileLayer);
    _tileLayer = L.tileLayer(dark ? Config.TILE_URL_DARK : Config.TILE_URL, { attribution: Config.TILE_ATTR, subdomains: 'abcd' }).addTo(_map);
    if (_statesLayer) _statesLayer.bringToFront();
  }

  async function loadBoundaries() {
    try {
      const res = await fetch(Config.NIGERIA_GEOJSON_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geo = await res.json();
      console.log(`[Map] Loaded ${geo.features.length} boundaries`);
      return geo;
    } catch (err) { console.error('[Map] Failed:', err); return null; }
  }

  function getColor(price, stats) {
    if (!price || !stats) return '#e0e0e0';
    const ratio = (price - stats.min) / (stats.max - stats.min);
    const idx = Math.min(Math.floor(ratio * Config.CHOROPLETH.length), Config.CHOROPLETH.length - 1);
    return Config.CHOROPLETH[idx];
  }

  function renderChoropleth(geojson) {
    const stats = FuelData.getStats();
    if (!stats || !_map) return;
    if (_statesLayer) _map.removeLayer(_statesLayer);
    let matched = 0, unmatched = [];

    _statesLayer = L.geoJSON(geojson, {
      style(f) {
        const name = Config.resolveStateName(f.properties.shapeName || '');
        const price = FuelData.getPrice(name);
        if (price) matched++; else unmatched.push(f.properties.shapeName);
        return {
          fillColor: getColor(price, stats),
          weight: 1.5,
          color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#2a2a28' : '#fff',
          fillOpacity: price ? 0.88 : 0.12
        };
      },
      onEachFeature(f, layer) {
        const name = Config.resolveStateName(f.properties.shapeName || '');
        const price = FuelData.getPrice(name);
        const rank = FuelData.getRank(name);
        const sd = FuelData.getStateData(name);

        layer.on({
          mouseover(e) {
            e.target.setStyle({ weight: 2.5, color: '#222', fillOpacity: 0.95 });
            e.target.bringToFront();
            UI.showHover(name, price, rank);
          },
          mouseout(e) { _statesLayer.resetStyle(e.target); UI.hideHover(); },
          click() { UI.showDetail(name, price, rank, sd, stats); }
        });
      }
    }).addTo(_map);

    console.log(`[Map] ${matched} matched, ${unmatched.length} unmatched`);
    if (unmatched.length) console.warn('[Map] Unmatched:', unmatched);
    if (_statesLayer.getBounds().isValid()) _map.fitBounds(_statesLayer.getBounds(), { padding: [10, 10] });
    addLegend(stats);
  }

  function addLegend(stats) {
    if (_legend) _map.removeControl(_legend);
    _legend = L.control({ position: 'bottomleft' });
    _legend.onAdd = function () {
      const d = L.DomUtil.create('div', 'legend');
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const txtCol = isDark ? '#ccc' : '#555';
      const subCol = isDark ? '#888' : '#999';
      let h = `<b style="font-size:11px;display:block;margin-bottom:6px;color:${txtCol}">PMS Price (₦/L)</b>`;
      h += '<div style="display:flex;height:12px;border-radius:3px;overflow:hidden;margin-bottom:4px">';
      Config.CHOROPLETH.forEach(c => h += `<span style="flex:1;background:${c}"></span>`);
      h += '</div>';
      h += `<div style="display:flex;justify-content:space-between;font-size:10px;color:${subCol};font-family:var(--mono)">`;
      h += `<span>₦${Math.round(stats.min)}</span>`;
      h += `<span style="color:var(--red)">Avg ₦${Math.round(stats.avg)}</span>`;
      h += `<span>₦${Math.round(stats.max)}</span>`;
      h += '</div>';
      d.innerHTML = h;
      return d;
    };
    _legend.addTo(_map);
  }

  return { init, loadBoundaries, renderChoropleth, switchTiles };
})();
