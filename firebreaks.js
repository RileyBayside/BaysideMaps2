// Initialize the map
var map = L.map('map', {
    center: [-27.55, 153.25],
    zoom: 12
});

// Google Hybrid basemap
L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0','mt1','mt2','mt3'],
    attribution: 'Imagery © Google'
}).addTo(map);

// Layer groups
var firebreaksLayer = L.layerGroup().addTo(map);
var blocksLayer = L.layerGroup().addTo(map);
var utilityLayer = L.layerGroup().addTo(map);
var labelsLayer = L.layerGroup().addTo(map); // separate layer for labels

// Global feature registry for search
var allFeatures = [];

// Style functions
function firebreakStyle() { return { color: "red", weight: 2 }; }
function blockStyle() { return { color: "orange", weight: 2 }; }
function utilityStyle() { return { color: "purple", weight: 2 }; }

// Label creation
function createLabel(feature, layer, color) {
    if (feature.properties && feature.properties.ITEM) {
        var center;
        if (layer.getBounds) {
            center = layer.getBounds().getCenter();
        } else if (layer.getLatLng) {
            center = layer.getLatLng();
        }
        if (center) {
            var label = L.marker(center, {
                icon: L.divIcon({
                    className: 'label-' + color,
                    iconSize: null, // allow autosize
                    html: '<div style="background:white; border:1px solid black; ' +
                          'padding:3px 8px; border-radius:4px; ' +
                          'font-size:13px; font-weight:bold; color:black; ' +
                          'display:inline-block; white-space:nowrap; text-align:center;">' +
                          feature.properties.ITEM + '</div>'
                }),
                interactive: false
            });
            labelsLayer.addLayer(label);
            layer.labelMarker = label; // tie label to feature
        }
    }
}

// Popup info
function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.ITEM) {
        let popupContent = "<b>Item:</b> " + feature.properties.ITEM;
        if (feature.properties.FFZ_EXISTING_M) {
            popupContent += "<br><b>FFZ Existing Width:</b> " + feature.properties.FFZ_EXISTING_M + "m";
        }
        layer.bindPopup(popupContent);
    }
    // Store reference for search
    allFeatures.push(layer);
}

// Load Firebreaks
fetch('FFZ.geojson')
    .then(res => res.json())
    .then(data => {
        var fb = L.geoJSON(data, {
            style: firebreakStyle,
            onEachFeature: function(feature, layer) {
                onEachFeature(feature, layer);
                createLabel(feature, layer, "red");
            }
        });
        fb.addTo(firebreaksLayer);
        map.fitBounds(fb.getBounds());
    });

// Load Blocks
fetch('FFZBlock.geojson')
    .then(res => res.json())
    .then(data => {
        var bl = L.geoJSON(data, {
            style: blockStyle,
            onEachFeature: function(feature, layer) {
                onEachFeature(feature, layer);
                createLabel(feature, layer, "orange");
            }
        });
        bl.addTo(blocksLayer);
    });

// Load Utility Sites
fetch('Utility_Site_fixed.geojson')
    .then(res => res.json())
    .then(data => {
        var ul = L.geoJSON(data, {
            style: utilityStyle,
            onEachFeature: function(feature, layer) {
                onEachFeature(feature, layer);
                createLabel(feature, layer, "purple");
            }
        });
        ul.addTo(utilityLayer);
    });

// Layer control
var overlays = {
    "Firebreaks (Red)": firebreaksLayer,
    "Blocks (Orange)": blocksLayer,
    "Utility Sites (Purple)": utilityLayer
};
L.control.layers(null, overlays).addTo(map);

// Search control
var searchControl = L.control({position: 'topleft'});
searchControl.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'search-box');
    div.innerHTML = '<input id="searchInput" type="text" placeholder="Search ITEM ID...">';
    return div;
};
searchControl.addTo(map);

// Search logic (supports partial matches)
document.getElementById("searchInput").addEventListener("keyup", function(e) {
    var value = e.target.value.trim().toUpperCase();
    if (!value) return;

    var foundLayer = allFeatures.find(l =>
        l.feature &&
        l.feature.properties &&
        l.feature.properties.ITEM &&
        l.feature.properties.ITEM.toUpperCase().includes(value) // partial match
    );

    if (foundLayer) {
        if (foundLayer.getBounds) {
            map.fitBounds(foundLayer.getBounds(), { maxZoom: 17 });
        } else if (foundLayer.getLatLng) {
            map.setView(foundLayer.getLatLng(), 17);
        }
        foundLayer.openPopup();

        if (foundLayer.labelMarker) {
            map.setView(foundLayer.labelMarker.getLatLng(), 17);
        }
    }
});

// Zoom-based label visibility
function toggleLabels() {
    if (map.getZoom() >= 15) {
        if (!map.hasLayer(labelsLayer)) {
            map.addLayer(labelsLayer);
        }
    } else {
        if (map.hasLayer(labelsLayer)) {
            map.removeLayer(labelsLayer);
        }
    }
}
map.on('zoomend', toggleLabels);
toggleLabels();

