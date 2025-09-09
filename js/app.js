/* Map logic */
mapboxgl.accessToken = window.MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [153.0260, -27.4705], // Brisbane-ish default
  zoom: 9
});

map.addControl(new mapboxgl.NavigationControl(), 'top-right');
map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

async function loadData() {
  const res = await fetch('data/mowing.json', {cache: 'no-store'});
  if (!res.ok) { console.error('Fetch error', res.status, res.statusText); throw new Error('Failed to load data/mowing.json'); }
  const gj = await res.json();
  return gj;
}

// Create a color ramp for AnnualRotations (1..10+)
function getColorStops(uniqueValues) {
  // Default palette of 10 categories (colorblind friendly-ish)
  const palette = [
    '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd',
    '#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf'
  ];
  const sorted = [...uniqueValues].sort((a,b)=>a-b);
  const stops = sorted.map((v, i) => [v, palette[i % palette.length]]);
  return stops;
}

function buildStepExpression(stops) {
  // Build a piecewise match-like expression for categorical numeric values
  // ["case", ["==", ["get","AnnualRotations"], value], color, ..., default]
  const expr = ["case"];
  for (const [v, color] of stops) {
    expr.push(["==", ["get","AnnualRotations"], v], color);
  }
  expr.push("#cccccc"); // default fallback
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
  // FeatureCollection bbox
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
  // Circle layer for points
  if (!map.getSource('mowing')) {
    map.addSource('mowing', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: allFeatures }
    });
  }

  const colorExpr = buildStepExpression(stops);

  // Points
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

  // Lines
  if (!map.getLayer('mowing-lines')) {
    map.addLayer({
      id: 'mowing-lines',
      type: 'line',
      source: 'mowing',
      filter: ["any", ["==", ["geometry-type"], "LineString"], ["==", ["geometry-type"], "MultiLineString"]],
      paint: {
        'line-width': 3,
        'line-color': colorExpr
      }
    });
  }

  // Polygons
  if (!map.getLayer('mowing-fills')) {
    map.addLayer({
      id: 'mowing-fills',
      type: 'fill',
      source: 'mowing',
      filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
      paint: {
        'fill-color': colorExpr,
        'fill-opacity': 0.5
      }
    });
  }
  if (!map.getLayer('mowing-outline')) {
    map.addLayer({
      id: 'mowing-outline',
      type: 'line',
      source: 'mowing',
      filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
      paint: {
        'line-color': '#222',
        'line-width': 0.5
      }
    });
  }

  // Popups
  const layersForPopup = ['mowing-circles','mowing-lines','mowing-fills'];
  for (const lid of layersForPopup) {
    map.on('click', lid, (e) => {
      const f = e.features[0];
      const p = f.properties || {};
      const mowingID = p.MowingID ?? p.mowingid ?? p.mowingId ?? 'N/A';
      const cuts = Number(p.AnnualRotations ?? p.cutsperyear ?? p.cuts ?? NaN);
      const html = `
        <div style="font-size:13px;">
          <div><strong>MowingID:</strong> ${mowingID}</div>
          <div><strong>AnnualRotations:</strong> ${isNaN(cuts) ? 'N/A' : cuts}</div>
        </div>`;
      new mapboxgl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
    });
    map.on('mouseenter', lid, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', lid, () => map.getCanvas().style.cursor = '');
  }
}

function populateCutsFilter(uniqueCuts) {
  const sel = document.getElementById('cutsFilter');
  sel.innerHTML = '<option value="ALL" selected>All</option>';
  [...uniqueCuts].sort((a,b)=>a-b).forEach(v => {
    const o = document.createElement('option');
    o.value = String(v);
    o.textContent = String(v);
    sel.appendChild(o);
  });
}

// Filter logic
function applyFilters() {
  const sel = document.getElementById('cutsFilter').value;
  let filterExpr = true;
  if (sel !== 'ALL') {
    const asNum = Number(sel);
    filterExpr = ["==", ["to-number", ["get","AnnualRotations"]], asNum];
  } else {
    filterExpr = true;
  }
  const layers = ['mowing-circles','mowing-lines','mowing-fills','mowing-outline'];
  for (const lid of layers) {
    if (map.getLayer(lid)) {
      map.setFilter(lid, filterExpr === true ? null : filterExpr);
    }
  }
}


function searchByMowingID(id) {
  if (!id) return;
  const q = id.trim().toLowerCase();

  function normalize(val) {
    if (!val) return '';
    return val.toString().trim().toLowerCase();
  }

  function padMowingId(m) {
    // If M312 entered, try pad to M0312
    const match = /^m(\d{1,4})$/i.exec(m);
    if (match) {
      return 'm' + match[1].padStart(4, '0');
    }
    return m;
  }

  const queryNorm = padMowingId(q);

  let match = allFeatures.find(f => {
    const p = f.properties || {};
    // Try different casing keys
    const candidates = [
      p.MowingID, p.mowingid, p.mowingId, p.MOWINGID
    ];
    for (const c of candidates) {
      const val = normalize(c);
      if (val === queryNorm || val === q) return true;
    }
    // Fallback: search across all properties
    for (const key in p) {
      const val = normalize(p[key]);
      if (val.includes(queryNorm) || val.includes(q)) return true;
    }
    return false;
  });

  if (match && match.geometry) {
    const geom = match.geometry;
    if (geom.type === 'Point') {
      map.flyTo({center: geom.coordinates, zoom: 15});
      new mapboxgl.Popup()
        .setLngLat(geom.coordinates)
        .setHTML(`<strong>MowingID: </strong>${match.properties.MowingID || 'N/A'}<br><strong>AnnualRotations:</strong> ${match.properties.AnnualRotations ?? 'N/A'}`)
        .addTo(map);
    } else {
      const b = computeBbox([match]);
      if (b) map.fitBounds(b, {padding: 60, duration: 900});
    }
  } else {
    alert('No feature found with that MowingID.');
  }
}
  } else {
    alert('No feature found with that MowingID.');
  }
}

(async function init() {
  try {
    const gj = await loadData();
    if (gj.type !== 'FeatureCollection') throw new Error('Data must be a GeoJSON FeatureCollection');
    allFeatures = gj.features ?? [];
    bbox = computeBbox(allFeatures);
    if (bbox) map.fitBounds(bbox, {padding: 60, duration: 0});

    // Normalize AnnualRotations to numeric and collect uniques
    const uniq = new Set();
    for (const f of allFeatures) {
      const p = f.properties || {};
      let c = p.AnnualRotations ?? p.cutsperyear ?? p.cuts;
      if (c !== undefined && c !== null && c !== '') {
        const n = Number(c);
        if (!isNaN(n)) {
          p.AnnualRotations = n; // normalize
          uniq.add(n);
        }
      }
    }

    const fixedCuts = new Set([15,18]);
    const stops = getColorStops(fixedCuts);
    buildLegend(stops);
    populateCutsFilter(new Set([15,18]));

    map.on('load', () => addLayers(stops));
  } catch (err) {
    console.error(err);
    alert('Error loading data: ' + err.message);
  }

  // UI bindings
  document.getElementById('searchBtn').addEventListener('click', () => {
    const q = document.getElementById('searchInput').value;
    searchByMowingID(q);
  });
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchByMowingID(e.target.value);
    }
  });
  document.getElementById('cutsFilter').addEventListener('change', applyFilters);
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('cutsFilter').value = 'ALL';
    applyFilters();
    if (bbox) map.fitBounds(bbox, {padding: 60});
  });
})();
