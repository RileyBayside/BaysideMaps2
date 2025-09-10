# Mapbox Mowing Map (GitHub-ready)

This repository contains a simple Mapbox GL JS example that loads a local `data.geojson` file and provides a **search by MowingID** feature.

## Files
- `index.html` — main page
- `style.css` — basic styles
- `app.js` — JavaScript that boots the map, loads `data.geojson`, and implements search
- `data.geojson` — your provided GeoJSON file (copied into the ZIP)
- `README.md` — this file

## How to use
1. Unzip the repository into a GitHub repository folder.
2. Commit all files and push to GitHub.
3. In GitHub Pages settings, enable Pages to serve from the `main` branch (root).
4. The page will be served (be aware GitHub Pages may need a minute to build).

> The map uses the Mapbox GL JS library for map rendering and your provided access token in `app.js`. The map style uses a public demo style URL to avoid requiring Mapbox-styles setup. If you'd like to use a Mapbox style, replace the `style` value in `app.js` with a Mapbox style URL (like `mapbox://styles/yourusername/yourstyle`) and ensure your token has proper access.

## Notes & troubleshooting
- Keep `data.geojson` in the same directory as `index.html`.
- If your GeoJSON contains large polygons and the initial view doesn't show them, adjust the `center` and `zoom` in `app.js`.
- The search looks for properties with keys similar to `MowingID` (case-insensitive). Example search: `M0312`.

