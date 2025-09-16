let map;
let geojsonData;
let dataLayer;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -27.5, lng: 153.1 },
        zoom: 10
    });

    // Proj4js definition for EPSG:28356
    proj4.defs("EPSG:28356", "+proj=utm +zone=56 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

    // Change 1: Updated filename and added an error handler
    fetch('data.geojson') 
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok. Check if the file name is correct.');
            }
            return response.json();
        })
        .then(data => {
            geojsonData = data;

            // Reproject coordinates
            geojsonData.features.forEach(feature => {
                const geometry = feature.geometry;
                if (geometry.type === 'Polygon') {
                    geometry.coordinates[0] = geometry.coordinates[0].map(coord => {
                        return proj4('EPSG:28356', 'EPSG:4326', coord).reverse();
                    });
                } else if (geometry.type === 'MultiPolygon') {
                    geometry.coordinates.forEach((polygon, i) => {
                        polygon[0] = polygon[0].map(coord => {
                            return proj4('EPSG:28356', 'EPSG:4326', coord).reverse();
                        });
                    });
                }
            });

            dataLayer = new google.maps.Data();
            dataLayer.addGeoJson(geojsonData);
            dataLayer.setMap(map);

            // Style features based on CutsPerYear
            dataLayer.setStyle(feature => {
                const cutsPerYear = feature.getProperty('CutsPerYear');
                let color = 'gray'; // Default color
                if (cutsPerYear === 18) {
                    color = 'blue';
                } else if (cutsPerYear === 15) {
                    color = 'green';
                }
                return {
                    fillColor: color,
                    strokeWeight: 1,
                    fillOpacity: 0.7
                };
            });

            // Search functionality
            const searchInput = document.getElementById('search-input');
            const suggestionsContainer = document.getElementById('suggestions-container');
            const mowingIDs = geojsonData.features.map(feature => feature.properties.MowingID);

            searchInput.addEventListener('input', () => {
                const inputValue = searchInput.value.toUpperCase();
                suggestionsContainer.innerHTML = '';
                if (inputValue.length > 0) {
                    const suggestions = mowingIDs.filter(id => id.includes(inputValue));
                    suggestions.forEach(suggestion => {
                        const div = document.createElement('div');
                        div.innerHTML = suggestion;
                        div.classList.add('suggestion-item');
                        div.addEventListener('click', () => {
                            searchInput.value = suggestion;
                            suggestionsContainer.innerHTML = '';
                            findAndZoomToFeature(suggestion);
                        });
                        suggestionsContainer.appendChild(div);
                    });
                }
            });

            searchInput.addEventListener('change', () => {
                const inputValue = searchInput.value.toUpperCase();
                findAndZoomToFeature(inputValue);
            });
        })
        .catch(error => { // Change 2: This will log a helpful error message
            console.error('Error loading GeoJSON:', error);
            alert('Failed to load map data. Please check the console for more information.');
        });
}

function findAndZoomToFeature(mowingID) {
    dataLayer.forEach(feature => {
        if (feature.getProperty('MowingID').toUpperCase() === mowingID) {
            const geometry = feature.getGeometry();
            const bounds = new google.maps.LatLngBounds();
            processPoints(geometry, bounds.extend, bounds);
            map.fitBounds(bounds);

            // Highlight the selected feature
            dataLayer.overrideStyle(feature, { strokeWeight: 3, strokeColor: 'red' });
            setTimeout(() => {
                dataLayer.revertStyle();
            }, 5000); // Highlight for 5 seconds
        }
    });
}

function processPoints(geometry, callback, thisArg) {
    if (geometry instanceof google.maps.LatLng) {
        callback.call(thisArg, geometry);
    } else if (geometry instanceof google.maps.Data.Point) {
        callback.call(thisArg, geometry.get());
    } else {
        geometry.getArray().forEach(g => {
            processPoints(g, callback, thisArg);
        });
    }
}