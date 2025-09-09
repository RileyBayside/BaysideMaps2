# Mowing Map (Mapbox GL JS)

A lightweight Mapbox web app you can drop into GitHub Pages. It supports:
- Search by **MowingID** (e.g. `M0312`)
- Filter by **CutsPerYear**
- Colours are driven by **CutsPerYear** and shown in the legend
- Works for Points, Lines, and Polygons

## How to use

1. Put your data file at: `data/mowing.json` (GeoJSON **FeatureCollection**).
   - Required properties on each feature:
     - `MowingID`: string like `M0312`
     - `CutsPerYear`: number like `8`
2. If your file has different property names (e.g. `cutsperyear`), the app tries to normalise them automatically.
3. Deploy to GitHub Pages (root must contain `index.html`).

### Access token

This app is configured with your token in `index.html`:
```
pk.eyJ1IjoicmlsZXliYXlzaWRlIiwiYSI6ImNtZmJwanh1NzI0NmIya29tYWF1Nm1keXcifQ.gM0QSnc4FBcPt7hCEFS4Vg
```

### Data format example

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "MowingID": "M0312",
        "CutsPerYear": 8
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          153.0251,
          -27.4698
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "MowingID": "M0132",
        "CutsPerYear": 4
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              153.01,
              -27.47
            ],
            [
              153.013,
              -27.47
            ],
            [
              153.013,
              -27.472
            ],
            [
              153.01,
              -27.472
            ],
            [
              153.01,
              -27.47
            ]
          ]
        ]
      }
    }
  ]
}
```

---
Generated: 2025-09-09T22:17:12.925429
