let map;
let geoJsonData;
let features = [];

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: -27.47, lng: 153.02 }, // Brisbane area
    zoom: 12,
    mapTypeId: "roadmap"
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
          strokeColor: color,
          strokeWeight: 2,
          fillOpacity: 0.5
        };
      });

      // Info windows on click
      const infowindow = new google.maps.InfoWindow();
      map.data.addListener("click", event => {
        const uniqueId = event.feature.getProperty("Unique ID") || event.feature.getProperty("MowingID");
        const cuts = event.feature.getProperty("CutsPerYear");
        infowindow.setContent(`<b>Unique ID:</b> ${uniqueId}<br><b>CutsPerYear:</b> ${cuts}`);
        infowindow.setPosition(event.latLng);
        infowindow.open(map);
      });

      // Store features for search and add labels
      map.data.forEach(feature => {
        features.push(feature);

        const uniqueId = feature.getProperty("Unique ID") || feature.getProperty("MowingID");
        if (uniqueId) {
          let latlng;
          feature.getGeometry().forEachLatLng(ll => {
            if (!latlng) latlng = ll;
          });

          new google.maps.Marker({
            position: latlng,
            map: map,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 }, // invisible marker
            label: {
              text: uniqueId,
              color: "black",
              fontSize: "10px",
              fontWeight: "bold"
            }
          });
        }
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