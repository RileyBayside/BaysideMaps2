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

    // Fill layer with color taken from "fill" property if it exists
    map.addLayer({
        id: 'mowing-fill',
        type: 'fill',
        source: 'mowing',
        paint: {
            'fill-color': [
                'case',
                ['has', 'fill'],
                ['get', 'fill'],
                '#088' // default color if no fill property
            ],
            'fill-opacity': 0.6
        }
    });

    // Outline layer
    map.addLayer({
        id: 'mowing-outline',
        type: 'line',
        source: 'mowing',
        paint: {
            'line-color': '#000',
            'line-width': 1
        }
    });

    // Popup showing all properties
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
