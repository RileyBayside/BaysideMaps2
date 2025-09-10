// Mapbox Mowing Map - app.js
const MAPBOX_TOKEN = "pk.eyJ1IjoicmlsZXliYXlzaWRlIiwiYSI6ImNtZmQ0eGhyZjA1ZjMyb3BzMjlxbnlybHIifQ.7BgSVYe8ZBb0LxF2Y3dvTw";
mapboxgl.accessToken = MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12', // FIXED Mapbox style
  center: [151.2093, -33.8688],
  zoom: 10
});

map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }));

async function loadData() {
  try {
    const resp = await fetch('data.geojson');
    if (!resp.ok) throw new Error('Could not load data.geojson. Replace with your actual GeoJSON file.');
    const data = await resp.json();

    map.on('load', () => {
      if (map.getSource('mowing')) map.removeSource('mowing');
      map.addSource('mowing', { type: 'geojson', data });

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
      } else {
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
    alert('Error loading data.geojson: ' + err.message);
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
    console.warn('Could not fit to bounds:', e);
  }
}

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

function showFeaturePopup(feature) {
  const coords = feature.geometry.type === 'Point' ? feature.geometry.coordinates :
    (feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0][0] : null);
  if (!coords) return;

  map.flyTo({ center: coords, zoom: 15 });

  const props = feature.properties || {}
  const propHtml = Object.keys(props).map(k => '<small><b>' + k + ':</b> ' + props[k] + '</small>').join('<br>');

  new mapboxgl.Popup().setLngLat(coords).setHTML('<strong>' + (props.MowingID || props.mowingid || '') + '</strong><br>' + propHtml).addTo(map);
}

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
    populateSidebar(results);
    showFeaturePopup(results[0]);
  } catch (err) {
    console.error(err);
    alert('Search error: ' + err.message);
  }
}

loadData();
