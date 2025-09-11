// Configuration
const GOOGLE_API_KEY = "AIzaSyCty1PqfaRyZLd7X5TTdT3dDiAdF57lWh8";
const GEOJSON_PATH = "data.geojson";

// Initialize map
const map = L.map('map').setView([-33.86, 151.2094], 12);

// Google Satellite layer
const googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=' + GOOGLE_API_KEY, {
  maxZoom: 20,
  attribution: 'Map data © Google'
}).addTo(map);

L.control.scale().addTo(map);

// Utilities
function propSummary(props){
  if(!props) return '';
  return Object.keys(props).map(k => '<strong>'+k+':</strong> '+props[k]).join('<br/>');
}

let featureIndex = [];

// Load GeoJSON
fetch(GEOJSON_PATH)
  .then(res => res.json())
  .then(gj => processGeoJSON(gj))
  .catch(err => {
    alert('Failed to load GeoJSON: ' + err);
    console.error(err);
  });

function processGeoJSON(gj){
  const featuresLayer = L.geoJSON(gj, {
    style: featureStyle,
    onEachFeature: (feature, layer) => {
      const props = feature.properties || {};
      layer.bindPopup(propSummary(props));
      // Index IDs
      let idVal = null;
      for(const k of Object.keys(props)){
        if(k.toLowerCase().includes('unique') || k.toLowerCase().includes('mowing') || k.toLowerCase().includes('id')){
          idVal = props[k]; break;
        }
      }
      if(!idVal){
        for(const fk of ['Unique ID','MowingID']) if(props[fk]){idVal = props[fk]; break;}
      }
      const bounds = layer.getBounds ? layer.getBounds() : layer.getLatLng ? L.latLngBounds(layer.getLatLng(), layer.getLatLng()) : null;
      featureIndex.push({idVal, props, layer, bounds});
    }
  }).addTo(map);

  try{
    const allBounds = featuresLayer.getBounds();
    if(allBounds.isValid()) map.fitBounds(allBounds.pad(0.1));
  }catch(e){console.warn(e);}
}

// Style features
function featureStyle(feature){
  const props = feature.properties || {};
  const val = props['CutsPerYear'] || props['AnnualRotations'];
  let color = '#3388ff';
  if(val !== undefined){
    const n = Number(val);
    if(!isNaN(n)){
      if(n <= 15) color = '#2ecc71';
      else if(n <= 18) color = '#3498db';
      else color = '#f1c40f';
    }
  }
  return { color, weight:2, opacity:0.9 };
}

// Search
const input = document.getElementById('searchBox');
const suggestions = document.getElementById('suggestions');
input.addEventListener('input', onSearchInput);
input.addEventListener('keydown', e => {
  if(e.key==='Enter'){
    e.preventDefault();
    executeSearch(input.value.trim());
  }
});

function onSearchInput(e){
  const q = e.target.value.trim();
  if(!q){suggestions.classList.add('hidden'); return;}
  const results = fuzzyFind(q, 8);
  suggestions.innerHTML = results.map(r=>'<div class="suggestion-item" data-id="'+r.idVal+'">'+r.idVal+'</div>').join('');
  suggestions.classList.remove('hidden');
  suggestions.querySelectorAll('.suggestion-item').forEach(el=>{
    el.addEventListener('click', ()=>{input.value=el.dataset.id; suggestions.classList.add('hidden'); executeSearch(el.dataset.id);});
  });
}

function executeSearch(q){
  if(!q) return;
  const exact = featureIndex.find(fi => fi.idVal && fi.idVal.toLowerCase()===q.toLowerCase());
  if(exact) return zoomToFeature(exact);
  const substr = featureIndex.filter(fi => fi.idVal && fi.idVal.toLowerCase().includes(q.toLowerCase()));
  if(substr.length===1) return zoomToFeature(substr[0]);
  if(substr.length>1){return;}
  const cand = fuzzyFind(q, 1);
  if(cand.length) zoomToFeature(cand[0]);
}

function zoomToFeature(fi){
  if(fi.bounds && fi.bounds.isValid && fi.bounds.isValid()) map.fitBounds(fi.bounds.pad(0.6));
  else if(fi.layer && fi.layer.getLatLng) map.setView(fi.layer.getLatLng(), 18);
  fi.layer.openPopup();
}

function fuzzyFind(q, limit){
  const ql=q.toLowerCase();
  const scored=[];
  for(const fi of featureIndex){
    if(!fi.idVal) continue;
    const id=fi.idVal.toLowerCase();
    if(id.includes(ql)) scored.push({score:1,idVal:fi.idVal,fi});
    else scored.push({score:levenshtein(ql,id),idVal:fi.idVal,fi});
  }
  scored.sort((a,b)=>a.score-b.score);
  return scored.slice(0,limit).map(s=>s.fi);
}

function levenshtein(a,b){
  if(a.length===0) return b.length;
  if(b.length===0) return a.length;
  const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)m[i][0]=i;
  for(let j=0;j<=b.length;j++)m[0][j]=j;
  for(let i=1;i<=a.length;i++){
    for(let j=1;j<=b.length;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+cost);
    }
  }
  return m[a.length][b.length];
}
