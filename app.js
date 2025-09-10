// Mapbox GL JS map + search by MowingID
mapboxgl.accessToken = 'pk.eyJ1IjoicmlsZXliYXlzaWRlIiwiYSI6ImNtZmRmODF2bzAwdWsya29lZG9xbTZ3d2sifQ.Feu5Igf-z-_2G-MAq_Rj5A';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json', // lightweight, non-Mapbox style to avoid token style issues
  center: [153.0, -27.5],
  zoom: 10
});

map.addControl(new mapboxgl.NavigationControl());

map.on('load', async () => {

  // Populate AnnualRotations dropdown
  const rotationSelect = document.getElementById('rotationFilter');
  const uniqueRotations = [...new Set(geojson.features.map(f => f.properties?.AnnualRotations).filter(v => v !== undefined && v !== null))];
  uniqueRotations.sort((a,b) => Number(a) - Number(b));
  uniqueRotations.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    rotationSelect.appendChild(opt);
  });

  rotationSelect.addEventListener('change', () => {
    const val = rotationSelect.value;
    if (!val) {
      map.setFilter((geomType === 'Point'||geomType==='MultiPoint') ? 'mowing-points' : 'mowing-fill', null);
      if(map.getLayer('mowing-line')) map.setFilter('mowing-line', null);
      return;
    }
    const filter = ['==', ['get', 'AnnualRotations'], val];
    if (geomType === 'Point' || geomType === 'MultiPoint') {
      map.setFilter('mowing-points', filter);
    } else {
      map.setFilter('mowing-fill', filter);
      if(map.getLayer('mowing-line')) map.setFilter('mowing-line', filter);
    }
  });

  // Load the local GeoJSON file (data.geojson must be in same repo)
  const resp = await fetch('data.geojson');
  const geojson = await resp.json();

  // Add source and layers
  map.addSource('mowing', {
    type: 'geojson',
    data: geojson,
    cluster: false
  });

  // If features are polygons, use fill; if points, use circle. We'll attempt to detect geometry type:
  const geomType = geojson.features && geojson.features.length ? geojson.features[0].geometry.type : 'Point';
  if (geomType === 'Point' || geomType === 'MultiPoint') {
    map.addLayer({
      id: 'mowing-points',
      type: 'circle',
      source: 'mowing',
      paint: {
        'circle-radius': 6,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff'
      }
    });
  } else {
    map.addLayer({
      id: 'mowing-fill',
      type: 'fill',
      source: 'mowing',
      paint: {
        'fill-color': '#088',
        'fill-opacity': 0.4
      }
    });
    map.addLayer({
      id: 'mowing-line',
      type: 'line',
      source: 'mowing',
      paint: {
        'line-color': '#005',
        'line-width': 2
      }
    });
  }

  // Popup on click
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: (geomType === 'Point'||geomType==='MultiPoint') ? ['mowing-points'] : ['mowing-fill','mowing-line'] });
    if (!features.length) return;
    const f = features[0];
    const props = f.properties || {};
    const mowID = props.MowingID || props.mowingid || props.mowing_id || 'unknown';
    const html = `<strong>MowingID:</strong> ${mowID}<br><pre>${JSON.stringify(props, null, 2)}</pre>`;
    new mapboxgl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
  });

  // Search functionality
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchBtn');
  const reset = document.getElementById('resetBtn');

  function findFeatureByMowingID(id){
    if(!id) return null;
    id = id.trim();
    const features = geojson.features.filter(f => {
      const p = f.properties || {};
      // check multiple possible property keys, case-insensitive
      for(const key of Object.keys(p)){
        if(key.toLowerCase() === 'mowingid' || key.toLowerCase().includes('mowing')){
          if(String(p[key]).trim().toLowerCase() === id.toLowerCase()) return true;
        }
      }
      return false;
    });
    return features;
  }

  btn.addEventListener('click', () => {
    const val = input.value.trim();
    if(!val) return alert('Enter a MowingID to search, e.g. M0312');
    const found = findFeatureByMowingID(val);
    if(!found || !found.length){
      alert('No feature found with MowingID: ' + val);
      return;
    }
    // Zoom to first found feature and open popup
    const f = found[0];
    const coords = (f.geometry.type === 'Point') ? f.geometry.coordinates : turfCentroidCoordinates(f.geometry);
    map.flyTo({center: coords, zoom: 16});
    const props = f.properties || {};
    const mowID = props.MowingID || props.mowingid || props.mowing_id || 'unknown';
    const html = `<strong>MowingID:</strong> ${mowID}<br><pre>${JSON.stringify(props, null, 2)}</pre>`;
    new mapboxgl.Popup().setLngLat(coords).setHTML(html).addTo(map);

    // highlight the found feature by updating the source with a filter
    if(geomType === 'Point' || geomType === 'MultiPoint'){
      // create a temporary layer for highlight
      if(map.getLayer('mowing-highlight')) map.removeLayer('mowing-highlight');
      if(map.getSource('mowing-highlight')) map.removeSource('mowing-highlight');
      map.addSource('mowing-highlight', {
        type: 'geojson',
        data: f
      });
      map.addLayer({
        id: 'mowing-highlight',
        type: 'circle',
        source: 'mowing-highlight',
        paint: {
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });
    } else {
      if(map.getLayer('mowing-highlight')) map.removeLayer('mowing-highlight');
      if(map.getSource('mowing-highlight')) map.removeSource('mowing-highlight');
      map.addSource('mowing-highlight', { type:'geojson', data: f });
      map.addLayer({
        id:'mowing-highlight',
        type:'line',
        source:'mowing-highlight',
        paint:{ 'line-color':'#ff0000','line-width':4 }
      });
    }
  });

  reset.addEventListener('click', () => {
    // Remove highlight
    if(map.getLayer('mowing-highlight')) map.removeLayer('mowing-highlight');
    if(map.getSource('mowing-highlight')) map.removeSource('mowing-highlight');
    // Reset view
    map.flyTo({center:[153.0,-27.5],zoom:10});
  });

  // small helper: compute centroid for non-point geometries using a basic bbox midpoint (no external libs)
  function turfCentroidCoordinates(geometry){
    // compute bbox
    let coords = [];
    const geomType = geometry.type;
    function addCoords(arr){
      if(Array.isArray(arr) && typeof arr[0] === 'number') coords.push(arr);
      else arr.forEach(addCoords);
    }
    addCoords(geometry.coordinates);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    coords.forEach(c => {
      const [x,y]=c;
      if(x<minX) minX=x;
      if(y<minY) minY=y;
      if(x>maxX) maxX=x;
      if(y>maxY) maxY=y;
    });
    return [(minX+maxX)/2, (minY+maxY)/2];
  }

}); // end load
