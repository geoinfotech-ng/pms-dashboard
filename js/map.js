const DashboardMap = (() => {
  let _map, _statesLayer, _refineryLayer, _legend;

  function getFeatureName(feature) {
    const props = feature?.properties || {};
    return Config.resolveStateName(
      props.shapeName || props.name || props.NAME_1 || props.admin1Name || ''
    );
  }

  function init(id) {
    _map = L.map(id, { center: Config.MAP_CENTER, zoom: Config.MAP_ZOOM, minZoom: 5, maxZoom: 12, zoomControl: false });
    L.tileLayer(Config.TILE_URL, { attribution: Config.TILE_ATTR, subdomains: 'abcd' }).addTo(_map);
    L.control.zoom({ position: 'bottomright' }).addTo(_map);
    const resetCtrl = L.control({ position: 'topright' });
    resetCtrl.onAdd = function () {
      const btn = L.DomUtil.create('button', 'map-reset-btn');
      btn.innerHTML = '&#8635; Nigeria';
      btn.title = 'Reset map to full Nigeria view';
      L.DomEvent.disableClickPropagation(btn);
      btn.addEventListener('click', () => _map.fitBounds(_statesLayer ? _statesLayer.getBounds() : [[4.2, 2.7], [13.9, 14.7]], { padding: [10, 10] }));
      return btn;
    };
    resetCtrl.addTo(_map);
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
    if (stats.max === stats.min) return Config.CHOROPLETH[Config.CHOROPLETH.length - 1];
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
        const name = getFeatureName(f);
        const price = FuelData.getPrice(name);
        if (price) matched++; else unmatched.push(name || f.properties?.shapeName || f.properties?.name || 'Unknown');
        return { fillColor: getColor(price, stats), weight: 2, color: '#fff', fillOpacity: price ? 0.88 : 0.1 };
      },
      onEachFeature(f, layer) {
        const name = getFeatureName(f);
        const price = FuelData.getPrice(name);
        const rank = FuelData.getRank(name);
        const sd = FuelData.getStateData(name);

        layer.on({
          mouseover(e) {
            e.target.setStyle({ weight: 3, color: '#222', fillOpacity: 0.95 });
            e.target.bringToFront();
                    UI.showHover(name, price, rank);
          },
          mouseout(e) { _statesLayer.resetStyle(e.target); UI.hideHover(); },
          click() { UI.showDetail(name, price, rank, sd, stats); }
        });
        if (name) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'state-lbl' });
      }
    }).addTo(_map);

    console.log(`[Map] ${matched} matched, ${unmatched.length} unmatched`);
    if (unmatched.length) console.warn('[Map] Unmatched:', unmatched);
    if (_statesLayer.getBounds().isValid()) _map.fitBounds(_statesLayer.getBounds(), { padding: [10, 10] });
    addLegend(stats);
  }

  async function renderRefineries(url) {
    try {
      const data = await (await fetch(url)).json();
      const icon = L.divIcon({ className: 'ref-mk', html: '<div class="ref-d"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
      _refineryLayer = L.geoJSON(data, {
        pointToLayer(f, ll) { return L.marker(ll, { icon }); },
        onEachFeature(f, layer) {
          const p = f.properties;
          layer.bindPopup(`<div style="font-family:system-ui;min-width:200px"><strong>${p.name}</strong><br><span style="color:#666;font-size:12px">${p.location}</span><br><br><b>${p.capacity_bpd.toLocaleString()}</b> bpd &middot; <span style="color:${p.status==='Operational'?'#27ae60':'#e67e22'}">${p.status}</span><br><br><span style="font-size:12px;color:#555">${p.description}</span></div>`, { maxWidth: 280 });
        }
      }).addTo(_map);
    } catch (e) { console.error('[Map] Refineries:', e); }
  }

  function addLegend(stats) {
    if (_legend) _map.removeControl(_legend);
    _legend = L.control({ position: 'bottomleft' });
    _legend.onAdd = function () {
      const d = L.DomUtil.create('div', 'legend');
      let h = '<b style="font-size:11px;display:block;margin-bottom:4px">PMS Price (₦/L)</b><div style="display:flex;height:10px;border-radius:3px;overflow:hidden">';
      Config.CHOROPLETH.forEach(c => h += `<span style="flex:1;background:${c}"></span>`);
      h += `</div><div style="display:flex;justify-content:space-between;font-size:10px;color:#666;margin-top:2px"><span>₦${Math.round(stats.min)}</span><span>₦${Math.round(stats.max)}</span></div>`;
      d.innerHTML = h;
      return d;
    };
    _legend.addTo(_map);
  }

  function toggleRefineries(v) { if (_refineryLayer && _map) v ? _map.addLayer(_refineryLayer) : _map.removeLayer(_refineryLayer); }

  return { init, loadBoundaries, renderChoropleth, renderRefineries, toggleRefineries };
})();
