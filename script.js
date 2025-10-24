var map = L.map('map').setView([-27.55, 153.2], 12);

// Base layers
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
});

// Google Hybrid (satellite + street names)
var googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    attribution: 'Imagery © Google',
    maxZoom: 20
}).addTo(map);

var baseMaps = {
    "OpenStreetMap": osm,
    "Google Hybrid": googleHybrid
};

L.control.layers(baseMaps).addTo(map);

var featureIndex = {};
var labelLayers = []; // store label tooltips

// Define color by CutsPerYear property
function getColor(cuts) {
    if (cuts == 18) return 'blue';
    if (cuts == 15) return 'green';
    return 'red';
}

// ----- make a namespace -----
window.BaysideMaps = window.BaysideMaps || {};

/**
 * Initialize the Parks Mowing map in any container.
 * @param {Object} opts
 * @param {string} opts.containerId - element id to mount the map into
 * @param {string} [opts.geojsonUrl='data.geojson'] - path to GeoJSON
 * @param {(feature, layer, evt) => void} [opts.onFeatureClick] - handler for clicks
 * @param {boolean} [opts.fitBounds=true] - whether to fit to data bounds
 */
BaysideMaps.initParksMowingMap = async function initParksMowingMap(opts = {}) {
  const {
    containerId,
    geojsonUrl = 'data.geojson',
    onFeatureClick,
    fitBounds = true
  } = opts;

  const el = document.getElementById(containerId);
  if (!el) {
    console.warn(`[BaysideMaps] container #${containerId} not found`);
    return;
  }

  // ====== YOUR EXISTING MAP SETUP STARTS HERE ======
  // Example: copy the Leaflet map creation from script.js here
  // (use the same tile layer and styling you use on ParksMowing)

  const map = L.map(containerId, { zoomControl: true, attributionControl: false, preferCanvas: true });

  // same base layer you use in ParksMowing:
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
    .addTo(map);

  // If you already have a style object in script.js, reuse it here:
  const defaultStyle = {
    color: '#1d4ed8',
    weight: 2,
    opacity: 0.9,
    fillColor: '#60a5fa',
    fillOpacity: 0.25
  };

  // Load the same data you use on ParksMowing:
  const resp = await fetch(geojsonUrl);
  const data = await resp.json();

  const layer = L.geoJSON(data, {
    style: defaultStyle,
    onEachFeature: (feature, l) => {
      // Wire click out to delegate if provided
      l.on('click', (evt) => {
        if (onFeatureClick) onFeatureClick(feature, l, evt);
      });

      // Optional: your existing popup/hover logic
      // const name = feature.properties?.name || feature.properties?.id || 'Site';
      // l.bindPopup(`<strong>${name}</strong>`);
    }
  }).addTo(map);

  if (fitBounds) {
    const b = layer.getBounds();
    if (b.isValid()) map.fitBounds(b.pad(0.05));
    else map.setView([-27.5, 153.2], 11); // fallback center
  }

  // Return map/layer if a caller wants to do more stuff
  return { map, layer };
  // ====== YOUR EXISTING MAP SETUP ENDS HERE ======
};

// Keep ParksMowing.html behavior unchanged:
// If that page has <div id="map"> and loads script.js, we can
// auto-init the map there as before:
document.addEventListener('DOMContentLoaded', () => {
  const parksContainer = document.getElementById('map');
  if (parksContainer) {
    BaysideMaps.initParksMowingMap({ containerId: 'map' })
      .catch(err => console.warn('Auto-init parks map failed:', err));
  }
});

// Load GeoJSON
fetch('data.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
        style: function(feature) {
            var cuts = 0;
            if (feature.properties && feature.properties.description) {
                var desc = feature.properties.description.value;
                var match = desc.match(/CutsPerYear<\/td><td>(\d+)<\/td>/);
                if (match) cuts = parseInt(match[1]);
            }
            return {
                color: getColor(cuts),
                weight: 2,
                fillOpacity: 0.2
            };
        },
        onEachFeature: function (feature, layer) {
            var name = feature.properties.name || '';
            var mowID = '';
            var cuts = '';
            if (feature.properties && feature.properties.description) {
                var desc = feature.properties.description.value;
                var idMatch = desc.match(/MowingID<\/td><td>(.*?)<\/td>/);
                if (idMatch) mowID = idMatch[1];
                var cutMatch = desc.match(/CutsPerYear<\/td><td>(\d+)<\/td>/);
                if (cutMatch) cuts = cutMatch[1];
            }
            var popupText = name;
            if (mowID) popupText += " (" + mowID + ")";
            if (cuts) popupText += " - " + cuts + " cuts/yr";
            layer.bindPopup(popupText);
            if (mowID) {
                var tooltip = layer.bindTooltip(mowID, {
                    permanent: true,
                    direction: 'center',
                    className: 'mowing-id-label'
                });
                labelLayers.push(tooltip);
            }
            if (mowID) featureIndex[mowID.toLowerCase()] = layer;
        }
    }).addTo(map);
  });

// Manage label visibility by zoom level
map.on('zoomend', function() {
    var currentZoom = map.getZoom();
    labelLayers.forEach(function(layer) {
        if (currentZoom >= 15) {
            layer.openTooltip();
        } else {
            layer.closeTooltip();
        }
    });
});

// Search box
var searchBox = L.control({position: 'topleft'});
searchBox.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'search-box');
    div.innerHTML = '<input type="text" id="customSearch" placeholder="Search ID..." style="padding:4px;width:120px;">';
    return div;
};
searchBox.addTo(map);

document.addEventListener('keyup', function(e) {
    if (e.target && e.target.id === 'customSearch') {
        var query = e.target.value.toLowerCase();
        if (query.length > 1) {
            for (var key in featureIndex) {
                if (key.includes(query)) {
                    map.fitBounds(featureIndex[key].getBounds());
                    featureIndex[key].openPopup();
                    break;
                }
            }
        }
    }
});
