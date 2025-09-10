
// Mapbox Mowing Map - app.js
// IMPORTANT: Put your actual GeoJSON file in the same folder and name it `data.geojson` (or update the path here)
const MAPBOX_TOKEN = "pk.eyJ1IjoicmlsZXliYXlzaWRlIiwiYSI6ImNtZmQ0eGhyZjA1ZjMyb3BzMjlxbnlybHIifQ.7BgSVYe8ZBb0LxF2Y3dvTw";

mapboxgl.accessToken = MAPBOX_TOKEN;

// Initialize map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json', // neutral style to avoid token style restrictions
  center: [151.2093, -33.8688], // default center (Sydney) - map will fit bounds after loading data
  zoom: 10
});

// Add navigation
map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }));

// Load GeoJSON and add as a source/layer
async function loadData() {
  try {
    const resp = await fetch('data.geojson');
    if (!resp.ok) throw new Error('Could not load data.geojson. Replace with your actual GeoJSON file.');
    const data = await resp.json();

    map.on('load', () => {
      // Add source
      if (map.getSource('mowing')) map.removeSource('mowing');
      map.addSource('mowing', { type: 'geojson', data });

      // Add layer - polygons or points handled
      if (data.features && data.features.length && data.features[0].geometry.type === 'Point') {
        map.addLayer({
          id: 'mowing-points',
          type: 'circle',
          source: 'mowing',
          paint: {
            'circle-radius': 6,
            'circle-stroke-width': 1,
            'circle-opacity': 0.9
          }
        });
      } else { // treat as fill / outline
        map.addLayer({
          id: 'mowing-fill',
          type: 'fill',
          source: 'mowing',
          paint: {
            'fill-opacity': 0.45
          }
        });

        map.addLayer({
          id: 'mowing-outline',
          type: 'line',
          source: 'mowing',
          paint: {
            'line-width': 1.2
          }
        });
      }

      populateSidebar(data.features);
      fitToDataBounds(data);
    });
  } catch (err) {
    console.error(err);
    alert('Error loading data.geojson: ' + err.message + '\nMake sure your GeoJSON file is named data.geojson and is in the same folder.');
  }
}

function fitToDataBounds(geojson) {
  try {
    const coords = geojson.features.flatMap(f => (f.geometry.type === 'Point') ? [f.geometry.coordinates] :
      (f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] :
        f.geometry.coordinates.flat()));

    const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, { padding: 40 });
  } catch (e) {
    // fallback - do nothing
    console.warn('Could not fit to bounds:', e);
  }
}

// Sidebar list population
function populateSidebar(features) {
  const list = document.getElementById('resultList');
  list.innerHTML = '';
  features.forEach((feat, idx) => {
    const id = feat.properties && (feat.properties.MowingID || feat.properties.mowingid || feat.properties.id) || 'N/A';
    const name = feat.properties && (feat.properties.Name || feat.properties.name) || id;
    const li = document.createElement('li');
    li.textContent = id + ' — ' + name;
    li.dataset.index = idx;
    li.addEventListener('click', () => showFeaturePopup(feat));
    list.appendChild(li);
  });
}

// Show popup and fly to feature
function showFeaturePopup(feature) {
  const coords = feature.geometry.type === 'Point' ? feature.geometry.coordinates :
    (feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0][0] : null);
  if (!coords) return;

  map.flyTo({ center: coords, zoom: 15 });

  const props = feature.properties || {};
  const propHtml = Object.keys(props).map(k => '<small><b>' + k + ':</b> ' + props[k] + '</small>').join('<br>');

  new mapboxgl.Popup().setLngLat(coords).setHTML('<strong>' + (props.MowingID || props.mowingid || '') + '</strong><br>' + propHtml).addTo(map);
}

// Search functionality by MowingID (case-insensitive)
document.getElementById('searchBtn').addEventListener('click', runSearch);
document.getElementById('searchInput').addEventListener('keyup', (e) => { if (e.key === 'Enter') runSearch(); });
document.getElementById('resetBtn').addEventListener('click', () => location.reload());

async function runSearch() {
  const needle = document.getElementById('searchInput').value.trim();
  if (!needle) return alert('Enter a MowingID to search (e.g. M0312).');

  try {
    const resp = await fetch('data.geojson');
    const geo = await resp.json();
    const results = geo.features.filter(f => {
      const mid = (f.properties && (f.properties.MowingID || f.properties.mowingid || '') + '').toLowerCase();
      return mid === needle.toLowerCase();
    });

    if (results.length === 0) return alert('No features found with MowingID ' + needle);

    // show filtered results in sidebar and fly to first
    populateSidebar(results);
    showFeaturePopup(results[0]);
  } catch (err) {
    console.error(err);
    alert('Search error: ' + err.message);
  }
}

// load data on start
loadData();
