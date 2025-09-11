// Configuration
const GOOGLE_API_KEY = "AIzaSyCty1PqfaRyZLd7X5TTdT3dDiAdF57lWh8"; // supplied by user
const KML_PATH = "data.kml"; // relative path inside the ZIP

// Initialize map
const map = L.map('map').setView([-33.86, 151.2094], 12); // default to Sydney; will fit to data when loaded

// Google Satellite tile layer (may require valid billing/API settings)
const googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=' + GOOGLE_API_KEY, {
  maxZoom: 20,
  subdomains: ['mt0','mt1','mt2','mt3'],
  attribution: 'Map data © Google'
}).addTo(map);

// Add a scale
L.control.scale().addTo(map);

// Utility: simple popup content generator
function propSummary(props){
  if(!props) return '';
  let lines = [];
  for(const k of Object.keys(props)){
    lines.push('<strong>'+k+':</strong> ' + props[k]);
  }
  return lines.join('<br/>');
}

// Load KML and convert to GeoJSON using togeojson
fetch(KML_PATH)
  .then(res => res.text())
  .then(kmlText => {
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmlText, 'text/xml');
    const gj = toGeoJSON.kml(kml);
    processGeoJSON(gj);
  })
  .catch(err => {
    alert('Failed to load KML file: ' + err);
    console.error(err);
  });

let featuresLayer;
let featureIndex = []; // [{idVal, feature, layer, props, bbox}]

// Process GeoJSON: add to map and build search index
function processGeoJSON(gj){
  featuresLayer = L.geoJSON(gj, {
    style: featureStyle,
    onEachFeature: function(feature, layer){
      let props = feature.properties || {};
      const popupHtml = propSummary(props);
      layer.bindPopup(popupHtml);
      // Build index entries for Unique ID and MowingID (case-insensitive)
      const possibleKeys = ['UniqueID','Unique Id','Unique Id.','Unique_ID','Unique Id ','Unique ID ','Unique Id.','Unique Ids','MowingID','Mowing ID','Mowing_ID','MowingId','Mowingid','Mowing Id.','Mowing-ID','Unique ID Name'];
      let idCandidates = [];
      for(const k of Object.keys(props)){
        if(k.toLowerCase().includes('unique') || k.toLowerCase().includes('mowing') || k.toLowerCase().includes('id')){
          idCandidates.push(k);
        }
      }
      // pick values from candidates
      let idVal = null;
      for(const k of idCandidates){
        const v = props[k];
        if(v && typeof v === 'string' && v.trim().length>0){
          idVal = v.trim();
          break;
        }
      }
      // if none found, attempt common property names
      if(!idVal){
        const fallbacks = ['Unique ID','MowingID','UniqueID','Mowing Id','Mowing ID'];
        for(const fk of fallbacks){
          if(props[fk]){ idVal = String(props[fk]); break; }
        }
      }
      // store in index
      const bounds = layer.getBounds ? layer.getBounds() : layer.getLatLng ? L.latLngBounds(layer.getLatLng(), layer.getLatLng()) : null;
      featureIndex.push({
        idVal: idVal || null,
        props: props,
        layer: layer,
        bounds: bounds
      });
    }
  }).addTo(map);

  // try to fit to data bounds
  try{
    const allBounds = featuresLayer.getBounds();
    if(allBounds.isValid()){
      map.fitBounds(allBounds.pad(0.1));
    }
  }catch(e){
    console.warn('Could not fit to bounds', e);
  }
}

// Simple style: attempt to color by CutsPerYear or CutsPerY or AnnualRotations
function featureStyle(feature){
  const props = feature.properties || {};
  const val = props['CutsPerYear'] || props['Cuts Per Year'] || props['CutsPerYr'] || props['AnnualRotations'] || props['Annual Rotations'] || props['Annual'] ;
  let color = '#3388ff';
  if(val !== undefined){
    const n = Number(val);
    if(!isNaN(n)){
      if(n <= 15) color = '#2ecc71'; // green
      else if(n <= 18) color = '#3498db'; // blue
      else color = '#f1c40f'; // yellow
    }
  }
  return { color: color, weight: 2, opacity: 0.9 };
}

// SEARCH / Suggestions
const input = document.getElementById('searchBox');
const suggestions = document.getElementById('suggestions');

input.addEventListener('input', onSearchInput);
input.addEventListener('keydown', function(e){
  if(e.key === 'Enter'){
    e.preventDefault();
    const val = input.value.trim();
    if(val) executeSearch(val);
  }
});

function onSearchInput(e){
  const q = e.target.value.trim();
  if(!q){
    suggestions.innerHTML = '';
    suggestions.classList.add('hidden');
    return;
  }
  const results = fuzzyFind(q, 8); // top 8 suggestions
  if(results.length === 0){
    suggestions.innerHTML = '<div class="suggestion-item">No matches found</div>';
    suggestions.classList.remove('hidden');
    return;
  }
  suggestions.innerHTML = results.map(r => {
    const id = r.idVal || '(no id)';
    const title = id + (r.props && r.props['Name'] ? ' — ' + r.props['Name'] : '');
    return '<div class="suggestion-item" data-id="'+escapeHtml(id)+'">'+escapeHtml(title)+'</div>';
  }).join('');
  suggestions.classList.remove('hidden');

  // add click handlers
  Array.from(suggestions.querySelectorAll('.suggestion-item')).forEach(el=>{
    el.addEventListener('click', () => {
      const rawId = el.getAttribute('data-id');
      input.value = rawId;
      suggestions.classList.add('hidden');
      executeSearch(rawId);
    });
  });
}

// Escape HTML for safety
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]; });
}

// Execute exact (case-insensitive) or fuzzy search and zoom
function executeSearch(q){
  if(!q) return;
  // try exact case-insensitive match first
  const exact = featureIndex.find(fi => fi.idVal && fi.idVal.toLowerCase() === q.toLowerCase());
  if(exact){
    zoomToFeature(exact);
    return;
  }
  // try substring match
  const substr = featureIndex.filter(fi => fi.idVal && fi.idVal.toLowerCase().includes(q.toLowerCase()));
  if(substr.length === 1){
    zoomToFeature(substr[0]);
    return;
  } else if(substr.length > 1){
    // show suggestion list
    suggestions.innerHTML = substr.map(r => {
      const id = r.idVal || '(no id)';
      const title = id + (r.props && r.props['Name'] ? ' — ' + r.props['Name'] : '');
      return '<div class="suggestion-item" data-id="'+escapeHtml(id)+'">'+escapeHtml(title)+'</div>';
    }).join('');
    suggestions.classList.remove('hidden');
    Array.from(suggestions.querySelectorAll('.suggestion-item')).forEach(el=>{
      el.addEventListener('click', () => {
        const rawId = el.getAttribute('data-id');
        input.value = rawId;
        suggestions.classList.add('hidden');
        executeSearch(rawId);
      });
    });
    return;
  }

  // no substring matches — compute fuzzy (Levenshtein distance) suggestions
  const cand = fuzzyFind(q, 6);
  if(cand.length > 0){
    suggestions.innerHTML = '<div style="padding:8px 10px;font-weight:600;">Did you mean:</div>' + cand.map(r => {
      const id = r.idVal || '(no id)';
      const title = id + (r.props && r.props['Name'] ? ' — ' + r.props['Name'] : '');
      return '<div class="suggestion-item" data-id="'+escapeHtml(id)+'">'+escapeHtml(title)+'</div>';
    }).join('');
    suggestions.classList.remove('hidden');
    Array.from(suggestions.querySelectorAll('.suggestion-item')).forEach(el=>{
      el.addEventListener('click', () => {
        const rawId = el.getAttribute('data-id');
        input.value = rawId;
        suggestions.classList.add('hidden');
        executeSearch(rawId);
      });
    });
    return;
  }

  // nothing found
  alert('No features matched "' + q + '"');
}

// Zoom to feature and open popup
function zoomToFeature(fi){
  if(!fi) return;
  if(fi.bounds && fi.bounds.isValid && fi.bounds.isValid()){
    map.fitBounds(fi.bounds.pad(0.6));
  } else if(fi.layer && fi.layer.getLatLng){
    const ll = fi.layer.getLatLng();
    map.setView(ll, 18);
  }
  // open popup
  try{
    fi.layer.openPopup();
  }catch(e){
    console.warn('Could not open popup', e);
  }
}

// Simple fuzzy find using substring scoring and Levenshtein when needed
function fuzzyFind(q, limit){
  const qlow = q.toLowerCase();
  const scored = [];
  for(const fi of featureIndex){
    if(!fi.idVal) continue;
    const id = String(fi.idVal);
    const idlow = id.toLowerCase();
    if(idlow === qlow){
      scored.push({score:0, idVal: id, props: fi.props, fi:fi});
      continue;
    }
    if(idlow.includes(qlow)){
      scored.push({score:1, idVal: id, props: fi.props, fi:fi});
      continue;
    }
    const dist = levenshtein(qlow, idlow);
    scored.push({score: 10 + dist, idVal: id, props: fi.props, fi:fi});
  }
  scored.sort((a,b)=>a.score - b.score);
  return scored.slice(0, limit).map(s => ({idVal: s.idVal, props: s.props, fi: s.fi}));
}

// Levenshtein implementation (works on small strings)
function levenshtein(a,b){
  if(a.length === 0) return b.length;
  if(b.length === 0) return a.length;
  const matrix = Array.from({length: a.length+1}, () => new Array(b.length+1));
  for(let i=0;i<=a.length;i++) matrix[i][0]=i;
  for(let j=0;j<=b.length;j++) matrix[0][j]=j;
  for(let i=1;i<=a.length;i++){
    for(let j=1;j<=b.length;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i-1][j]+1,
        matrix[i][j-1]+1,
        matrix[i-1][j-1]+cost
      );
    }
  }
  return matrix[a.length][b.length];
}

// Close suggestions when clicking outside
document.addEventListener('click', function(e){
  if(!document.getElementById('controls').contains(e.target)){
    suggestions.classList.add('hidden');
  }
});
