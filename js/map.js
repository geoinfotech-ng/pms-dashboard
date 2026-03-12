const DashboardMap = (() => {

let map;
let statesLayer;
let refineryLayer;
let legend;



function init(id){

map = L.map(id,{
center:Config.MAP_CENTER,
zoom:Config.MAP_ZOOM,
minZoom:5,
maxZoom:12,
zoomControl:false
});

L.tileLayer(
Config.TILE_URL,
{
attribution:Config.TILE_ATTR,
subdomains:"abcd"
}
).addTo(map);

L.control.zoom({
position:"bottomright"
}).addTo(map);

}



async function loadBoundaries(){

try{

const res = await fetch(Config.NIGERIA_GEOJSON_URL);

if(!res.ok){
throw new Error(`HTTP ${res.status}`);
}

const geo = await res.json();

console.log("GeoJSON loaded:",geo.features.length);

return geo;

}catch(err){

console.error("Boundary load error",err);

return null;

}

}



function getColor(price,stats){

if(price === null || price === undefined){
return "#e0e0e0";
}

if(stats.max === stats.min){
return Config.CHOROPLETH[0];
}

const ratio = (price - stats.min) / (stats.max - stats.min);

const index = Math.min(
Math.floor(ratio * Config.CHOROPLETH.length),
Config.CHOROPLETH.length - 1
);

return Config.CHOROPLETH[index];

}



function renderChoropleth(geojson){

const stats = FuelData.getStats();

if(!stats || !map) return;

if(statesLayer){
map.removeLayer(statesLayer);
}

statesLayer = L.geoJSON(geojson,{

style:(feature)=>{

const rawName =
feature.properties.shapeName ||
feature.properties.state ||
feature.properties.NAME_1 ||
"";

const stateName = Config.resolveStateName(rawName);

const price = FuelData.getPrice(stateName);

return{

fillColor:getColor(price,stats),
weight:1.5,
color:"#ffffff",
fillOpacity: price ? 0.9 : 0.2

};

},

onEachFeature:(feature,layer)=>{

const rawName =
feature.properties.shapeName ||
feature.properties.state ||
feature.properties.NAME_1 ||
"";

const stateName = Config.resolveStateName(rawName);

const price = FuelData.getPrice(stateName);

const rank = FuelData.getRank(stateName);

const stateData = FuelData.getStateData(stateName);



layer.on({

mouseover:(e)=>{

const target = e.target;

target.setStyle({
weight:3,
color:"#222",
fillOpacity:0.95
});

target.bringToFront();

if(refineryLayer){
refineryLayer.bringToFront();
}

UI.showHover(stateName,price,rank);

},

mouseout:(e)=>{

statesLayer.resetStyle(e.target);

UI.hideHover();

},

click:()=>{

UI.showDetail(
stateName,
price,
rank,
stateData,
stats
);

}

});

}

}).addTo(map);



if(statesLayer.getBounds().isValid()){
map.fitBounds(statesLayer.getBounds(),{
padding:[15,15]
});
}



addLegend(stats);

}



async function renderRefineries(url){

try{

const res = await fetch(url);

const data = await res.json();

const icon = L.divIcon({
className:"refinery-marker",
html:'<div class="refinery-dot"></div>',
iconSize:[14,14],
iconAnchor:[7,7]
});

refineryLayer = L.geoJSON(data,{

pointToLayer:(feature,latlng)=>{
return L.marker(latlng,{icon});
},

onEachFeature:(feature,layer)=>{

const p = feature.properties;

layer.bindPopup(
`<div style="font-family:system-ui;min-width:220px">

<strong>${p.name}</strong><br>
<span style="color:#666;font-size:12px">${p.location}</span>

<br><br>

<b>${p.capacity_bpd.toLocaleString()}</b> barrels/day

<br>

<span style="color:${p.status==="Operational" ? "#27ae60" : "#e67e22"}">
${p.status}
</span>

<br><br>

<span style="font-size:12px;color:#555">
${p.description}
</span>

</div>`,
{maxWidth:280}
);

}

}).addTo(map);

}catch(err){

console.error("Refinery layer error",err);

}

}



function addLegend(stats){

if(legend){
map.removeControl(legend);
}

legend = L.control({
position:"bottomleft"
});

legend.onAdd = function(){

const div = L.DomUtil.create("div","legend");

let html =
'<b style="font-size:11px;display:block;margin-bottom:6px">PMS Price (₦/L)</b>';

html +=
'<div style="display:flex;height:10px;border-radius:3px;overflow:hidden">';

Config.CHOROPLETH.forEach(c=>{
html += `<span style="flex:1;background:${c}"></span>`;
});

html += "</div>";

html +=
`<div style="display:flex;justify-content:space-between;font-size:10px;color:#666;margin-top:4px">
<span>₦${Math.round(stats.min)}</span>
<span>₦${Math.round(stats.max)}</span>
</div>`;

div.innerHTML = html;

return div;

};

legend.addTo(map);

}



function toggleRefineries(state){

if(!refineryLayer || !map) return;

if(state){
map.addLayer(refineryLayer);
}else{
map.removeLayer(refineryLayer);
}

}



return{
init,
loadBoundaries,
renderChoropleth,
renderRefineries,
toggleRefineries
};

})();
