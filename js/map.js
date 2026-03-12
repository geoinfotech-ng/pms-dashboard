/**
 * map.js — Vivid choropleth map with click interaction
 */
const DashboardMap = (() => {
  let _map, _statesLayer, _refineryLayer, _legend, _isDark = true;
  let _tileLayer;

  function init(id) {
    _map = L.map(id, {
      center: Config.MAP_CENTER, zoom: Config.MAP_ZOOM,
      minZoom: 5, maxZoom: 12, zoomControl: false
    });
    _tileLayer = L.tileLayer(Config.TILE_DARK, { attribution: Config.TILE_ATTR, subdomains: 'abcd' }).addTo(_map);
    L.control.zoom({ position: 'bottomright' }).addTo(_map);
    return _map;
  }

  async function loadBoundaries() {
    try {
      const res = await fetch(Config.NIGERIA_GEOJSON_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geo = await res.json();
      console.log(`[Map] Loaded ${geo.features.length} state boundaries`);
      return geo;
    } catch (err) {
      console.error('[Map] Boundary fetch failed:', err);
      return null;
    }
  }

  function getColor(price, stats) {
    if (!price || !stats) return '#1e293b';
    const range = stats.max - stats.min;
    if (range === 0) return Config.COLORS[3];
    const ratio = (price - stats.min) / range;
    const idx = Math.min(Math.floor(ratio * Config.COLORS.length), Config.COLORS.length - 1);
    return Config.COLORS[idx];
  }

  function renderChoropleth(geojson) {
    if (!geojson || !_map) return;
    const stats = FuelData.getStats();
    if (!stats) return;
    if (_statesLayer) _map.removeLayer(_statesLayer);

    let matched = 0, unmatched = [];

    _statesLayer = L.geoJSON(geojson, {
      style(feature) {
        const geoName = feature.properties.shapeName || '';
        const nbsName = Config.resolveStateName(geoName);
        const price = FuelData.getPrice(nbsName);
        if (price) matched++; else unmatched.push(geoName);
        return {
          fillColor: getColor(price, stats),
          weight: 2,
          opacity: 1,
          color: _isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)',
          dashArray: '',
          fillOpacity: price ? 0.85 : 0.1
        };
      },
      onEachFeature(feature, layer) {
        const geoName = feature.properties.shapeName || '';
        const nbsName = Config.resolveStateName(geoName);
        const price = FuelData.getPrice(nbsName);
        const rank = FuelData.getRank(nbsName);
        const stateData = FuelData.getStateData(nbsName);
        const priceStr = price ? `₦${price.toLocaleString(undefined,{maximumFractionDigits:2})}` : 'No data';

        layer.on({
          mouseover(e) {
            e.target.setStyle({ weight: 3.5, color: '#fff', fillOpacity: 0.95 });
            e.target.bringToFront();
            if (_refineryLayer) _refineryLayer.bringToFront();
            UI.showHover(nbsName, price, rank, stats);
          },
          mouseout(e) { _statesLayer.resetStyle(e.target); UI.hideHover(); },
          click() {
            UI.showStateDetail(nbsName, price, rank, stateData, stats);
          }
        });
      }
    }).addTo(_map);

    console.log(`[Map] Choropleth: ${matched} matched, ${unmatched.length} unmatched`);
    if (unmatched.length) console.warn('[Map] Unmatched:', unmatched);
    if (_statesLayer.getBounds().isValid()) _map.fitBounds(_statesLayer.getBounds(), { padding: [10, 10] });
    addLegend(stats);
  }

  async function renderRefineries(url) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      const icon = L.divIcon({
        className: 'ref-marker',
        html: '<div class="ref-dot"></div>',
        iconSize: [18, 18], iconAnchor: [9, 9]
      });
      _refineryLayer = L.geoJSON(data, {
        pointToLayer(f, ll) { return L.marker(ll, { icon }); },
        onEachFeature(f, layer) {
          const p = f.properties;
          const sc = p.status === 'Operational' ? '#2dd4a0' : '#f59e42';
          layer.bindPopup(`<div style="font-family:'DM Sans',sans-serif;min-width:200px">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">${p.name}</div>
            <div style="font-size:12px;color:#555;margin-bottom:6px">${p.location}</div>
            <div style="font-size:13px"><b>${p.capacity_bpd.toLocaleString()}</b> barrels/day</div>
            <div style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${sc}20;color:${sc}">${p.status}</div>
            <div style="font-size:12px;color:#444;margin-top:8px;line-height:1.5">${p.description}</div>
          </div>`, { maxWidth: 300 });
        }
      }).addTo(_map);
    } catch (err) { console.error('[Map] Refineries failed:', err); }
  }

  function addLegend(stats) {
    if (_legend) _map.removeControl(_legend);
    _legend = L.control({ position: 'bottomleft' });
    _legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'map-legend');
      let html = '<div class="lg-title">PMS Price (₦/Litre)</div><div class="lg-bar">';
      Config.COLORS.forEach(c => { html += `<span style="background:${c}"></span>`; });
      html += '</div><div class="lg-labels"><span>₦' + Math.round(stats.min) + '</span><span>₦' + Math.round(stats.avg) + '</span><span>₦' + Math.round(stats.max) + '</span></div>';
      div.innerHTML = html;
      return div;
    };
    _legend.addTo(_map);
  }

  function toggleRefineries(show) {
    if (!_refineryLayer || !_map) return;
    show ? _map.addLayer(_refineryLayer) : _map.removeLayer(_refineryLayer);
  }

  function toggleTheme() {
    _isDark = !_isDark;
    _map.removeLayer(_tileLayer);
    _tileLayer = L.tileLayer(_isDark ? Config.TILE_DARK : Config.TILE_LIGHT, { attribution: Config.TILE_ATTR, subdomains: 'abcd' }).addTo(_map);
    _tileLayer.bringToBack();
    return _isDark;
  }

  return { init, loadBoundaries, renderChoropleth, renderRefineries, toggleRefineries, toggleTheme };
})();
