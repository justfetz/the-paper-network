"""Google Places API (New) text search for box plants around each demand node. Needs GOOGLE_MAPS_API_KEY (Places API enabled).
Cost: ~$32 per 1,000 text-search requests. Usage: python google_places.py ../data/demand_nodes.csv ../data/plants_places.csv"""
import os, sys, json, time, urllib.request, pandas as pd
QUERIES = ["corrugated box plant", "corrugated packaging manufacturer", "sheet plant corrugated", "paper mill containerboard"]
def search(q, lat, lon, key, radius_m=120000):
    body = json.dumps({"textQuery": q, "locationBias": {"circle": {"center": {"latitude": lat, "longitude": lon}, "radius": radius_m}}, "pageSize": 20}).encode()
    req = urllib.request.Request("https://places.googleapis.com/v1/places:searchText", data=body, headers={"Content-Type": "application/json", "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.websiteUri,places.nationalPhoneNumber"})
    return json.load(urllib.request.urlopen(req)).get("places", [])
def main(nodes_csv, dst):
    key = os.environ["GOOGLE_MAPS_API_KEY"]; nodes = pd.read_csv(nodes_csv); seen, rows = set(), []
    for n in nodes.itertuples():
        for q in QUERIES:
            for p in search(q, n.lat, n.lon, key):
                if p["id"] in seen: continue
                seen.add(p["id"]); rows.append(dict(place_id=p["id"], name=p["displayName"]["text"], address=p.get("formattedAddress"), lat=p["location"]["latitude"], lon=p["location"]["longitude"],
                                                     types="|".join(p.get("types", [])), website=p.get("websiteUri"), phone=p.get("nationalPhoneNumber"), query_node=n.node_id, query=q))
            time.sleep(0.1)
    pd.DataFrame(rows).to_csv(dst, index=False); print(len(rows), "places ->", dst)
if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
