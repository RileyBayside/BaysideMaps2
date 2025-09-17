// ==================================================================
// CUSTOMIZE YOUR MAP
// ==================================================================

// 1. Set the GeoJSON file path
const geojsonFilePath = '2425_Mowing_and_Vegetation_Management_Services_MowingVIEW_2137226493147457152.geojson';

// 2. Set the property names from your GeoJSON file
const uniqueIdProperty = 'MowingID'; // The property for the Unique ID (e.g., "M0142")
const cutsProperty = 'CutsPerYear';     // The property for the number of cuts

// 3. Set the map's starting center and zoom level
const mapCenter = [-27.55, 153.15]; // Centered roughly on the data area
const mapZoom = 12;

// ==================================================================
// MAP INITIALIZATION
// ==================================================================

// Initialize the map
const map = L.map('map').setView(mapCenter, mapZoom);

// Add the satellite layer
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
}).addTo(map);

// Add the street names layer on top
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO',
    pane: 'shadowPane' // Ensures labels are drawn on top of polygons
}).addTo(map);

// Define a layer group to hold our mowing areas for the search function
const mowingAreasLayer = L.layerGroup().addTo(map);

// ==================================================================
// COORDINATE PROJECTION SETUP (EPSG:28356)
// ==================================================================
// Your GeoJSON uses a coordinate system that needs to be defined for Leaflet.
const crsEPSG28356 = new L.Proj.CRS('EPSG:28356',
    '+proj=utm +zone=56 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', {
        resolutions: [8192, 4096, 2048, 1024, 512, 256, 128],
        origin: [0, 0]
    }
);

// ==================================================================
// STYLING AND DATA LOADING
// ==================================================================

// Function to determine fill color based on 'CutsPerYear'
function getFeatureStyle(feature) {
    const cuts = feature.properties[cutsProperty];
    let fillColor;

    if (cuts === 18) {
        fillColor = 'blue';
    } else if (cuts === 15) {
        fillColor = 'green';
    } else {
        fillColor = 'grey'; // Default color for any other value
    }

    return {
        fillColor: fillColor,
        weight: 2,
        opacity: 1,
        color: 'white', // Border color
        dashArray: '3',
        fillOpacity: 0.6
    };
}

// Function to process each feature (add labels)
function onEachFeature(feature, layer) {
    // Display the Unique ID as a permanent label in the center of the polygon
    if (feature.properties && feature.properties[uniqueIdProperty]) {
        const label = feature.properties[uniqueIdProperty].toString();
        layer.bindTooltip(label, {
            permanent: true,
            direction: 'center',
            className: 'map-label' // Apply our custom style
        }).openTooltip();
    }
}

// Fetch and load the GeoJSON data
fetch(geojsonFilePath)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Could not load GeoJSON file! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const geojsonLayer = L.Proj.geoJson(data, {
            style: getFeatureStyle,
            onEachFeature: onEachFeature
        });

        mowingAreasLayer.addLayer(geojsonLayer); // Add GeoJSON data to our searchable layer
    })
    .catch(error => {
        console.error("Error loading GeoJSON data:", error);
        alert("Failed to load map data. Please ensure the GeoJSON file is in the same folder as this HTML file.");
    });

// ==================================================================
// SEARCH FUNCTIONALITY
// ==================================================================

const searchControl = new L.Control.Search({
    layer: mowingAreasLayer,
    propertyName: uniqueIdProperty,
    initial: false, // Don't perform a search on load
    zoom: 18,        // Zoom level when a location is found
    marker: false,   // We don't need a marker, the polygon highlighting is enough
    textPlaceholder: 'Search by ID (e.g., M0123 or 123)'
});

map.addControl(searchControl);