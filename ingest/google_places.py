"""Google Places API (New) text search for box plants around each demand node. Needs GOOGLE_MAPS_API_KEY (Places API (New) enabled).
Cost (Oct 2026): the default field mask is the Pro SKU: 5,000 free calls a month, then $32 per 1,000. Asking for website or phone moves
every call to the Enterprise SKU (1,000 free, $35 per 1,000); opt in with PLACES_FIELDS=enterprise. 441 nodes x 4 queries = 1,764 calls,
inside the free Pro allowance; PLACES_MAX_REQUESTS (default 4500) is a hard stop. Partial results are saved on any error.
Usage: python google_places.py ../data/demand_nodes.csv ../data/plants_places.csv"""
import os, sys, json, time, urllib.request, urllib.error, pandas as pd
QUERIES = ["corrugated box plant", "corrugated packaging manufacturer", "sheet plant corrugated", "paper mill containerboard"]
PRO = "places.id,places.displayName,places.formattedAddress,places.location,places.types"
FIELDS = PRO + (",places.websiteUri,places.nationalPhoneNumber" if os.environ.get("PLACES_FIELDS") == "enterprise" else "")
MAX_REQUESTS = int(os.environ.get("PLACES_MAX_REQUESTS", "4500"))

def search(q, lat, lon, key, radius_m=120000):
    body = json.dumps({"textQuery": q, "locationBias": {"circle": {"center": {"latitude": lat, "longitude": lon}, "radius": radius_m}}, "pageSize": 20}).encode()
    req = urllib.request.Request("https://places.googleapis.com/v1/places:searchText", data=body, headers={"Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS})
    return json.load(urllib.request.urlopen(req, timeout=30)).get("places", [])

def main(nodes_csv, dst):
    key = os.environ["GOOGLE_MAPS_API_KEY"]; nodes = pd.read_csv(nodes_csv); seen, rows, calls, err = set(), [], 0, None
    try:
        for n in nodes.itertuples():
            for q in QUERIES:
                if calls >= MAX_REQUESTS: raise StopIteration
                calls += 1
                for p in search(q, n.lat, n.lon, key):
                    if p["id"] in seen: continue
                    seen.add(p["id"]); rows.append(dict(place_id=p["id"], name=p["displayName"]["text"], address=p.get("formattedAddress"), lat=p["location"]["latitude"], lon=p["location"]["longitude"],
                                                         types="|".join(p.get("types", [])), website=p.get("websiteUri"), phone=p.get("nationalPhoneNumber"), query_node=n.node_id, query=q))
                time.sleep(0.1)
    except StopIteration:
        print(f"stopped at the PLACES_MAX_REQUESTS cap ({MAX_REQUESTS})")
    except urllib.error.HTTPError as e:
        err = f"HTTP {e.code}: {e.read()[:300].decode(errors='replace')}"
    except Exception as e:  # keep what we have
        err = repr(e)
    pd.DataFrame(rows).to_csv(dst, index=False); print(f"{calls} requests, {len(rows)} distinct places -> {dst}" + (f"; stopped on {err}" if err else ""))
    if err: sys.exit(1)

if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
