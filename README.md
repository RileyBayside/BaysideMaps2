# Leaflet KML Map (Satellite) with Fuzzy Search

Files:
- `index.html` — the main HTML page (loads `data.kml` and shows the map).
- `style.css` — minimal styling for UI.
- `data.kml` — your original KML (copied here).
- `leaflet_kml_map.zip` — this ZIP (if you downloaded it).

How to use:
1. Place the entire folder in a GitHub repository.
2. Enable GitHub Pages for the repository (select `main` branch / `root`).
3. The `index.html` will load the `data.kml` (ensure `data.kml` path is correct).
4. Use the search box (top-left) to search by Unique ID or MowingID (e.g. `M0123`).
   - The search suggests matches and performs fuzzy matching if you type imperfectly.

Notes:
- The map uses Esri World Imagery tiles for satellite basemap.
- The page references CDN scripts (Leaflet and leaflet-omnivore). This is standard and works on GitHub Pages.

If you want me to:
- extract specific property names into a table or style features by attribute,
- convert the KML to GeoJSON client-side and save it as a file inside the repo,
- or auto-generate a legend for CutsPerYear/AnnualRotations,
tell me and I will update the bundle.
