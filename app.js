// Global variables to hold map instance and feature data
let map;
const mapFeatures = {};

/**
 * Initializes the Google Map and starts the data loading process.
 * This function is called by the Google Maps API script once it's loaded.
 */
async function initMap() {
    // Starting location for the map (centered on Brisbane)
    const initialLocation = { lat: -27.55, lng: 153.15 };

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: initialLocation,
        mapTypeId: 'satellite' // Using satellite view to match your example image
    });

    await loadAndDrawFeatures();
    setupSearch();
}

/**
 * Loads the GeoJSON file, processes each feature, and draws it on the map.
 */
async function loadAndDrawFeatures() {
    try {
        const response = await fetch('data.geojson');
        if (!response.ok) {
            throw new Error(`Failed to load GeoJSON file: ${response.statusText}`);
        }
        const geojsonData = await response.json();

        // Define the coordinate system from your file (EPSG:28356 - MGA Zone 56)
        // This is crucial for converting the coordinates to standard latitude/longitude
        proj4.defs("EPSG:28356", "+proj=utm +zone=56 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

        const bounds = new google.maps.LatLngBounds();

        // Loop through each feature (location) in the GeoJSON data
        geojsonData.features.forEach(feature => {
            const properties = feature.properties;
            const geometry = feature.geometry;
            const uniqueID = properties.UniqueID;

            if (geometry.type === 'Polygon' && uniqueID) {
                // Convert polygon coordinates to latitude/longitude
                const paths = geometry.coordinates[0].map(coord => {
                    const [lng, lat] = proj4("EPSG:28356", "EPSG:4326", [coord[0], coord[1]]);
                    const latLng = new google.maps.LatLng(lat, lng);
                    bounds.extend(latLng); // Expand the map view to include this point
                    return latLng;
                });

                // Determine the polygon color based on 'CutsPerYear'
                const color = getColorForCuts(properties.CutsPerYear);

                // Create the polygon object
                const polygon = new google.maps.Polygon({
                    paths: paths,
                    strokeColor: color,
                    strokeOpacity: 0.9,
                    strokeWeight: 2,
                    fillColor: color,
                    fillOpacity: 0.55
                });
                polygon.setMap(map);

                // Calculate the center of the polygon to place the label
                const polygonBounds = new google.maps.LatLngBounds();
                paths.forEach(point => polygonBounds.extend(point));

                // Create and place the UniqueID label on the map
                createLabel(polygonBounds.getCenter(), uniqueID);

                // Store the feature data for the search function
                mapFeatures[uniqueID.toUpperCase()] = {
                    polygon: polygon,
                    bounds: polygonBounds
                };
            }
        });

        // Zoom the map to fit all the loaded polygons
        map.fitBounds(bounds);

    } catch (error) {
        console.error("Error processing GeoJSON data:", error);
        alert("Could not load or display map data. See the console for more details.");
    }
}

/**
 * Creates a non-clickable marker to serve as a text label.
 * @param {google.maps.LatLng} position The position for the label.
 * @param {string} text The text for the label (UniqueID).
 */
function createLabel(position, text) {
    new google.maps.Marker({
        position: position,
        map: map,
        label: {
            text: text,
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
        },
        // Use a transparent icon so only the text label is visible
        icon: {
            path: 'M 0,0',
            strokeOpacity: 0
        },
    });
}

/**
 * Returns a color based on the CutsPerYear value.
 * @param {number} cuts The number of cuts per year.
 * @returns {string} A hex color code.
 */
function getColorForCuts(cuts) {
    switch (cuts) {
        case 18:
            return '#0000FF'; // Blue
        case 15:
            return '#008000'; // Green
        default:
            return '#FF8C00'; // Default color (Dark Orange)
    }
}

/**
 * Sets up the event listener for the search input field.
 */
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    
    // Using 'input' event to search as the user types
    searchInput.addEventListener('input', (event) => {
        const query = event.target.value.trim().toUpperCase();

        if (query.length < 1) return; // Ignore empty queries

        // Smart search: find the first ID that *includes* the search query
        const foundKey = Object.keys(mapFeatures).find(key => key.includes(query));

        if (foundKey) {
            const feature = mapFeatures[foundKey];
            map.fitBounds(feature.bounds); // Zoom to the found location

            // Temporarily highlight the found polygon
            feature.polygon.setOptions({ fillOpacity: 0.9, strokeWeight: 4 });
            setTimeout(() => {
                feature.polygon.setOptions({ fillOpacity: 0.55, strokeWeight: 2 });
            }, 3000); // Highlight lasts for 3 seconds
        }
    });
}