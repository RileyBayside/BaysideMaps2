let map;
let geojsonData;
let dataLayer;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -27.470125, lng: 153.021072}, // Centered on Brisbane, adjust if needed
        zoom: 10,
        mapTypeControl: false,
    });

    // --- Your GeoJSON data is embedded here ---
    geojsonData = {"type":"FeatureCollection","features":[/* ... your full GeoJSON content ... */]};
    // The content of "GeoJjson FIle _filtered.geojson" is placed here.
    // Due to its large size, the full GeoJSON data is not displayed here.
    // Please ensure you have the full content in your file.

    // Load GeoJSON data onto the map
    dataLayer = map.data;
    dataLayer.addGeoJson(geojsonData);

    // Add mouseover effects
    dataLayer.addListener('mouseover', function(event) {
        dataLayer.revertStyle();
        dataLayer.overrideStyle(event.feature, {strokeWeight: 3, strokeColor: '#000000'});
    });

    dataLayer.addListener('mouseout', function(event) {
        dataLayer.revertStyle();
    });


    // Style the features based on CutsPerYear
    dataLayer.setStyle(feature => {
        const cutsPerYear = feature.getProperty('CutsPerYear');
        return {
            fillColor: getColor(cutsPerYear),
            strokeWeight: 1,
            fillOpacity: 0.6
        };
    });
}

function getColor(cutsPerYear) {
    // Color scheme based on your requirements
    if (cutsPerYear >= 18) return 'blue';
    if (cutsPerYear >= 15) return 'green';
    // Add more colors as needed
    return 'grey'; // Default color
}

const searchInput = document.getElementById('search-input');
const suggestionsContainer = document.getElementById('suggestions-container');

searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.style.display = 'none';

    if (query.length === 0) {
        return;
    }

    const uniqueIDs = geojsonData.features.map(f => f.properties.MowingID);
    const filteredIDs = uniqueIDs.filter(id => id.toLowerCase().includes(query)).slice(0, 10); // Limit suggestions

    if (filteredIDs.length > 0) {
        suggestionsContainer.style.display = 'block';
        filteredIDs.forEach(id => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = id;
            suggestionItem.addEventListener('click', () => {
                searchInput.value = id;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                zoomToFeature(id);
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
    }
});

function zoomToFeature(uniqueID) {
    const feature = geojsonData.features.find(f => f.properties.MowingID === uniqueID);
    if (feature) {
        const bounds = new google.maps.LatLngBounds();
        processCoordinates(feature.geometry.coordinates, bounds);
        map.fitBounds(bounds);
        map.setZoom(18); // Zoom in closer on the selected feature
    }
}

function processCoordinates(coordinates, bounds) {
    for (let i = 0; i < coordinates.length; i++) {
        const path = coordinates[i];
        if (Array.isArray(path) && typeof path[0] === 'number' && path.length === 2) {
             bounds.extend(new google.maps.LatLng(path[1], path[0]));
        } else if (Array.isArray(path)) {
            processCoordinates(path, bounds);
        }
    }
}