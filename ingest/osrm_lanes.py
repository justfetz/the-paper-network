"""Routed road miles and drive time for every mill -> market lane, from OSRM over OpenStreetMap. No key.

    python ingest/osrm_lanes.py data/paper_network.json data/lanes_osrm.csv
    python ingest/osrm_lanes.py data/paper_network.json data/lanes_osrm.csv --server http://localhost:5000   # self-hosted

Also writes data/lanes_osrm_summary.json: the median and spread of road miles / great-circle miles, which is
the measured replacement for the model's single road factor (1.2 in model/netmodel.py FREIGHT). export_json.py
reads lanes_osrm.csv when it exists and prices every arc on its own routed miles; a lane the file does not
cover falls back to the median ratio.

HONESTY. The public demo server (router.project-osrm.org) runs the CAR profile; a truck profile (weight,
height, hazmat) needs a self-hosted router with a truck Lua profile. Car routing still fixes the geometry
(real roads around lakes, mountains and borders) that 1.2 x great-circle cannot see; the summary says
"profile: driving (car)". The demo server asks for light use: this script makes at most a few dozen table
requests (100 coordinates each), pauses between them, and identifies itself. Run it quarterly, not nightly.

UNITS. OSRM distances are metres and durations seconds; the CSV carries miles and minutes.
"""
import argparse, json, math, os, sys, time, urllib.request
import pandas as pd

DEFAULT_SERVER = "https://router.project-osrm.org"
MAX_TABLE_COORDS = 100          # the demo server's max-table-size
MILLS_PER_CALL, NODES_PER_CALL = 25, 75
R_MI = 3958.8


def haversine(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(math.radians, (lat1, lon1, lat2, lon2))
    a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * R_MI * math.asin(math.sqrt(a))


def chunks(seq, n):
    return [seq[i:i + n] for i in range(0, len(seq), n)]


def plan_calls(n_mills, n_nodes, mills_per=MILLS_PER_CALL, nodes_per=NODES_PER_CALL):
    """How the pairs are batched into table requests. Pure; tested."""
    assert mills_per + nodes_per <= MAX_TABLE_COORDS
    return [(m, n) for m in chunks(list(range(n_mills)), mills_per) for n in chunks(list(range(n_nodes)), nodes_per)]


def table(server, sources, destinations, pause=1.2):
    coords = ";".join(f"{lon:.5f},{lat:.5f}" for lat, lon in sources + destinations)
    src = ";".join(str(i) for i in range(len(sources)))
    dst = ";".join(str(len(sources) + i) for i in range(len(destinations)))
    url = f"{server}/table/v1/driving/{coords}?sources={src}&destinations={dst}&annotations=distance,duration"
    req = urllib.request.Request(url, headers={"User-Agent": "the-paper-network/ingest (public model; light use; https://github.com/justfetz/the-paper-network)"})
    body = json.load(urllib.request.urlopen(req, timeout=120))
    if body.get("code") != "Ok":
        raise SystemExit(f"OSRM answered {body.get('code')}: {body.get('message')}")
    time.sleep(pause)
    return body["distances"], body["durations"]


def summarize(lanes: pd.DataFrame) -> dict:
    ok = lanes[lanes.road_miles.notna() & (lanes.gc_miles > 0)]
    r = ok.road_miles / ok.gc_miles
    return dict(source="OSRM over OpenStreetMap", profile="driving (car) — a truck profile needs a self-hosted router",
                lanes=int(len(lanes)), routed=int(len(ok)), unrouted=int(len(lanes) - len(ok)),
                ratio_median=round(float(r.median()), 4) if len(ok) else None,
                ratio_p10=round(float(r.quantile(0.10)), 4) if len(ok) else None,
                ratio_p90=round(float(r.quantile(0.90)), 4) if len(ok) else None,
                replaces="model/netmodel.py FREIGHT.road_factor = 1.2 (every lane); export_json.py uses lanes_osrm.csv per arc when present")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("network_json"); ap.add_argument("dst"); ap.add_argument("--server", default=DEFAULT_SERVER)
    ap.add_argument("--only-arcs", action="store_true", help="route only the arcs the current fp2026 scenario uses, not every mill x market pair")
    a = ap.parse_args()
    d = json.load(open(a.network_json))
    mills = [m for m in d["mills"] if m.get("status") == "open" or True]   # every mill, closed ones included: a reopening needs its lanes
    nodes = d["nodes"]
    want = None
    if a.only_arcs:
        want = {(arc[0], arc[1]) for arc in d["scenarios"]["fp2026"]["arcs"]}
    rows = []
    calls = plan_calls(len(mills), len(nodes))
    print(f"{len(mills)} mills x {len(nodes)} markets in {len(calls)} table calls via {a.server}")
    for k, (mi, ni) in enumerate(calls, start=1):
        src = [(mills[i]["lat"], mills[i]["lon"]) for i in mi]
        dst = [(nodes[j]["lat"], nodes[j]["lon"]) for j in ni]
        dist, dur = table(a.server, src, dst)
        for a_i, i in enumerate(mi):
            for b_j, j in enumerate(ni):
                if want is not None and (mills[i]["id"], j) not in want:
                    continue
                gc = haversine(mills[i]["lat"], mills[i]["lon"], nodes[j]["lat"], nodes[j]["lon"])
                dm, du = dist[a_i][b_j], dur[a_i][b_j]
                rows.append(dict(mill_id=mills[i]["id"], node_id=nodes[j]["id"], gc_miles=round(gc, 1),
                                 road_miles=(round(dm / 1609.344, 1) if dm is not None else None),
                                 drive_min=(round(du / 60.0, 1) if du is not None else None)))
        print(f"  call {k}/{len(calls)} done, {len(rows)} lanes")
    lanes = pd.DataFrame(rows)
    lanes["ratio"] = (lanes.road_miles / lanes.gc_miles).round(4)
    lanes.to_csv(a.dst, index=False)
    s = summarize(lanes); s["pulled"] = pd.Timestamp.now("UTC").strftime("%Y-%m-%d"); s["server"] = a.server
    spath = os.path.join(os.path.dirname(os.path.abspath(a.dst)), "lanes_osrm_summary.json")
    json.dump(s, open(spath, "w"), indent=1)
    print(len(lanes), "lanes ->", a.dst, "| median road/gc", s["ratio_median"], "| summary ->", spath)


if __name__ == "__main__":
    main()
