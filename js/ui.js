const UI = (() => {

let el = {};

async function init(){

cacheDOM();
bindEvents();
toggleLoader(true);

DashboardMap.init("map");

const data = await FuelData.load();
const geo  = await DashboardMap.loadBoundaries();

if(geo && data.length){
DashboardMap.renderChoropleth(geo,data);
}

await DashboardMap.renderRefineries(Config.REFINERIES_GEOJSON);

if(data.length){

renderStats();
renderInsight();
renderRankCards();
populateSelects();

Charts.zoneBar("zoneChart");
Charts.zonePie("pieChart");
Charts.stateChart("stateChart",data);

}

renderTimeline();

toggleLoader(false);

}


function cacheDOM(){

[
"statAvg",
"statMin",
"statMax",
"statSpread",
"statDate",
"statCount",

"hover",
"hoverName",
"hoverPrice",
"hoverRank",

"detail",
"detailName",
"detailPrice",
"detailRank",
"detailZone",
"detailDate",
"detailVsAvg",

"insight",
"topExpensive",
"topAffordable",
"zoneStrip",

"selA",
"selB",
"compareBtn",
"pdfBtn",

"timeline",
"refineryToggle",
"notifs"

].forEach(id=>{
el[id]=document.getElementById(id);
});

}


function bindEvents(){

on("refineryToggle","change",e=>{
DashboardMap.toggleRefineries(e.target.checked);
});

on("compareBtn","click",doCompare);
on("pdfBtn","click",doPDF);

const closeBtn=document.getElementById("detailClose");
if(closeBtn){
closeBtn.addEventListener("click",()=>{
el.detail.classList.remove("open");
});
}

}


function on(id,ev,fn){

const node=document.getElementById(id);
if(node){
node.addEventListener(ev,fn);
}

}


function toggleLoader(state){

const loader=document.getElementById("loader");
if(loader){
loader.style.display=state?"flex":"none";
}

}



function renderStats(){

const s=FuelData.getStats();
if(!s)return;

set("statAvg",`₦${Math.round(s.avg).toLocaleString()}`);
set("statMin",`₦${Math.round(s.min).toLocaleString()}`);
set("statMax",`₦${Math.round(s.max).toLocaleString()}`);
set("statSpread",`₦${Math.round(s.spread).toLocaleString()}`);
set("statDate",s.date);
set("statCount",`${s.count} states`);

}



function renderInsight(){

const s=FuelData.getStats();
if(!s || !el.insight)return;

const top=s.costliest[0];
const bot=s.cheapest[0];

const diff=Math.round(top.price-bot.price);
const pct=((diff/bot.price)*100).toFixed(1);

const zones=FuelData.getZoneAverages();

el.insight.innerHTML=
`As of <b>${s.date}</b>, <b>${top.state}</b> records the highest PMS price at <b>₦${Math.round(top.price)}/L</b>.  
<b>${bot.state}</b> records the lowest price at <b>₦${Math.round(bot.price)}/L</b>.  
The gap between both states is <b>₦${diff}</b> (${pct}%).  

The <b>${zones[0].zone}</b> zone currently has the highest regional average at <b>₦${zones[0].avg}</b>.  

National average price stands at <b>₦${s.avg}</b> across <b>${s.count}</b> states.`

}



function renderRankCards(){

const s=FuelData.getStats();
if(!s)return;

if(el.topExpensive){

el.topExpensive.innerHTML=
s.costliest.map((d,i)=>{

return `
<div class="rk-row">
<span class="rk-n">${i+1}</span>
<span class="rk-s">${d.state}</span>
<span class="rk-p hi">₦${Math.round(d.price)}</span>
</div>
`

}).join("");

}

if(el.topAffordable){

el.topAffordable.innerHTML=
s.cheapest.map((d,i)=>{

return `
<div class="rk-row">
<span class="rk-n">${i+1}</span>
<span class="rk-s">${d.state}</span>
<span class="rk-p lo">₦${Math.round(d.price)}</span>
</div>
`

}).join("");

}

}



function showHover(name,price,rank){

if(!el.hover)return;

el.hover.classList.add("vis");

set("hoverName",name);

set(
"hoverPrice",
price?`₦${price.toLocaleString(undefined,{maximumFractionDigits:2})}/L`:"—"
);

set("hoverRank",rank?`#${rank}`:"");

}



function hideHover(){

if(el.hover){
el.hover.classList.remove("vis");
}

}



function showDetail(name,price,rank,sd,stats){

if(!el.detail)return;

el.detail.classList.add("open");

set("detailName",name);
set("detailPrice",price?`₦${price}`:"—");
set("detailRank",rank?`${rank} of ${stats.count}`:"—");
set("detailZone",sd?.zone||"—");
set("detailDate",sd?.date||"—");

if(el.detailVsAvg && price){

const diff=price-stats.avg;

el.detailVsAvg.innerHTML=
`<span style="color:${diff>=0?"#c0392b":"#27ae60"};font-weight:700">
${diff>=0?"+":""}₦${Math.abs(Math.round(diff))}
</span> vs national average (₦${Math.round(stats.avg)})`;

}

}



function populateSelects(){

const states=FuelData.getByPrice(true).map(d=>d.state);

["selA","selB"].forEach((id,i)=>{

const s=el[id];
if(!s)return;

s.innerHTML=
'<option value="">Select...</option>'+
states.map(n=>`<option>${n}</option>`).join("");

if(i===0 && states.includes("Lagos")) s.value="Lagos";
if(i===1 && states.includes("Borno")) s.value="Borno";

});

}



function doCompare(){

const selected=["selA","selB"]
.map(id=>el[id]?.value)
.filter(Boolean);

if(selected.length<2){
return notify("Select two states");
}

Charts.comparison("cmpChart",selected);

if(el.pdfBtn){
el.pdfBtn.style.display="inline-block";
}

}



function doPDF(){

if(typeof window.jspdf==="undefined"){
return notify("PDF library not loaded");
}

const jsPDF=window.jspdf.jsPDF;

const sel=["selA","selB"]
.map(id=>el[id]?.value)
.filter(Boolean);

if(sel.length<2){
return notify("Run comparison first");
}

const stats=FuelData.getStats();

const a=FuelData.data.find(d=>d.state===sel[0]);
const b=FuelData.data.find(d=>d.state===sel[1]);

if(!a || !b)return;

const doc=new jsPDF("p","mm","a4");

doc.setFont("helvetica","bold");
doc.setFontSize(18);
doc.text("PMS Price Comparison Report",105,30,{align:"center"});

doc.setFontSize(12);
doc.setFont("helvetica","normal");

doc.text(`${a.state} vs ${b.state}`,105,45,{align:"center"});

doc.text(`Price A: ₦${a.price}`,40,70);
doc.text(`Price B: ₦${b.price}`,40,80);

doc.text(`National Average: ₦${stats.avg}`,40,100);

doc.save(`PMS_${a.state}_${b.state}.pdf`);

}



function renderTimeline(){

if(!el.timeline)return;

el.timeline.innerHTML=
Config.EVENTS.map(e=>{

const color={
critical:"#c0392b",
high:"#e67e22",
medium:"#f1c40f"
}[e.impact]||"#999";

return `
<div class="tl-card">

<div class="tl-head">
<span class="tl-date">${e.date}</span>
<span class="tl-dot" style="background:${color}"></span>
<span class="tl-impact" style="color:${color}">${e.impact}</span>
</div>

<div class="tl-title">${e.title}</div>

<div class="tl-body">
<p>${e.detail}</p>
<span class="tl-src">${e.source}</span>
</div>

</div>
`

}).join("");

}



function set(id,val){
if(el[id]){
el[id].textContent=val;
}
}



function notify(msg){

const area=el.notifs || document.getElementById("notifs");
if(!area)return;

const n=document.createElement("div");
n.className="notif";
n.textContent=msg;

area.appendChild(n);

setTimeout(()=>{
n.style.opacity="0";
setTimeout(()=>n.remove(),300);
},3500);

}



return{
init,
showHover,
hideHover,
showDetail,
notify
};

})();

document.addEventListener("DOMContentLoaded",UI.init);
