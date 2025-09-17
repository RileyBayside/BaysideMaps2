
// Basic Leaflet map with Esri World Imagery (satellite) + reference labels.
const map = L.map('map', {
  zoomControl: true,
  preferCanvas: true
});

// Create panes so labels stay on top and are not interactive.
map.createPane('labels');
map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none';

// Satellite imagery
const worldImagery = L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
  { maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' }
).addTo(map);

// Reference boundaries/places (labels) overlay
const refLabels = L.tileLayer(
  'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', 
  { maxZoom: 19, pane: 'labels', opacity: 0.85, attribution: 'Labels &copy; Esri' }
).addTo(map);

// Optional: Transportation overlay for street name detail
const refTransportation = L.tileLayer(
  'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', 
  { maxZoom: 19, pane: 'labels', opacity: 0.85, attribution: 'Transport &copy; Esri' }
).addTo(map);

// Utility: color mapping by CutsPerYear
function colorByCuts(cuts) {
  // Explicitly color the requested examples; provide reasonable defaults for others
  if (cuts === 18) return '#1e90ff'; // blue
  if (cuts === 15) return '#2e8b57'; // green

  // Extendable palette for other values
  if (cuts >= 20) return '#0ea5e9';        // bright cyan
  if (cuts >= 16) return '#3b82f6';        // blue-ish
  if (cuts >= 12) return '#10b981';        // teal/green
  if (cuts >= 8)  return '#f59e0b';        // amber
  if (cuts >= 4)  return '#ef4444';        // red
  return '#6b7280';                        // gray fallback
}

// Create a feature group to hold points for easy fitting and searching
const featuresGroup = L.featureGroup().addTo(map);

// Keep an index from Unique ID -> marker for fast lookup
const indexById = new Map();

// Load the local GeoJSON (place this file in the same repo)
fetch('data.geojson')
  .then(r => r.json())
  .then(data => {
    // Detect geometry type and add accordingly
    const gj = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const props = feature.properties || {};
        const cuts = Number(props.CutsPerYear ?? props.cuts ?? props.CUTS ?? 0);
        const uid  = String(props.UniqueID ?? props['Unique ID'] ?? props.ID ?? '');

        const marker = L.circleMarker(latlng, {
          radius: 7,
          color: '#111827',
          weight: 2,
          fillColor: colorByCuts(cuts),
          fillOpacity: 0.9
        });

        // Popup with basic info
        const popupHtml = `
          <div style="min-width:180px">
            <div style="font-weight:700;margin-bottom:4px;">${uid || 'Unknown ID'}</div>
            <div><b>CutsPerYear:</b> ${Number.isFinite(cuts) ? cuts : 'N/A'}</div>
            ${Object.entries(props).map(([k,v]) => {
              if (k === 'CutsPerYear' || k === 'cuts' || k === 'CUTS' || k === 'UniqueID' || k === 'Unique ID' || k === 'ID') return '';
              return `<div><b>${k}:</b> ${v}</div>`;
            }).join('')}
          </div>
        `;
        marker.bindPopup(popupHtml);

        // Permanent label to "outline" Unique ID on the map
        if (uid) {
          marker.bindTooltip(uid, {
            permanent: true,
            direction: 'top',
            className: 'unique-id',
            offset: [0, -10]
          });
        }

        // Index by Unique ID (normalized for search) if present
        if (uid) {
          indexById.set(uid.toUpperCase(), marker);
        }

        return marker;
      },
      onEachFeature: (feature, layer) => {
        featuresGroup.addLayer(layer);
      }
    }).addTo(map);

    if (featuresGroup.getLayers().length) {
      map.fitBounds(featuresGroup.getBounds().pad(0.2));
    } else {
      map.setView([-27.4698, 153.0251], 10); // Brisbane fallback
    }
  })
  .catch(err => {
    console.error('Failed to load data.geojson', err);
    map.setView([-27.4698, 153.0251], 10);
  });

// --- Search functionality ---
// Requirements:
// - Search by exact ID like "M0123"
// - Smart search: typing "123" should match and zoom to "M0123"
function normalizeQuery(q) {
  return (q || '').trim().toUpperCase();
}

function maybeBuildIdFromDigits(q) {
  // If user types only digits, pad to 4 and prefix "M"
  const digitsOnly = q.replace(/\D/g, '');
  if (digitsOnly.length > 0 && digitsOnly === q) {
    const padded = digitsOnly.padStart(4, '0');
    return `M${padded}`;
  }
  return null;
}

function findBestMatch(qRaw) {
  const q = normalizeQuery(qRaw);
  if (!q) return null;

  // 1) Try exact
  if (indexById.has(q)) return [q, indexById.get(q)];

  // 2) If digits, try to construct M#### pattern
  const candidate = maybeBuildIdFromDigits(q);
  if (candidate && indexById.has(candidate)) {
    return [candidate, indexById.get(candidate)];
  }

  // 3) Substring match over keys (so "123" finds "...0123")
  let bestKey = null;
  for (const key of indexById.keys()) {
    if (key.includes(q)) { bestKey = key; break; }
  }
  if (!bestKey && candidate) {
    for (const key of indexById.keys()) {
      if (key.includes(candidate)) { bestKey = key; break; }
    }
  }
  if (bestKey) return [bestKey, indexById.get(bestKey)];
  return null;
}

function zoomToMarker(marker) {
  const latlng = marker.getLatLng();
  map.flyTo(latlng, Math.max(17, map.getZoom()), { duration: 0.8 });
  marker.openPopup();
}

document.getElementById('searchBtn').addEventListener('click', () => {
  const q = document.getElementById('searchInput').value;
  const match = findBestMatch(q);
  if (match) {
    const [id, marker] = match;
    zoomToMarker(marker);
  } else {
    alert('No match found.');
  }
});

document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
});

// Also allow Enter key to search and live "first match" on typing
const inputEl = document.getElementById('searchInput');
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('searchBtn').click();
  }
});
inputEl.addEventListener('input', (e) => {
  const q = e.target.value;
  const match = findBestMatch(q);
  if (match) {
    const [id, marker] = match;
    // Light hover effect by opening tooltip; don't fly until button/Enter
    // (Optional: uncomment to auto-zoom as you type)
    // zoomToMarker(marker);
  }
});

// Add a simple legend to show the key colors (18=blue, 15=green)
const legend = L.control({ position: 'bottomleft' });
legend.onAdd = function() {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = `
    <div><span class="swatch" style="background:#1e90ff"></span>18 cuts (blue)</div>
    <div><span class="swatch" style="background:#2e8b57"></span>15 cuts (green)</div>
    <div style="margin-top:6px;opacity:.8;">Other values are auto-colored.</div>
  `;
  return div;
};
legend.addTo(map);
