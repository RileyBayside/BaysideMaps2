var map = L.map('map').setView([-27.5, 153.2], 11);

// Base satellite layer
var satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles © Esri'
}).addTo(map);

// OSM labels overlay (street names)
var osmLabels = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  opacity: 0.6
}).addTo(map);

// Load KML
var features = [];
var layer = omnivore.kml('data.kml')
  .on('ready', function() {
    layer.eachLayer(function(l) {
      var props = l.feature.properties;
      var id = props['Unique ID'] || props['MowingID'] || props['Mowing ID'] || props['name'];
      if (id) features.push({ id: id, layer: l });

      var cuts = props['CutsPerYear'];
      var color = 'red';
      if (cuts == 15) color = 'green';
      if (cuts == 18) color = 'blue';

      if (l.setStyle) {
        l.setStyle({ color: color, weight: 2 });
      }
      l.bindPopup("ID: " + id + "<br>CutsPerYear: " + cuts);
    });
  })
  .addTo(map);

// Fuse.js search
var fuse = new Fuse(features, {
  keys: ['id'],
  threshold: 0.4,
  includeScore: true
});

function performSearch(query) {
  if (!query) return;
  var results = fuse.search(query);
  if (results.length > 0) {
    var match = results[0].item;
    map.fitBounds(match.layer.getBounds());
    match.layer.openPopup();
  }
}

document.getElementById('search-input').addEventListener('input', function(e) {
  var query = e.target.value;
  var suggestionsDiv = document.getElementById('suggestions');
  suggestionsDiv.innerHTML = '';
  if (!query) return;
  var results = fuse.search(query);
  results.slice(0,5).forEach(r => {
    var div = document.createElement('div');
    div.textContent = r.item.id;
    div.onclick = function() {
      performSearch(r.item.id);
      suggestionsDiv.innerHTML = '';
    };
    suggestionsDiv.appendChild(div);
  });
});

document.getElementById('search-input').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') performSearch(e.target.value);
});

document.getElementById('search-button').addEventListener('click', function() {
  var query = document.getElementById('search-input').value;
  performSearch(query);
});
