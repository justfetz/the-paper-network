"""OpenStreetMap Overpass: industrial features whose name mentions corrugated/box/packaging/paper mill. No key; coverage is partial.
Usage: python overpass.py ../data/plants_osm.csv"""
import sys, json, urllib.request, urllib.parse, pandas as pd
Q = '''[out:json][timeout:180];area["ISO3166-1"="US"]->.us;(nwr["name"~"[Cc]orrugat|[Bb]ox [Pp]lant|[Cc]ontainerboard|[Pp]aper [Mm]ill|[Pp]ackaging"]["landuse"="industrial"](area.us);
nwr["industrial"~"paper_mill|packaging"](area.us);nwr["name"~"International Paper|WestRock|Smurfit|Packaging Corp|Georgia-Pacific|Pratt Industries|Green Bay Packaging|Cascades|New-Indy"](area.us););out center tags;'''
def main(dst):
    data = urllib.parse.urlencode({"data": Q}).encode()
    js = json.load(urllib.request.urlopen(urllib.request.Request("https://overpass-api.de/api/interpreter", data=data, headers={"User-Agent": "the-paper-network"})))
    rows = [dict(osm_id=e["id"], name=e["tags"].get("name"), lat=e.get("lat", e.get("center", {}).get("lat")), lon=e.get("lon", e.get("center", {}).get("lon")), tags=json.dumps(e["tags"])) for e in js["elements"]]
    pd.DataFrame(rows).to_csv(dst, index=False); print(len(rows), "features ->", dst)
if __name__ == "__main__": main(sys.argv[1])
