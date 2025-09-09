# Mowing & Vegetation Management — Mapbox GL JS

A minimal, production-ready Mapbox GL JS site that visualizes your GeoJSON and works on GitHub Pages.

## 🚀 Quick start (GitHub Pages)

1. Create a new repository on GitHub and upload the contents of this ZIP.
2. Commit & push.
3. In the repository settings, enable **GitHub Pages** (deploy from the default branch).
4. Visit your GitHub Pages URL (usually `https://<username>.github.io/<repo>/`).

> If you use a custom subfolder, all paths here are relative, so it will still work.

## 🗺️ What's inside

- `index.html` — the app shell that loads Mapbox GL JS, UI controls, and scripts.
- `style.css` — clean minimal styling.
- `config.js` — where your Mapbox token lives (already filled from your request).
- `script.js` — loads `data/mowing.geojson`, adds layers for points/lines/polygons, popups, and a fit-to-data button.
- `data/mowing.geojson` — your uploaded data file.

## 🔑 Token

Your Mapbox token is stored in `config.js` as `window.MAPBOX_TOKEN`. Replace it anytime if needed.

## 🧩 Notes

- The code auto-handles Point, LineString, and Polygon features.
- On style changes, layers are re-added automatically.
- Fit-to-data uses Turf.js (loaded from a CDN) for robust bounds calculation.
- Everything is referenced with **relative paths**, so it works on GitHub Pages out of the box.

## 🛠️ Local development

You can test locally with any static file server, e.g.:

```bash
# From the project root
python3 -m http.server 8080
# then open http://localhost:8080
```

Enjoy! 🎉
