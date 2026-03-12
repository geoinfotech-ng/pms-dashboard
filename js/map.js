/**
 * map.js — Leaflet map with choropleth and refinery markers
 * Boundaries: geoBoundaries (CC-BY-4.0)
 */
const DashboardMap = (() => {
  let _map, _statesLayer, _refineryLayer, _legend, _geojson;
  let _tileLayer;
  let _isDark = true;

  function init(id) {
    _map = L.map(id, {
      center: Config.MAP_CENTER,
      zoom: Config.MAP_ZOOM,
      minZoom: 5,
      maxZoom: 12,
      zoomControl: false
    });
    _tileLayer = L.tileLayer(Config.TILE_DARK, {
      attribution: Config.TILE_ATTR,
      subdomains: 'abcd'
    }).addTo(_map);
    L.control.zoom({ position: 'bottomright' }).addTo(_map);
    return _map;
  }

  async function loadBoundaries() {
    console.log('[Map] Fetching Nigeria boundaries from geoBoundaries...');
    try {
      const res = await fetch(Config.NIGERIA_GEOJSON_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      _geojson = await res.json();
      // Log shapeName values for debugging
      const names = _geojson.features.map(f => f.properties.shapeName);
      console.log('[Map] geoBoundaries shapeNames:', names);
      console.log(`[Map] Loaded ${_geojson.features.length} features`);
      return _geojson;
    } catch (err) {
      console.error('[Map] Failed:', err);
      return null;
    }
  }

  function getColor(price, stats) {
    if (!price || !stats) return '#2a3548';
    const range = stats.max - stats.min;
    if (range === 0) return Config.COLORS[2];
    const ratio = (price - stats.min) / range;
    const idx = Math.min(Math.floor(ratio * Config.COLORS.length), Config.COLORS.length - 1);
    return Config.COLORS[idx];
  }

  function renderChoropleth(geojson) {
    if (!geojson || !_map) return;
    const stats = FuelData.getStats();
    if (!stats) { console.warn('[Map] No stats for choropleth'); return; }

    if (_statesLayer) _map.removeLayer(_statesLayer);

    let matched = 0, unmatched = [];

    _statesLayer = L.geoJSON(geojson, {
      style(feature) {
        const geoName = feature.properties.shapeName || '';
        const nbsName = Config.resolveStateName(geoName);
        const price = FuelData.getPrice(nbsName);
        if (price) matched++;
        else unmatched.push(geoName);
        return {
          fillColor: getColor(price, stats),
          weight: 1.2,
          opacity: 1,
          color: 'rgba(255,255,255,0.2)',
          fillOpacity: price ? 0.82 : 0.15
        };
      },
      onEachFeature(feature, layer) {
        const geoName = feature.properties.shapeName || '';
        const nbsName = Config.resolveStateName(geoName);
        const price = FuelData.getPrice(nbsName);
        const rank = price ? FuelData.getByPrice().findIndex(d => d.state === _findMatchingState(nbsName)) + 1 : null;
        const priceText = price ? `₦${price.toLocaleString(undefined, {maximumFractionDigits:2})}` : 'No data';

        layer.bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;min-width:180px">
            <div style="font-size:15px;font-weight:600;margin-bottom:4px">${nbsName}</div>
            <div style="font-size:20px;font-weight:700;color:#0b1120;margin:6px 0">${priceText}/L</div>
            ${rank ? `<div style="font-size:12px;color:#666">Rank: ${rank} of ${stats.count} states</div>` : ''}
            <div style="font-size:11px;color:#999;margin-top:6px">Source: NBS PMS Price Watch</div>
          </div>
        `, { maxWidth: 250 });

        layer.on({
          mouseover(e) {
            e.target.setStyle({ weight: 2.5, color: '#fff', fillOpacity: 0.95 });
            e.target.bringToFront();
            if (_refineryLayer) _refineryLayer.bringToFront();
            UI.updateHoverInfo(nbsName, price, rank, stats);
          },
          mouseout(e) { _statesLayer.resetStyle(e.target); UI.hideHoverInfo(); },
          click(e) {
            _map.fitBounds(e.target.getBounds(), { padding: [30, 30] });
            UI.showStateSidebar(nbsName, price, rank, stats);
          }
        });
      }
    }).addTo(_map);

    console.log(`[Map] Choropleth: ${matched} matched, ${unmatched.length} unmatched`);
    if (unmatched.length) console.warn('[Map] Unmatched states:', unmatched);

    if (_statesLayer.getBounds().isValid()) {
      _map.fitBounds(_statesLayer.getBounds(), { padding: [10, 10] });
    }

    addLegend(stats);
  }

  function _findMatchingState(name) {
    const d = FuelData.data.find(d => d.state.toLowerCase() === name.toLowerCase());
    return d ? d.state : name;
  }

  async function renderRefineries(url) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      const icon = L.divIcon({
        className: 'refinery-dot',
        html: '<div class="ref-pulse"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      _refineryLayer = L.geoJSON(data, {
        pointToLayer(f, ll) { return L.marker(ll, { icon }); },
        onEachFeature(f, layer) {
          const p = f.properties;
          const statusColor = p.status === 'Operational' ? '#2dd4a0' : '#f0a033';
          layer.bindPopup(`
            <div style="font-family:'DM Sans',sans-serif;min-width:220px">
              <div style="font-size:14px;font-weight:600">${p.name}</div>
              <div style="font-size:12px;color:#666;margin:4px 0">${p.location}</div>
              <div style="font-size:13px;margin:6px 0">
                <span style="font-weight:600">${p.capacity_bpd.toLocaleString()}</span> barrels/day
              </div>
              <div style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${statusColor}20;color:${statusColor}">${p.status}</div>
              <div style="font-size:12px;color:#555;margin-top:8px;line-height:1.5">${p.description}</div>
            </div>
          `, { maxWidth: 300 });
        }
      }).addTo(_map);
    } catch (err) { console.error('[Map] Refineries failed:', err); }
  }

  function addLegend(stats) {
    if (_legend) _map.removeControl(_legend);
    _legend = L.control({ position: 'bottomleft' });
    _legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'map-legend');
      const steps = 6;
      const range = stats.max - stats.min;
      let html = '<div class="legend-title">PMS Price (₦/L)</div><div class="legend-bar">';
      Config.COLORS.forEach(c => { html += `<span style="background:${c}"></span>`; });
      html += '</div><div class="legend-labels">';
      html += `<span>₦${Math.round(stats.min)}</span><span>₦${Math.round(stats.avg)}</span><span>₦${Math.round(stats.max)}</span>`;
      html += '</div>';
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
    _tileLayer = L.tileLayer(_isDark ? Config.TILE_DARK : Config.TILE_LIGHT, {
      attribution: Config.TILE_ATTR, subdomains: 'abcd'
    }).addTo(_map);
    _tileLayer.bringToBack();
    return _isDark;
  }

  return { init, loadBoundaries, renderChoropleth, renderRefineries, toggleRefineries, toggleTheme };
})();
