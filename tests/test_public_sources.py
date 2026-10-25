"""The free public freight sources, tested without network: the pure aggregation in each ingest script on a
fixture, and the solver pricing lanes on measured road factors. No pytest needed:
    python tests/test_public_sources.py
"""
import json, os, sys, tempfile
import numpy as np, pandas as pd
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for sub in ("ingest", "model"):
    sys.path.insert(0, os.path.join(ROOT, sub))
fails = []
def check(name, cond, detail=""):
    print(("ok   " if cond else "FAIL ") + name + (f"   [{detail}]" if (detail and not cond) else ""))
    if not cond: fails.append(name)

# ── FAF5: tidy + summarize on a synthetic state-database frame ──────────────
import faf5
raw = pd.DataFrame([
    # fr_orig, dms_origst, dms_destst, fr_dest, dms_mode, sctg2, trade_type, tons_2023, tmiles_2023
    (0, 13, 13, 0, 1, 27, 1, 100.0, 10.0),    # GA->GA truck, 100 mi
    (0, 13, 17, 0, 2, 27, 1, 50.0, 40.0),     # GA->IL rail, 800 mi
    (0, 48, 48, 0, 1, 27, 1, 50.0, 7.5),      # TX->TX truck, 150 mi
    (0, 13, 13, 0, 1, 28, 1, 20.0, 1.0),      # boxes
    (802, 13, 13, 0, 1, 27, 2, 30.0, 3.0),    # import from Canada (fr_orig 802 is a FAF foreign zone id here)
    (0, 13, 13, 0, 1, 31, 1, 999.0, 99.0),    # another commodity, must be dropped
], columns=["fr_orig", "dms_origst", "dms_destst", "fr_dest", "dms_mode", "sctg2", "trade_type", "tons_2023", "tmiles_2023"])
# The real file carries blank fr_orig on domestic rows (floats with NaN); the 2026-10-25 run failed on the cast.
raw["fr_orig"] = raw["fr_orig"].astype(float).where(raw["fr_orig"] != 0, other=float("nan"))
# The real file carries forecast columns (2025, 2030, ... 2050) beside the observed years, nothing marks them, and the
# 2026-10-25 run summarised 2050. The 2025 forecast is before today's date, so the boundary is explicit, not the clock.
for fy in (2025, 2030, 2050):
    raw[f"tons_{fy}"], raw[f"tmiles_{fy}"] = raw["tons_2023"] * 3, raw["tmiles_2023"] * 5
faf561 = [f"tons_{y}" for y in (2017, 2018, 2019, 2020, 2021, 2022, 2023, 2025, 2030, 2035, 2040, 2045, 2050)]
check("faf5 latest_year is the last annual column at or before the observed boundary (2023, not the 2025 forecast)", faf5.latest_year(faf561) == 2023 and faf5.OBSERVED_THROUGH == 2023 and faf5.annual_run([2017, 2018, 2019, 2025, 2030]) == [2017, 2018, 2019] and faf5.years_in(["tons_2023", "tmiles_2023", "tons_2050"]) == [2023, 2050])
check("faf5 a newer release's 2024 column stays unused on a stale boundary and is reported, never promoted", faf5.latest_year(faf561 + ["tons_2024"]) == 2023 and faf5.past_boundary(faf561 + ["tons_2024"]) == [2024, 2025] and faf5.past_boundary(faf561) == [])
check("faf5 the boundary raised with the release admits 2024 and still refuses the adjacent 2025 forecast", faf5.latest_year(faf561 + ["tons_2024"], observed_through=2024) == 2024)
try:
    faf5.latest_year(["tons_2025", "tons_2030"]); check("faf5 fails loudly when no annual column is at or before the boundary", False)
except SystemExit as e: check("faf5 fails loudly when no annual column is at or before the boundary", "no annual column" in str(e))
t = faf5.tidy(raw)
check("faf5 tidy keeps SCTG 27/28 only and maps modes and trade types", set(t.sctg2) == {27, 28} and set(t["mode"]) == {"truck", "rail"} and set(t.trade_type) == {"domestic", "import"} and t.year.iloc[0] == 2023)
s = faf5.summarize(t)
c27 = s["commodities"]["27"]
check("faf5 avg haul = ton-miles / tons (57.5e6 / 200e3 = 287.5 mi)", abs(c27["avg_haul_mi"] - 287.5) < 1e-6, c27["avg_haul_mi"])
check("faf5 rail share by tons (50/200)", abs(c27["rail_tons_share"] - 0.25) < 1e-9 and abs(c27["truck_tons_share"] - 0.75) < 1e-9)
check("faf5 per-mode haul (rail 800 mi, truck 116.7 mi)", abs(c27["by_mode"]["rail"]["avg_haul_mi"] - 800.0) < 1e-6 and abs(c27["by_mode"]["truck"]["avg_haul_mi"] - 116.7) < 0.05)
check("faf5 origin-state haul (GA 333.3, TX 150)", abs(c27["by_origin_state"]["GA"]["avg_haul_mi"] - 333.3) < 0.05 and abs(c27["by_origin_state"]["TX"]["avg_haul_mi"] - 150.0) < 1e-6)
check("faf5 imports kept apart from domestic and attributed to the foreign origin", c27["imports_tons_kt"] == 30.0 and c27["imports_by_foreign_origin_share"] == {"802": 1.0} and c27["domestic_tons_kt"] == 200.0)
check("faf5 summary names the SCTG 27 caveat", "containerboard" in s["caveat"])
try:
    faf5.tidy(raw.rename(columns={"dms_mode": "mode_x"})); check("faf5 fails loudly on a column change", False)
except SystemExit as e: check("faf5 fails loudly on a column change", "missing" in str(e))

# ── Census trade: port shares and import summary on a fixture ───────────────
import census_trade_ports as ctp
fx = pd.DataFrame([
    dict(flow="export", period="2025-11", hs4="4804", port_code="2304", port_name="LAREDO, TX", country_code="2010", country="MEXICO", value_usd=1e6, qty=1_814_370.0, unit="KG"),
    dict(flow="export", period="2025-12", hs4="4804", port_code="2304", port_name="LAREDO, TX", country_code="2010", country="MEXICO", value_usd=1e6, qty=1_814_370.0, unit="KG"),
    dict(flow="export", period="2025-12", hs4="4805", port_code="1703", port_name="SAVANNAH, GA", country_code="5700", country="CHINA", value_usd=1e6, qty=907_185.0, unit="KG"),
    dict(flow="export", period="2024-01", hs4="4804", port_code="1703", port_name="SAVANNAH, GA", country_code="5700", country="CHINA", value_usd=1e6, qty=90_718_500.0, unit="KG"),  # outside the last-12 window when months=2
    dict(flow="import", period="2025-12", hs4="4804", port_code="3801", port_name="DETROIT, MI", country_code="1220", country="CANADA", value_usd=1e6, qty=2_721_555.0, unit="KG"),
    dict(flow="import", period="2025-12", hs4="4805", port_code="3001", port_name="SEATTLE, WA", country_code="5700", country="CHINA", value_usd=1e6, qty=907_185.0, unit="KG"),
])
ps = ctp.port_shares(fx, "export", months=2)
check("trade: export port shares by weight over the last N periods (Laredo 4000 t of 5000 = 0.8)", ps["total_short_tons"] == 5000 and ps["ports"][0]["port_name"] == "LAREDO, TX" and abs(ps["ports"][0]["share"] - 0.8) < 1e-9 and ps["periods"] == ["2025-11", "2025-12"])
im = ctp.import_summary(fx, months=12)
check("trade: imports total and Canada share (3000 t of 4000)", im["total_short_tons"] == 4000 and abs(im["canada_share"] - 0.75) < 1e-9 and im["by_country"][0]["country"] == "CANADA")
check("trade: a non-kg unit is not converted to tons", ctp._tons(pd.DataFrame(dict(qty=[1.0], unit=["NO"]))).isna().all())

# ── OSRM lanes: batching and the summary ────────────────────────────────────
import osrm_lanes as ol
calls = ol.plan_calls(93, 441)
check("osrm: 93 mills x 441 markets batch into 24 table calls of <= 100 coordinates", len(calls) == 24 and all(len(m) + len(n) <= ol.MAX_TABLE_COORDS for m, n in calls) and sum(len(m) * len(n) for m, n in calls) == 93 * 441)
lanes = pd.DataFrame(dict(mill_id=[0, 0, 1], node_id=["a", "b", "a"], gc_miles=[100.0, 200.0, 300.0], road_miles=[120.0, 260.0, None], drive_min=[130.0, 280.0, None]))
sm = ol.summarize(lanes)
check("osrm: summary counts routed vs unrouted and the median ratio (1.25)", sm["routed"] == 2 and sm["unrouted"] == 1 and abs(sm["ratio_median"] - 1.25) < 1e-9 and "car" in sm["profile"])

# ── the solver on measured lanes ────────────────────────────────────────────
import netmodel
from netmodel import freight_cost, set_lane_factors, clear_lane_factors, FREIGHT, lane_factor_for
d = np.array([[100.0, 500.0]])
c_default, _ = freight_cost(d)
c_lane, _ = freight_cost(d, road_factor=np.array([[1.5, 1.1]]))
check("freight_cost takes a per-lane road factor array", c_lane[0, 0] > c_default[0, 0] and c_lane[0, 1] < c_default[0, 1])
M = pd.DataFrame(dict(gid=[3, 1]))
set_lane_factors(np.array([[np.nan, 1.3], [1.4, np.nan], [np.nan, np.nan], [1.1, 1.2]]), fill=1.25)
rf = lane_factor_for(M, 2)
check("lane_factor_for looks lanes up by gid and fills unrouted lanes with the median", rf.tolist() == [[1.1, 1.2], [1.4, 1.25]] and netmodel.LANE_SOURCE.startswith("OSRM"))
check("a footprint whose gid is outside the matrix falls back to the single factor", lane_factor_for(pd.DataFrame(dict(gid=[9])), 2) is None)
clear_lane_factors()
check("clear_lane_factors restores the assumption", lane_factor_for(M, 2) is None and "assumption" in netmodel.LANE_SOURCE)

# a two-mill, three-market solve: measured lanes change the arcs the way the ratios say
mills = pd.DataFrame(dict(gid=[0, 1], owner=["A", "B"], mill_name=["West", "East"], lat=[35.0, 35.0], lon=[-100.0, -84.0],
                          capacity_tons_per_year=[1e6, 1e6], grades=["linerboard,medium"] * 2, country=["US", "US"], status="open", state=["TX", "GA"]))
nodes = pd.DataFrame(dict(node_id=["w", "c", "e"], name=["W", "C", "E"], lat=[35.0, 35.0, 35.0], lon=[-99.0, -95.0, -85.0], w_total=[1.0, 1.0, 1.0]))
base = netmodel.build_and_solve(mills, nodes, 600_000, {}, 0.0, verbose=False)
tons_from_west_to_c = float(base["ship"][(base["ship"].mill == "West") & (base["ship"].node == "C")].tons.sum())
# make every West lane to the middle market a mountain road (ratio 2.5) and East's a straight one (1.05)
set_lane_factors(np.array([[1.2, 2.5, 1.2], [1.2, 1.05, 1.2]]), fill=1.2)
tilted = netmodel.build_and_solve(mills, nodes, 600_000, {}, 0.0, verbose=False)
tons_from_west_to_c_tilted = float(tilted["ship"][(tilted["ship"].mill == "West") & (tilted["ship"].node == "C")].tons.sum())
clear_lane_factors()
check("measured lanes move tons: the middle market leaves the mill whose road is 2.5x", tons_from_west_to_c_tilted < tons_from_west_to_c, f"{tons_from_west_to_c} -> {tons_from_west_to_c_tilted}")
east_c = tilted["ship"][(tilted["ship"].mill == "East") & (tilted["ship"].node == "C")]
gc_east_c = float(netmodel.haversine(35.0, -84.0, 35.0, -95.0))
check("ship miles carry the per-lane factor (East -> C at 1.05 x great-circle)", len(east_c) > 0 and abs(float(east_c.miles.iloc[0]) - gc_east_c * 1.05) < 1e-6, f"{east_c.miles.tolist()} vs {gc_east_c * 1.05}")

# ── exporter helpers on a temp data dir ─────────────────────────────────────
import export_json as ej
# ── rail modal choice: the access premium, the breakeven and the calibration ────────────────────────────
p0 = dict(netmodel.FREIGHT, rail_access=0.0); p1 = dict(netmodel.FREIGHT, rail_access=30.0)
c0, r0 = freight_cost(np.array([300.0, 600.0, 1000.0]), p=p0); c1, r1 = freight_cost(np.array([300.0, 600.0, 1000.0]), p=p1)
check("rail access premium raises only rail quotes: 600 road-mi (500 gc) flips rail -> truck, 1,000 stays rail, truck lane unchanged", bool(r0[1]) and not bool(r1[1]) and bool(r1[2]) and c1[0] == c0[0] and c1[2] > c0[2])
check("rail_breakeven_miles: (35 - 8) / 0.06 = 450 bare, 950 with a $30 premium", abs(netmodel.rail_breakeven_miles(p0) - 450.0) < 1e-9 and abs(netmodel.rail_breakeven_miles(p1) - 950.0) < 1e-9)
curve = lambda prem: max(0.0, 0.43 - 0.0019 * prem)        # a monotone stand-in for the LP: share falls as rail gets dearer
cal = netmodel.calibrate_rail_access(curve, 0.24, tol=0.002)
check("calibrate_rail_access: bisection meets the target within tol and reports every solve", cal["bounded"] == "met" and abs(cal["rail_share"] - 0.24) <= 0.002 and abs(cal["rail_access"] - 100.0) < 1.5 and cal["iterations"] == len(cal["trace"]))
check("calibrate_rail_access: a target already met at zero premium keeps zero, an unreachable one stops at the upper bound and says so",
      netmodel.calibrate_rail_access(lambda q: 0.10, 0.24)["rail_access"] == 0.0 and netmodel.calibrate_rail_access(lambda q: 0.10, 0.24)["bounded"] == "at_lower_bound"
      and netmodel.calibrate_rail_access(lambda q: 0.5, 0.24, hi=60.0)["bounded"] == "at_upper_bound")
check("exporter: the FAF5 rail target is rail + multiple modes, None before the pull", ej.rail_target_from_faf5({"faf5": dict(paper_rail_share=0.08, paper_multiple_modes_share=0.16, year=2023)})["target"] == 0.24 and ej.rail_target_from_faf5({"faf5": None}) is None)
_calls = []
rec = ej.calibrate_rail({"faf5": dict(paper_rail_share=0.08, paper_multiple_modes_share=0.16, year=2023)}, lambda q: (_calls.append(q), curve(q))[1], env={})
check("exporter: calibrate_rail sets FREIGHT.rail_access and names FAF5 in RAIL_SOURCE", rec["bounded"] == "met" and abs(netmodel.FREIGHT["rail_access"] - rec["rail_access"]) < 1e-9 and "FAF5 2023" in netmodel.RAIL_SOURCE and len(_calls) == rec["iterations"])
rec = ej.calibrate_rail({"faf5": None}, lambda q: 0.5, env={})
check("exporter: no FAF5 file means the bare rule (premium 0, uncalibrated)", rec["bounded"] == "uncalibrated" and netmodel.FREIGHT["rail_access"] == 0.0 and "assumption" in netmodel.RAIL_SOURCE)
rec = ej.calibrate_rail({"faf5": dict(paper_rail_share=0.08, paper_multiple_modes_share=0.16, year=2023)}, lambda q: 0.5, env={"PN_RAIL_ACCESS": "12.5"})
check("exporter: PN_RAIL_ACCESS pins the premium without a solve", rec["bounded"] == "pinned" and netmodel.FREIGHT["rail_access"] == 12.5 and rec["iterations"] == 0)
netmodel.set_rail_access(0.0, "test reset")
tmp = tempfile.mkdtemp()
allm = pd.DataFrame(dict(gid=[0, 1, 2]))
nodes2 = pd.DataFrame(dict(node_id=["10", "20"]))
pd.DataFrame(dict(mill_id=[0, 2, 2], node_id=["10", "10", "20"], gc_miles=[100, 100, 100], road_miles=[130, 110, None], drive_min=[1, 1, None])).to_csv(os.path.join(tmp, "lanes.csv"), index=False)
mat, fill = ej.load_lane_factors(allm, nodes2, path=os.path.join(tmp, "lanes.csv"))
check("exporter builds the gid x market matrix from lanes_osrm.csv with NaN where unrouted and the median fill", mat.shape == (3, 2) and mat[0, 0] == 1.3 and mat[2, 0] == 1.1 and np.isnan(mat[2, 1]) and np.isnan(mat[1, 0]) and abs(fill - 1.2) < 1e-9)
check("exporter: no lanes file means no factors", ej.load_lane_factors(allm, nodes2, path=os.path.join(tmp, "nope.csv")) == (None, None))
saved = ej.DATA; ej.DATA = tmp
check("exporter: measured freight blocks are None until their pulls have run", ej.load_measured_freight() == {"faf5": None, "trade_ports": None})
json.dump(dict(year=2023, source="FAF5", caveat="c", commodities={"27": dict(avg_haul_mi=410.2, rail_tons_share=0.31, truck_tons_share=0.62, imports_tons_kt=1500.0), "28": dict(avg_haul_mi=220.0, rail_tons_share=0.05)}), open(os.path.join(tmp, "faf5_summary.json"), "w"))
mf = ej.load_measured_freight()
check("exporter: the FAF5 block carries haul, modal split and the caveat", mf["faf5"]["paper_avg_haul_mi"] == 410.2 and mf["faf5"]["paper_rail_share"] == 0.31 and mf["faf5"]["paper_articles_avg_haul_mi"] == 220.0 and mf["faf5"]["caveat"] == "c")
ej.DATA = saved

# ── receipts: measured anchors appear only with the files ───────────────────
sys.path.insert(0, os.path.join(ROOT, "audit")); import recompute as rc
saved_root = rc.ROOT; rc.ROOT = tmp; os.makedirs(os.path.join(tmp, "data"), exist_ok=True)
check("receipts: no measured files, no measured rows", rc.measured_freight_anchors(dict(haul_2026=509.0, rail_2026=0.417, ca_2024=340_000.0)) == [])
json.dump(dict(year=2023, commodities={"27": dict(avg_haul_mi=410.0, rail_tons_share=0.30)}), open(os.path.join(tmp, "data", "faf5_summary.json"), "w"))
json.dump(dict(imports=dict(total_short_tons=1_500_000.0, periods=["2025-01", "2025-12"], canada_share=0.8)), open(os.path.join(tmp, "data", "trade_paper_ports_summary.json"), "w"))
rows = rc.measured_freight_anchors(dict(haul_2026=509.0, rail_2026=0.417, ca_2024=340_000.0))
keys = {r["key"]: r for r in rows}
check("receipts: measured rows report but never gate (strict False on every one)", all(r.get("strict") is False for r in rows))
check("receipts: FAF5 haul and rail rows with deviations, Census imports as a shown gap", set(keys) == {"haul_faf5", "rail_faf5", "imports_census"} and abs(keys["haul_faf5"]["deviation"] - (509 - 410) / 410) < 1e-4 and keys["haul_faf5"]["ok"] is True and keys["rail_faf5"]["ok"] is False and keys["imports_census"]["ok"] is None)
rc.ROOT = saved_root

print(f"\n{len(fails)} failed" if fails else "\nall checks passed"); sys.exit(1 if fails else 0)
