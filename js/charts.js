const Charts = (() => {

const instances = {};

const FONT = "system-ui,-apple-system,sans-serif";

const TOOLTIP = {
backgroundColor:"#1a1a2e",
titleColor:"#fff",
bodyColor:"#ddd",
padding:10,
titleFont:{family:FONT},
bodyFont:{family:FONT}
};

function destroy(key){
if(instances[key]){
instances[key].destroy();
delete instances[key];
}
}


function zoneBar(id){

destroy("zoneBar");

const canvas=document.getElementById(id);
if(!canvas) return;

const zones=FuelData.getZoneAverages();
if(!zones?.length) return;

const colors=[
"#c0392b",
"#e74c3c",
"#e67e22",
"#f1c40f",
"#2ecc71",
"#27ae60"
];

instances.zoneBar=new Chart(canvas,{
type:"bar",

data:{
labels:zones.map(z=>z.zone),
datasets:[{
data:zones.map(z=>z.avg),
backgroundColor:colors.slice(0,zones.length),
borderRadius:5,
borderWidth:0,
barPercentage:0.6
}]
},

options:{
responsive:true,
maintainAspectRatio:false,
indexAxis:"y",

plugins:{
legend:{display:false},
tooltip:{
...TOOLTIP,
callbacks:{
label:(ctx)=>{
const z=zones[ctx.dataIndex];
return ` ₦${Math.round(z.avg)}/L (${z.count} states)`;
}
}
}
},

scales:{
x:{
grid:{color:"#f0f0f0"},
ticks:{
font:{family:FONT,size:11},
callback:v=>`₦${v}`
}
},

y:{
grid:{display:false},
ticks:{
font:{family:FONT,size:12,weight:"600"},
color:"#333"
}
}
}

}

});

}



function zonePie(id){

destroy("zonePie");

const canvas=document.getElementById(id);
if(!canvas) return;

const zones=FuelData.getZoneAverages();
if(!zones?.length) return;

const colors=[
"#c0392b",
"#e67e22",
"#f1c40f",
"#2ecc71",
"#27ae60",
"#3498db"
];

instances.zonePie=new Chart(canvas,{
type:"pie",

data:{
labels:zones.map(z=>z.zone),

datasets:[{
data:zones.map(z=>z.avg),
backgroundColor:colors.slice(0,zones.length),
borderColor:"#ffffff",
borderWidth:2
}]
},

options:{
responsive:true,
maintainAspectRatio:false,

plugins:{

legend:{
position:"bottom",
labels:{
font:{family:FONT,size:11},
padding:14,
usePointStyle:true
}
},

tooltip:{
...TOOLTIP,
callbacks:{
label:(ctx)=>{
const z=zones[ctx.dataIndex];
return `${z.zone}: ₦${Math.round(z.avg)}/L avg`;
}
}
}

}

}

});

}



function stateChart(id,data){

destroy("state");

const canvas=document.getElementById(id);
if(!canvas) return;

const sorted=[...data].sort((a,b)=>a.price-b.price);

const stats=FuelData.getStats();

const colors=sorted.map(d=>{

if(!stats) return "#888";

const ratio=(d.price-stats.min)/(stats.max-stats.min);

const idx=Math.min(
Math.floor(ratio*Config.CHOROPLETH.length),
Config.CHOROPLETH.length-1
);

return Config.CHOROPLETH[idx];

});

instances.state=new Chart(canvas,{

type:"bar",

data:{
labels:sorted.map(d=>d.state),

datasets:[{
data:sorted.map(d=>d.price),
backgroundColor:colors,
borderRadius:4,
borderWidth:0,
barPercentage:0.75
}]
},

options:{

responsive:true,
maintainAspectRatio:false,
indexAxis:"y",

plugins:{

legend:{display:false},

tooltip:{
...TOOLTIP,

callbacks:{

title:(items)=>items[0]?.label,

label:(ctx)=>{
const d=sorted[ctx.dataIndex];

return [
` ₦${d.price.toFixed(2)}/L`,
` Zone: ${d.zone}`,
` Rank: ${ctx.dataIndex+1} of ${sorted.length}`
];
}

}

}

},

scales:{

x:{
grid:{color:"#f0f0f0"},
ticks:{
font:{family:FONT,size:10},
callback:v=>`₦${v}`
}
},

y:{
grid:{display:false},
ticks:{
font:{family:FONT,size:10},
color:"#444"
}
}

}

},

plugins:[{

id:"avgLine",

afterDraw(chart){

if(!stats) return;

const ctx=chart.ctx;
const x=chart.scales.x.getPixelForValue(stats.avg);
const y=chart.scales.y;

ctx.save();

ctx.strokeStyle="#c0392b";
ctx.lineWidth=1.5;
ctx.setLineDash([5,3]);

ctx.beginPath();
ctx.moveTo(x,y.top);
ctx.lineTo(x,y.bottom);
ctx.stroke();

ctx.fillStyle="#c0392b";
ctx.font=`600 10px ${FONT}`;
ctx.textAlign="center";
ctx.fillText(`Avg ₦${Math.round(stats.avg)}`,x,y.top-5);

ctx.restore();

}

}]

});

}



function comparison(id,states){

destroy("comparison");

const canvas=document.getElementById(id);
if(!canvas) return;

const stats=FuelData.getStats();

const items=states.map(s=>FuelData.data.find(d=>d.state===s));

const colors=items.map(d=>{

if(!d || !stats) return "#ccc";

const ratio=(d.price-stats.min)/(stats.max-stats.min);

const idx=Math.min(
Math.floor(ratio*Config.CHOROPLETH.length),
Config.CHOROPLETH.length-1
);

return Config.CHOROPLETH[idx];

});

instances.comparison=new Chart(canvas,{

type:"bar",

data:{
labels:items.map(d=>d.state),

datasets:[

{
label:"PMS Price",
data:items.map(d=>d.price),
backgroundColor:colors,
borderRadius:6,
barPercentage:0.5
},

{
label:"National Average",
data:items.map(()=>stats.avg),
type:"line",
borderColor:"#c0392b",
borderWidth:2,
borderDash:[5,3],
pointRadius:0,
fill:false
}

]

},

options:{

responsive:true,
maintainAspectRatio:false,

plugins:{
legend:{
labels:{
font:{family:FONT,size:11},
usePointStyle:true
}
},
tooltip:{...TOOLTIP}
},

scales:{
x:{
grid:{display:false},
ticks:{
font:{family:FONT,size:13,weight:"700"},
color:"#222"
}
},

y:{
grid:{color:"#f0f0f0"},
ticks:{
font:{family:FONT,size:10},
callback:v=>`₦${v}`
}
}

}

}

});

}


return {
zoneBar,
zonePie,
stateChart,
comparison
};

})();
