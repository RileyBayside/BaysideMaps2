
# Mapbox Mowing Map

This is a simple Mapbox web map project intended to be uploaded to GitHub Pages.
Files included:
- index.html
- style.css
- app.js
- data.geojson (REPLACE this file with your actual GeoJSON file before publishing)
- README.md

**How to use**
1. Replace `data.geojson` in this folder with your provided GeoJSON file (keep the name `data.geojson`).
2. Commit & push to GitHub.
3. Enable GitHub Pages on the repo (branch `main` / `docs` or root depending on your repo settings).
4. Open the page and use the search box to search by `MowingID` (example `M0312`).

**Notes**
- The Mapbox access token is already embedded in `app.js` (you provided it). If you'd prefer, remove it and use your own token at runtime.
- The map fits to the GeoJSON bounds automatically.
