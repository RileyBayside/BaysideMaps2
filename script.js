/* global mapboxgl, MAPBOX_TOKEN */
mapboxgl.accessToken = window.MAPBOX_TOKEN;

let currentStyle = 'mapbox://styles/mapbox/streets-v12';

const map = new mapboxgl.Map({
  container: 'map',
  style: currentStyle,
  center: [153.026, -27.469],
  zoom: 9
});

map.addControl(new mapboxgl.NavigationControl(), 'top-left');
map.addControl(new mapboxgl.FullscreenControl(), 'top-left');
map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }));
map.addControl(new mapboxgl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: true
}));

document.getElementById('styleSelect').addEventListener('change', (e) => {
  currentStyle = e.target.value;
  map.setStyle(currentStyle);
  map.once('styledata', () => addDataLayers());
});

document.getElementById('fitBtn').addEventListener('click', () => {
  fitToData();
});

async function addDataLayers() {
  ['mowing-source','mowing-points','mowing-lines','mowing-polys'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('mowing-source')) map.removeSource('mowing-source');

  const response = await fetch('./data/mowing.geojson');
  const geojson = await response.json();

  map.addSource('mowing-source', { type: 'geojson', data: geojson });

  map.addLayer({
    id: 'mowing-points',
    type: 'circle',
    source: 'mowing-source',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 12, 6, 16, 10],
      'circle-color': '#3b82f6',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1
    }
  });

  map.addLayer({
    id: 'mowing-lines',
    type: 'line',
    source: 'mowing-source',
    filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
    paint: {
      'line-color': '#10b981',
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.2, 12, 2.5, 16, 4]
    }
  });

  map.addLayer({
    id: 'mowing-polys',
    type: 'fill',
    source: 'mowing-source',
    filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
    paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.35, 'fill-outline-color': '#b91c1c' }
  });

  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['mowing-points', 'mowing-lines', 'mowing-polys']
    });
    if (!features.length) return;

    const f = features[0];
    const props = f.properties || {};
    const html = `<div style="max-width:260px"><h3 style="margin:0 0 6px 0;font-size:15px;font-weight:600;">Feature Properties</h3><pre style="white-space:pre-wrap;font-size:12px;margin:0;background:#f9fafb;padding:8px;border-radius:8px;border:1px solid #e5e7eb;">${escapeHTML(JSON.stringify(props, null, 2))}</pre></div>`;

    new mapboxgl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
  });

  ['mowing-points','mowing-lines','mowing-polys'].forEach(layer => {
    map.on('mouseenter', layer, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', layer, () => map.getCanvas().style.cursor = '');
  });

  fitToData(geojson);
}

function fitToData(geojsonData) {
  const source = map.getSource('mowing-source');
  if (!geojsonData && !source) return;

  const data = geojsonData || source._data;
  const bbox = turf.bbox(data);
  const sw = [bbox[0], bbox[1]];
  const ne = [bbox[2], bbox[3]];
  if (Number.isFinite(sw[0]) && Number.isFinite(sw[1]) && Number.isFinite(ne[0]) && Number.isFinite(ne[1])) {
    map.fitBounds([sw, ne], { padding: 40, duration: 800 });
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

map.on('load', () => {
  const turfScript = document.createElement('script');
  turfScript.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
  turfScript.onload = () => addDataLayers();
  document.head.appendChild(turfScript);
});
