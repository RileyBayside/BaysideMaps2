mapboxgl.accessToken = mapboxgl.accessToken;

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [153.25, -27.55],
    zoom: 11
});

map.on('load', () => {
    map.addSource('mowing', {
        type: 'geojson',
        data: 'data/mowing.geojson'
    });

    map.addLayer({
        id: 'mowing-fill',
        type: 'fill',
        source: 'mowing',
        paint: {
            'fill-color': [
                'case',
                ['has', 'fill'],
                ['get', 'fill'],
                '#088'
            ],
            'fill-opacity': 0.6
        }
    });

    map.addLayer({
        id: 'mowing-outline',
        type: 'line',
        source: 'mowing',
        paint: {
            'line-color': '#000',
            'line-width': 1
        }
    });

    // Build legend + dropdown
    fetch('data/mowing.geojson')
        .then(res => res.json())
        .then(data => {
            const fills = new Set();
            const cuts = new Set();
            data.features.forEach(f => {
                if (f.properties) {
                    if (f.properties.fill) fills.add(f.properties.fill);
                    if (f.properties.CutsPerYear) cuts.add(f.properties.CutsPerYear);
                }
            });

            // Legend
            const legendItems = document.getElementById('legend-items');
            fills.forEach(color => {
                const item = document.createElement('div');
                item.className = 'legend-item';
                const box = document.createElement('span');
                box.className = 'legend-color';
                box.style.backgroundColor = color;
                const label = document.createElement('span');
                label.textContent = color;
                item.appendChild(box);
                item.appendChild(label);
                legendItems.appendChild(item);
            });

            // Dropdown for CutsPerYear
            const cutsSelect = document.getElementById('cutsSelect');
            Array.from(cuts).sort((a,b)=>a-b).forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                cutsSelect.appendChild(opt);
            });

            cutsSelect.addEventListener('change', () => {
                const val = cutsSelect.value;
                if (val === 'all') {
                    map.setFilter('mowing-fill', null);
                    map.setFilter('mowing-outline', null);
                } else {
                    const filter = ['==', ['get', 'CutsPerYear'], parseInt(val)];
                    map.setFilter('mowing-fill', filter);
                    map.setFilter('mowing-outline', filter);
                }
            });

            // Search by MowingID
            document.getElementById('searchBtn').addEventListener('click', () => {
                const input = document.getElementById('searchInput').value.trim();
                if (!input) return;
                const feature = data.features.find(f => f.properties && f.properties.MowingID === input);
                if (feature) {
                    const bbox = turf.bbox(feature);
                    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {padding: 40, duration: 1000});
                } else {
                    alert('MowingID not found: ' + input);
                }
            });
        });

    // Popup
    map.on('click', 'mowing-fill', (e) => {
        const props = e.features[0].properties;
        let html = '<h4>Feature Properties</h4><pre>' + JSON.stringify(props, null, 2) + '</pre>';
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
    });

    map.on('mouseenter', 'mowing-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'mowing-fill', () => {
        map.getCanvas().style.cursor = '';
    });
});

// Load Turf
const turfScript = document.createElement('script');
turfScript.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
document.head.appendChild(turfScript);
