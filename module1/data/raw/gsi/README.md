# GSI landslide susceptibility (drop folder)

Put a GeoJSON export of the GSI National Landslide Susceptibility Map (NLSM) here, e.g.
`wayanad_nlsm.geojson`. Any feature whose properties contain the value `High` or `Very High`
is used as a monitoring hotspot (polygon centroid). Then rebuild the hotspots:

```
python -m module1.monitoring.hotspots
```

Where to get it: GSI Bhukosh (https://bhukosh.gsi.gov.in → Data download → Landslide susceptibility),
or GSI Bhusanket (https://bhusanket.gsi.gov.in). Shapefiles can be converted to GeoJSON in QGIS
(Export → Save Features As → GeoJSON, CRS EPSG:4326).

Until a file is present, hotspots come from the steepest terrain in the real Copernicus GLO-30 DEM
and are labelled as a terrain proxy.
