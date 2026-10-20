"""
The plant layer: EPA FRS box plants (NAICS 322211) and Census CBP county counts, aggregated to the demand nodes.
Produces data/plants_by_node.json (plants, employment, per node), a state-level comparison of the population proxy
against the measured distribution, and employment-based demand weights the model can use instead of the proxy.
Usage: python plants_layer.py ../data/plants_frs.csv ../data/cbp_322211_county.csv ../data/paper_network.json ../data/plants_by_node.json
"""
import sys, json, os, numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from netmodel import haversine, county_weights, aggregate_demand_nodes

OWNER_PATTERNS = [("International Paper", r"international paper|\bIP\b|temple.?inland|weyerhaeuser"), ("Smurfit Westrock", r"westrock|west rock|rock.?tenn|smurfit|kapstone|mead ?westvaco|meadwestvaco"),
    ("Packaging Corp of America", r"packaging corp|\bPCA\b|boise (packaging|inc|cascade)|greif|corrchoice"), ("Georgia-Pacific", r"georgia.?pacific|\bGP\b|color.?box"), ("Pratt Industries", r"\bpratt\b"),
    ("Green Bay Packaging", r"green bay packaging"), ("Cascades", r"cascades|norampac|greenpac"), ("New-Indy", r"new.?indy|rand.?whitney|kraft group"), ("Sonoco", r"sonoco"), ("Graphic Packaging", r"graphic packaging"),
    ("Menasha", r"menasha|orbis"), ("Schwarz Partners", r"schwarz|corrugated supplies"), ("US Corrugated", r"u\.?s\.? corrugated"), ("Welch Packaging", r"welch packaging"), ("Jamestown Container", r"jamestown container"),
    ("Royal Group", r"royal (containers|group|box)"), ("Bay Cities", r"bay cities"), ("Vanguard Packaging", r"vanguard packaging"), ("Liberty Diversified", r"liberty (carton|diversified|packaging)"), ("Great Northern", r"great northern"), ("Lawrence Paper", r"lawrence paper"), ("Central Container", r"central container"), ("Dusobox", r"dusobox"), ("Kelly Box", r"kelly box"), ("Dixie Box", r"dixie box")]
import re
def owner_guess(name):
    n = str(name)
    for o, rx in OWNER_PATTERNS:
        if re.search(rx, n, re.I): return o
    return "Independent / unknown"

def main(frs_csv, cbp_csv, pn_json, dst):
    D = json.load(open(pn_json)); nodes = pd.DataFrame(D["nodes"]); dem = np.array(D["scenarios"]["fp2026"]["node_demand"], dtype=float)
    out = dict(nodes=[dict() for _ in range(len(nodes))], sources={})
    # ---- EPA FRS: unique sites with coordinates, nearest demand node
    if frs_csv and os.path.exists(frs_csv):
        f = pd.read_csv(frs_csv, dtype=str, low_memory=False)
        f["lat"] = pd.to_numeric(f.lat, errors="coerce"); f["lon"] = pd.to_numeric(f.lon, errors="coerce")
        box = f[(f.naics == "322211")].drop_duplicates("registry_id").copy()
        box = box[box.lat.between(17, 72) & box.lon.between(-170, -60)]
        mills = f[f.naics.isin(["322130", "322120"])].drop_duplicates("registry_id")
        d = haversine(box.lat.values[:, None], box.lon.values[:, None], nodes.lat.values[None, :], nodes.lon.values[None, :])
        box["node"] = d.argmin(axis=1); box["node_mi"] = d.min(axis=1) * 1.2
        counts = box.groupby("node").size()
        for j in range(len(nodes)): out["nodes"][j]["frs_box_plants"] = int(counts.get(j, 0))
        out["sources"]["frs"] = dict(box_plants=int(len(box)), paper_and_board_mills=int(len(mills)), states=int(box.state.nunique()), note="EPA Facility Registry Service, NAICS 322211 unique sites with coordinates; FRS covers facilities with an environmental program record, so small sheet plants without permits can be missing")
        out["frs_by_state"] = box.state.value_counts().to_dict()
        box["owner_guess"] = box.name.map(owner_guess)
        box[["registry_id", "name", "owner_guess", "address", "city", "state", "zip", "lat", "lon", "node", "node_mi"]].to_csv(os.path.join(os.path.dirname(dst), "plants_frs_box.csv"), index=False)
        out["frs_by_owner"] = box.owner_guess.value_counts().to_dict()
    # ---- Census CBP: establishments and employment by county -> node (by county fips -> nearest node of that county's centroid)
    if cbp_csv and os.path.exists(cbp_csv):
        c = pd.read_csv(cbp_csv, dtype={"fips": str}); c["fips"] = c.fips.str.zfill(5)
        for col in ("estab", "emp", "payann"): c[col] = pd.to_numeric(c[col], errors="coerce").fillna(0)
        counties = pd.read_csv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "counties.csv"), dtype={"fips": str})
        c = c.merge(counties[["fips", "lat", "lon", "state"]], on="fips", how="inner")
        d = haversine(c.lat.values[:, None], c.lon.values[:, None], nodes.lat.values[None, :], nodes.lon.values[None, :]); c["node"] = d.argmin(axis=1)
        g = c.groupby("node").agg(estab=("estab", "sum"), emp=("emp", "sum"), payann=("payann", "sum"))
        for j in range(len(nodes)): out["nodes"][j].update(cbp_estab=int(g.estab.get(j, 0)), cbp_emp=int(g.emp.get(j, 0)))
        out["sources"]["cbp"] = dict(year=int(c.year.iloc[0]) if "year" in c else None, establishments=int(c.estab.sum()), employment=int(c.emp.sum()), counties=int(len(c)), note="County Business Patterns NAICS 322211; employment is suppressed (0) in counties with one or two plants, so establishments are the safer weight there")
        # employment-based demand weights: emp where present, else establishments x average plant size, else leave the proxy share scaled down
        avg_emp = c.emp.sum() / max(1, c.estab[c.emp > 0].sum())
        w = np.array([max(out["nodes"][j].get("cbp_emp", 0), out["nodes"][j].get("cbp_estab", 0) * avg_emp) for j in range(len(nodes))], dtype=float)
        out["emp_weights"] = [round(float(v), 1) for v in w]
        out["cbp_by_state"] = c.groupby("state").agg(estab=("estab", "sum"), emp=("emp", "sum")).to_dict("index")
    # ---- comparison: model demand share vs measured shares, by state
    st = nodes.st.values; model_share = pd.Series(dem).groupby(st).sum(); model_share = model_share / model_share.sum()
    comp = pd.DataFrame({"model_share": model_share})
    if "frs_by_state" in out: s = pd.Series(out["frs_by_state"]); comp["frs_share"] = (s / s.sum()).reindex(comp.index).fillna(0)
    if "cbp_by_state" in out: s = pd.Series({k: v["emp"] for k, v in out["cbp_by_state"].items()}); comp["cbp_emp_share"] = (s / s.sum()).reindex(comp.index).fillna(0)
    comp = comp.sort_values("model_share", ascending=False)
    out["state_comparison"] = {k: {a: round(float(b), 4) for a, b in v.items()} for k, v in comp.to_dict("index").items()}
    for col in [c for c in comp.columns if c != "model_share"]:
        both = comp[(comp[col] > 0) & (comp.model_share > 0)]
        le = np.log(both.model_share / both[col]); out[f"log_error_vs_{col}"] = dict(rms=round(float(np.sqrt((le ** 2).mean())), 3), weighted_rms=round(float(np.sqrt(((le ** 2) * both[col]).sum() / both[col].sum())), 3), n_states=int(len(both)))
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    print("sources:", out["sources"]); print({k: v for k, v in out.items() if k.startswith("log_error")})
    print(comp.head(15).round(3).to_string())

if __name__ == "__main__":
    main(*sys.argv[1:5])
