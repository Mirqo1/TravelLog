# Country statistics data

Source: Natural Earth, Admin 0 Countries at 1:50m, retrieved 2026-09-16.

- Dataset: https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/
- Source GeoJSON: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
- License: public domain, https://www.naturalearthdata.com/about/terms-of-use/

`app/data/countries.json` contains 242 country/territory features. The geometry was simplified with Shapely `simplify(0.015, preserve_topology=True)`, rounded to four decimal places and delta-encoded at precision 1e-4. Each polygon is an array of encoded rings: exterior first, then holes. Each ring encodes longitude then latitude deltas using signed polyline encoding. `decodeRing` in `mapVisits.js` reverses this encoding.

Country labels/aliases come from Natural Earth name fields, plus Slovak aliases for the sample destinations. Counting prefers coordinates; when simplified coastlines omit a point, the saved country code or an exact country-name alias from the final locality segment is used. Existing records are not rewritten. Unmatched visits remain available in Trips but do not increase the country statistic. Country polygons are no longer drawn on the map.

These are overview boundaries, not precise border or address data. Small islands, coastlines and disputed territories may differ from the Google basemap. Natural Earth includes dependent territories separately in some cases. Every saved visit counts once; revisiting the same location increases the count. Rating has no influence on heatmap density.

The point heatmap is visible at every zoom. Zoom transitions: below 5 no visit markers; from 5 to below 11 world-grid clusters (64 px cells); from 11 individual places. Coincident visits remain grouped so every record can be opened. Longitude wrapping is accounted for when filtering visible markers.

No additional native dependencies, paid geocoding service or change to the working Android build configuration is introduced.
