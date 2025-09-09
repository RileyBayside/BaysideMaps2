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

    // Build legend dynamically from unique "fill" values
    fetch('data/mowing.geojson')
        .then(res => res.json())
        .then(data => {
            const fills = new Set();
            data.features.forEach(f => {
                if (f.properties && f.properties.fill) {
                    fills.add(f.properties.fill);
                }
            });
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
        });
});
