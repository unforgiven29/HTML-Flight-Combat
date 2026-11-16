# World data — sources, licences, dates

Built by `node scripts/build-world-data.js` on 2026-11-16. Do not edit the data files by hand.

| File | Content | Source | Licence | Accuracy |
|---|---|---|---|---|
| places.json | 7342 cities and towns: name, position, population (pop_max), country, capital flag | Natural Earth 1:10m Populated Places (simple), naturalearthdata.com | Public domain | Positions to about 1 km; populations are Natural Earth estimates, not census counts |
| airports.json | 7480 airports (large, medium, and paved small fields of 1,500 m or more) with runway ends, headings, length, width, surface | OurAirports (ourairports.com, data mirror github.com/davidmegginson/ourairports-data) | Public domain | Community-maintained; runway ends missing for some fields (placed from the heading instead). Military flag inferred from the name |
| tiles/*.json | Per 10-degree cell: towns and cities of 1,000+ people (name, position, population) and urban-area outlines (simplified 0.004 deg) | GeoNames via github.com/lmfmaier/cities-json (cities500); Natural Earth 1:10m Urban Areas | GeoNames: CC BY 4.0 (attribution: GeoNames, geonames.org). Natural Earth: public domain | Town positions are the GeoNames point (the centre); urban outlines come from 2002-era satellite land cover, so recent growth is missing |
| countries.json | 237 country outlines, simplified (0.04 deg) and quantised to 0.01 deg | Natural Earth 1:50m Admin 0 Countries | Public domain | Map display only; boundaries as Natural Earth draws them (de facto), not a statement on any dispute |
| elev-2048.png | Global elevation and bathymetry, 2048 x 1024 equirectangular (about 20 km per cell), Terrarium encoding (R*256 + G - 32768 m) | AWS Open Data Terrain Tiles, zoom 4 | Open; attribution: SRTM (NASA), GMTED2010 (USGS), ETOPO1 (NOAA), and others listed at github.com/tilezen/joerd/blob/master/docs/attribution.md | Coarse: world map and offline fallback only |

At run time the flight terrain streams the same Terrain Tiles at zoom 10 (about 150 m per pixel) from elevation-tiles-prod.s3.amazonaws.com (CORS enabled). Offline, the coarse grid plus procedural detail is used, and the game says so.
