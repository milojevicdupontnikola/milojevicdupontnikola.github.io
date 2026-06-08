import json
import geopandas as gpd

df = gpd.read_file("footprints.geojson")
centroid = df.geometry.centroid.unary_union.centroid
df.geometry = df.geometry.translate(xoff=-centroid.x, yoff=-centroid.y)
df.to_file("footprints_centered.geojson", driver="GeoJSON")
with open("centroid.json", "w") as f:
    json.dump({"x": centroid.x, "y": centroid.y}, f)

df2 = gpd.read_file("footprints_centered.geojson")
print(f"Features: {len(df2)}")
print(f"Bounds: {df2.total_bounds}")
