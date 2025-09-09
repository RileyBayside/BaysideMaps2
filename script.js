/* global mapboxgl, MAPBOX_TOKEN */
mapboxgl.accessToken = window.MAPBOX_TOKEN;

// Default style
let currentStyle = 'mapbox://styles/mapbox/streets-v12';

// Initialize map
const map = new mapboxgl.Map({
  container: 'map',
  style: currentStyle,
  center: [153.026, -27.469], // Brisbane-ish as a neutral default
  zoom: 9
});

// Add controls
map.addControl(new mapboxgl.NavigationControl(), 'top-left');
map.addControl(new mapboxgl.FullscreenControl(), 'top-left');
map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }));
map.addControl(new mapboxgl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: true
}));

// Style switcher
document.getElementById('styleSelect').addEventListener('change', (e) => {
  currentStyle = e.target.value;
  map.setStyle(currentStyle);
  // Re-add layers after style change
  map.once('styledata', () => addDataLayers());
});

// Fit-to-data button
document.getElementById('fitBtn').addEventListener('click', () => {
  fitToData();
});

// Load and add data layers
async function addDataLayers() {
  // If source already exists (style change), remove old layers/sources safely
  ['mowing-source','mowing-points','mowing-lines','mowing-polys'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('mowing-source')) map.removeSource('mowing-source');

  const response = await fetch('./data/mowing.geojson');
  const geojson = await response.json();

  map.addSource('mowing-source', {
    type: 'geojson',
    data: geojson
  });

  // Points
  map.addLayer({
    id: 'mowing-points',
    type: 'circle',
    source: 'mowing-source',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        5, 3,
        12, 6,
        16, 10
      ],
      'circle-color': '#3b82f6',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1
    }
  });

  // Lines
  map.addLayer({
    id: 'mowing-lines',
    type: 'line',
    source: 'mowing-source',
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: {
      'line-color': '#10b981',
      'line-width': [
        'interpolate', ['linear'], ['zoom'],
        5, 1.2,
        12, 2.5,
        16, 4
      ]
    }
  });

  // Polygons
  map.addLayer({
    id: 'mowing-polys',
    type: 'fill',
    source: 'mowing-source',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: {
      'fill-color': '#ef4444',
      'fill-opacity': 0.35,
      'fill-outline-color': '#b91c1c'
    }
  });

  // Popup on click (works for any geometry)
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['mowing-points', 'mowing-lines', 'mowing-polys']
    });
    if (!features.length) return;

    const f = features[0];
    const props = f.properties || {};
    const html = `<div style="max-width:260px">` +
      `<h3 style="margin:0 0 6px 0;font-size:15px;font-weight:600;">Feature Properties</h3>` +
      `<pre style="white-space:pre-wrap;font-size:12px;margin:0;background:#f9fafb;padding:8px;border-radius:8px;border:1px solid #e5e7eb;">${escapeHTML(JSON.stringify(props, null, 2))}</pre>` +
      `</div>`;

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  });

  // Change cursor on hover
  ['mowing-points','mowing-lines','mowing-polys'].forEach(layer => {
    map.on('mouseenter', layer, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', layer, () => map.getCanvas().style.cursor = '');
  });

  // Fit once layers are ready
  fitToData(geojson);
}

// Utility to fit map to data bounds
function fitToData(geojsonData) {
  const source = map.getSource('mowing-source');
  if (!geojsonData && !source) return; // not ready yet

  const data = geojsonData || source._data;
  const bbox = turf.bbox(data);
  const sw = [bbox[0], bbox[1]];
  const ne = [bbox[2], bbox[3]];
  if (Number.isFinite(sw[0]) && Number.isFinite(sw[1]) && Number.isFinite(ne[0]) && Number.isFinite(ne[1])) {
    map.fitBounds([sw, ne], { padding: 40, duration: 800 });
  }
}

// Simple HTML escape
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// Wait for map to load, then add data + controls dependent on style
map.on('load', () => {
  // Load Turf for bbox (via CDN) then add layers
  const turfScript = document.createElement('script');
  turfScript.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
  turfScript.onload = () => addDataLayers();
  document.head.appendChild(turfScript);
});
// Lines (LineString + MultiLineString)
map.addLayer({
  id: 'mowing-lines',
  type: 'line',
  source: 'mowing-source',
  filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
  paint: {
    'line-color': '#10b981',
    'line-width': [
      'interpolate', ['linear'], ['zoom'],
      5, 1.2,
      12, 2.5,
      16, 4
    ]
  }
});

// Polygons (Polygon + MultiPolygon)
map.addLayer({
  id: 'mowing-polys',
  type: 'fill',
  source: 'mowing-source',
  filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
  paint: {
    'fill-color': '#ef4444',
    'fill-opacity': 0.35,
    'fill-outline-color': '#b91c1c'
  }
});
