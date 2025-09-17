let map;
let geoJsonData;
let features = [];

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: -27.47, lng: 153.02 }, // default Brisbane, adjust if needed
    zoom: 11,
    mapTypeId: "satellite"
  });

  fetch("data.geojson")
    .then(response => response.json())
    .then(data => {
      geoJsonData = data;
      map.data.addGeoJson(data);

      // Style features based on CutsPerYear
      map.data.setStyle(feature => {
        const cuts = feature.getProperty("CutsPerYear");
        let color = "gray";
        if (cuts === 18) color = "blue";
        else if (cuts === 15) color = "green";

        return {
          fillColor: color,
          strokeColor: "black",
          strokeWeight: 1,
          fillOpacity: 0.6
        };
      });

      // Info windows with Unique ID
      const infowindow = new google.maps.InfoWindow();
      map.data.addListener("click", event => {
        const uniqueId = event.feature.getProperty("Unique ID") || event.feature.getProperty("MowingID");
        infowindow.setContent("<b>Unique ID:</b> " + uniqueId);
        infowindow.setPosition(event.latLng);
        infowindow.open(map);
      });

      // Store features for searching
      map.data.forEach(feature => {
        features.push(feature);
      });
    });
}

// Search function
function searchFeature() {
  const query = document.getElementById("search-box").value.trim().toUpperCase();
  if (!query) return;

  let found = null;
  features.forEach(f => {
    const uniqueId = (f.getProperty("Unique ID") || f.getProperty("MowingID") || "").toUpperCase();
    if (uniqueId.includes(query)) {
      found = f;
    }
  });

  if (found) {
    const bounds = new google.maps.LatLngBounds();
    found.getGeometry().forEachLatLng(latlng => bounds.extend(latlng));
    map.fitBounds(bounds);
  } else {
    alert("No match found for " + query);
  }
}