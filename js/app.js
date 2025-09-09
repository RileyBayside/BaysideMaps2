/* Map logic */
mapboxgl.accessToken = window.MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [153.0260, -27.4705],
  zoom: 9
});

map.addControl(new mapboxgl.NavigationControl(), 'top-right');
map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

async function loadData() {
  const res = await fetch('data/mowing.json', {cache: 'no-store'});
  if (!res.ok) {
    console.error('Fetch error', res.status, res.statusText);
    throw new Error('Failed to load data/mowing.json');
  }
  return await res.json();
}

function getColorStops(values) {
  const palette = ['#1f77b4','#d62728']; // two fixed colors for 15 and 18
  const sorted = [...values].sort((a,b)=>a-b);
  return sorted.map((v,i)=>[v, palette[i % palette.length]]);
}

function buildStepExpression(stops) {
  const expr = ["case"];
  for (const [v, color] of stops) {
    expr.push(["==", ["get","AnnualRotations"], v], color);
  }
  expr.push("#cccccc");
  return expr;
}

function buildLegend(stops) {
  const ul = document.getElementById('legendList');
  ul.innerHTML = '';
  for (const [v, color] of stops) {
    const li = document.createElement('li');
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = color;
    li.appendChild(sw);
    li.appendChild(document.createTextNode(` ${v}`));
    ul.appendChild(li);
  }
}

let allFeatures = [];
let bbox;

function computeBbox(features) {
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  for (const f of features) {
    const geom = f.geometry;
    if (!geom) continue;
    const coords = geom.type === 'Point' ? [geom.coordinates]
      : geom.type === 'MultiPoint' ? geom.coordinates
      : geom.type === 'LineString' ? geom.coordinates
      : geom.type === 'MultiLineString' ? geom.coordinates.flat()
      : geom.type === 'Polygon' ? geom.coordinates.flat()
      : geom.type === 'MultiPolygon' ? geom.coordinates.flat(2)
      : [];
    for (const [x,y] of coords) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (minX === Infinity) return null;
  return [[minX, minY], [maxX, maxY]];
}

function addLayers(stops) {
  if (!map.getSource('mowing')) {
    map.addSource('mowing', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: allFeatures }
    });
  }

  const colorExpr = buildStepExpression(stops);

  if (!map.getLayer('mowing-circles')) {
    map.addLayer({
      id: 'mowing-circles',
      type: 'circle',
      source: 'mowing',
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        'circle-radius': 6,
        'circle-color': colorExpr,
        'circle-stroke-color': '#111',
        'circle-stroke-width': 0.5
      }
    });
  }

  if (!map.getLayer('mowing-lines')) {
    map.addLayer({
      id: 'mowing-lines',
      type: 'line',
      source: 'mowing',
      filter: ["any", ["==", ["geometry-type"], "LineString"], ["==", ["geometry-type"], "MultiLineString"]],
      paint: {'line-width': 3,'line-color': colorExpr}
    });
  }

  if (!map.getLayer('mowing-fills')) {
    map.addLayer({
      id: 'mowing-fills',
      type: 'fill',
      source: 'mowing',
      filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
      paint: {'fill-color': colorExpr,'fill-opacity': 0.5}
    });
  }
  if (!map.getLayer('mowing-outline')) {
    map.addLayer({
      id: 'mowing-outline',
      type: 'line',
      source: 'mowing',
      filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
      paint: {'line-color': '#222','line-width': 0.5}
    });
  }

  const layersForPopup = ['mowing-circles','mowing-lines','mowing-fills'];
  for (const lid of layersForPopup) {
    map.on('click', lid, (e) => {
      const f = e.features[0];
      const p = f.properties || {};
      const mowingID = p.MowingID ?? p.mowingid ?? 'N/A';
      const val = p.AnnualRotations ?? 'N/A';
      const html = `<div style="font-size:13px;">
        <div><strong>MowingID:</strong> ${mowingID}</div>
        <div><strong>Annual Rotations:</strong> ${val}</div>
      </div>`;
      new mapboxgl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
    });
    map.on('mouseenter', lid, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', lid, () => map.getCanvas().style.cursor = '');
  }
}

function populateFilter() {
  const sel = document.getElementById('rotationsFilter');
  sel.innerHTML = '<option value="ALL" selected>All</option>';
  [15,18].forEach(v => {
    const o = document.createElement('option');
    o.value = String(v);
    o.textContent = String(v);
    sel.appendChild(o);
  });
}

function applyFilters() {
  const sel = document.getElementById('rotationsFilter').value;
  let filterExpr = true;
  if (sel !== 'ALL') {
    const asNum = Number(sel);
    filterExpr = ["==", ["to-number", ["get","AnnualRotations"]], asNum];
  } else {
    filterExpr = true;
  }
  ['mowing-circles','mowing-lines','mowing-fills','mowing-outline'].forEach(lid=>{
    if (map.getLayer(lid)) {
      map.setFilter(lid, filterExpr===true?null:filterExpr);
    }
  });
}

function searchByMowingID(id) {
  if (!id) return;
  const q = id.trim().toLowerCase();
  function normalize(val){return val?val.toString().trim().toLowerCase():'';}
  function padMowingId(m){const match=/^m(\d{1,4})$/i.exec(m);return match?'m'+match[1].padStart(4,'0'):m;}
  const queryNorm=padMowingId(q);

  let match=allFeatures.find(f=>{
    const p=f.properties||{};
    const candidates=[p.MowingID,p.mowingid,p.MOWINGID];
    for(const c of candidates){
      if(normalize(c)===queryNorm||normalize(c)===q)return true;
    }
    for(const key in p){
      if(normalize(p[key]).includes(queryNorm)||normalize(p[key]).includes(q))return true;
    }
    return false;
  });

  if(match&&match.geometry){
    const geom=match.geometry;
    if(geom.type==='Point'){
      map.flyTo({center:geom.coordinates,zoom:15});
      new mapboxgl.Popup().setLngLat(geom.coordinates)
        .setHTML(`<strong>MowingID: </strong>${match.properties.MowingID||'N/A'}<br><strong>Annual Rotations:</strong> ${match.properties.AnnualRotations??'N/A'}`)
        .addTo(map);
    } else {
      const b=computeBbox([match]);
      if(b)map.fitBounds(b,{padding:60,duration:900});
    }
  } else {alert('No feature found with that MowingID.');}
}

(async function init(){
  try{
    const gj=await loadData();
    allFeatures=gj.features??[];
    bbox=computeBbox(allFeatures);
    if(bbox)map.fitBounds(bbox,{padding:60,duration:0});

    // normalize AnnualRotations
    allFeatures.forEach(f=>{
      const p=f.properties||{};
      if(p.AnnualRotations!==undefined){
        const n=Number(p.AnnualRotations);
        if(!isNaN(n))p.AnnualRotations=n;
      }
    });

    const stops=getColorStops(new Set([15,18]));
    buildLegend(stops);
    populateFilter();
    map.on('load',()=>addLayers(stops));
  }catch(err){console.error(err);alert('Error loading data: '+err.message);}

  document.getElementById('searchBtn').addEventListener('click',()=>{
    searchByMowingID(document.getElementById('searchInput').value);
  });
  document.getElementById('searchInput').addEventListener('keydown',e=>{
    if(e.key==='Enter')searchByMowingID(e.target.value);
  });
  document.getElementById('rotationsFilter').addEventListener('change',applyFilters);
  document.getElementById('resetBtn').addEventListener('click',()=>{
    document.getElementById('searchInput').value='';
    document.getElementById('rotationsFilter').value='ALL';
    applyFilters();
    if(bbox)map.fitBounds(bbox,{padding:60});
  });
})();
