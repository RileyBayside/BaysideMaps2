# Cuts Per Year Map (Leaflet)

A simple Leaflet web map that renders your GeoJSON points, colors them by **CutsPerYear**, and shows the **Unique ID** as a permanent label. It also includes a smart search box so searching `123` will zoom to `M0123`.

## How to use

1. Put your `data.geojson` file in the project root (already done here).
2. Open `index.html` in a local server (or push to GitHub Pages).

> Tip for local testing: run a quick server:
>
> - **Python 3**: `python -m http.server 8080`
> - Then open http://localhost:8080

## Tiles

- Satellite imagery from Esri World Imagery.
- Reference label overlays for boundaries/places and transportation (street names).

No API keys are required for this configuration.
