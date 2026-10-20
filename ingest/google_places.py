"""Google Places API (New) text search for box plants around each demand node. Needs GOOGLE_MAPS_API_KEY (Places API (New) enabled).
Cost (Oct 2026): the default field mask is the Pro SKU: 5,000 free calls a month, then $32 per 1,000. Asking for website or phone moves
every call to the Enterprise SKU (1,000 free, $35 per 1,000); opt in with PLACES_FIELDS=enterprise. 441 nodes x 4 queries = 1,764 calls,
inside the free Pro allowance; PLACES_MAX_REQUESTS (default 4500) is a hard stop. Partial results are saved on any error.
Usage: python google_places.py ../data/demand_nodes.csv ../data/plants_places.csv"""
import os, sys, json, time, urllib.request, urllib.error, pandas as pd
QUERIES = ["corrugated box plant", "corrugated packaging manufacturer", "sheet plant corrugated", "paper mill containerboard"]
PRO = "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.businessStatus"
FIELDS = PRO + (",places.websiteUri,places.nationalPhoneNumber" if os.environ.get("PLACES_FIELDS") == "enterprise" else "")
MAX_REQUESTS = int(os.environ.get("PLACES_MAX_REQUESTS", "4500"))

def search(q, lat, lon, key, radius_m=50000):   # the API caps a locationBias circle at 50 km
    body = json.dumps({"textQuery": q, "locationBias": {"circle": {"center": {"latitude": lat, "longitude": lon}, "radius": radius_m}}, "pageSize": 20}).encode()
    req = urllib.request.Request("https://places.googleapis.com/v1/places:searchText", data=body, headers={"Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS})
    return json.load(urllib.request.urlopen(req, timeout=30)).get("places", [])

def main(nodes_csv, dst):
    key = os.environ["GOOGLE_MAPS_API_KEY"]; nodes = pd.read_csv(nodes_csv); seen, rows, calls, err, quota = set(), [], 0, None, False
    done = set()
    if os.path.exists(dst):   # resume: the (node, query) pairs already searched are skipped, so a daily quota of a few hundred calls finishes the list over a few runs
        prev = pd.read_csv(dst); rows = prev.to_dict("records"); seen = set(prev.place_id); done = set(zip(prev.query_node.astype(int), prev["query"]))
    try:
        for n in nodes.itertuples():
            for q in QUERIES:
                if (int(n.node_id), q) in done: continue
                if calls >= MAX_REQUESTS: raise StopIteration
                calls += 1
                for p in search(q, n.lat, n.lon, key):
                    if p["id"] in seen: continue
                    seen.add(p["id"]); rows.append(dict(place_id=p["id"], name=p["displayName"]["text"], address=p.get("formattedAddress"), lat=p["location"]["latitude"], lon=p["location"]["longitude"],
                                                         types="|".join(p.get("types", [])), primary_type=p.get("primaryType"), business_status=p.get("businessStatus"), website=p.get("websiteUri"), phone=p.get("nationalPhoneNumber"), query_node=n.node_id, query=q))
                time.sleep(0.1)
    except StopIteration:
        print(f"stopped at the PLACES_MAX_REQUESTS cap ({MAX_REQUESTS})")
    except urllib.error.HTTPError as e:
        body = e.read()[:300].decode(errors="replace")
        if e.code == 429: quota = True; print(f"daily quota reached after {calls} requests this run; results so far are saved, rerun tomorrow or raise 'SearchText requests per day' in the Google Cloud console (APIs & Services, Places API (New), Quotas)")
        else: err = f"HTTP {e.code}: {body}"
    except Exception as e:  # keep what we have
        err = repr(e)
    pd.DataFrame(rows).to_csv(dst, index=False)
    remaining = sum(1 for n in nodes.itertuples() for q in QUERIES if (int(n.node_id), q) not in done) - calls
    print(f"{calls} requests this run, {len(rows)} distinct places -> {dst}; {max(remaining, 0)} (node, query) searches still to do" + (f"; stopped on {err}" if err else ""))
    if err: sys.exit(1)

if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
