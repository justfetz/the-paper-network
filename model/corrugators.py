"""
The middle tier: corrugator plants and sheet feeders between the mills and the box users.

Corrugator plants buy rolls, make combined board, and convert most of it themselves; what they do not
convert they sell as sheets to sheet plants, alongside dedicated sheet feeders. This module allocates the
public counts (FBA: 458 corrugator plants, 1,092 facilities; AICC: ~634 sheet plants, ~70 sheet feeders)
across the demand points, derives corrugator capacity from width and speed, and solves the sheet trade as a
transportation LP: markets with spare corrugator hours (and sheet feeders) ship sheets to markets whose
sheet plants need them. Freight per ton for sheets is higher than for rolls because sheets cube out a trailer.

Usage: python corrugators.py ../data/paper_network.json ../data/corrugators.json
"""
import json, sys, math, numpy as np
from scipy.optimize import linprog
from scipy.sparse import coo_matrix

PARAMS = dict(
    corrugator_plants=458, facilities=1092, sheet_plants=634, sheet_feeders=70,          # FBA 2024; AICC
    width_mix={"87": 0.20, "98": 0.50, "110": 0.30},                                      # assumption: 98 in dominant
    design_fpm={"87": 900, "98": 1000, "110": 1100}, run_hours=4000, oee=0.55,           # two shifts, 55% overall equipment effectiveness
    lb_per_msf=110.0,                                                                     # 32 ECT C-flute combined board, 35-26-35
    sheet_share=0.16,                                                                     # FBA: corrugator plants 84% of shipments, sheet plants 16%
    tons_per_mmsf_shipped=82.0, waste=0.08,                                              # FBA: 34.0 Mt consumed / 416 BSF shipped (2021) = 82 t per MMSF shipped; ~8% corrugator trim and waste
    min_local_demand_for_corrugator=35000,                                                # tons/yr within the market below which no corrugator pencils out
    feeder_mmsf=1300, feeder_top_markets=45,                                              # sheet feeders: big dedicated machines in the largest metros
    sheet_freight_multiplier=1.8, sheet_handling=8.0,                                     # $/t: sheets cube out at ~12-14 t a load vs ~22 t of rolls
    roll_freight=dict(road_factor=1.2, truck_fixed=8.0, truck_per_mi=0.125, rail_fixed=35.0, rail_per_mi=0.065))

def mmsf_per_year(width_in, fpm, hours, oee):
    """Million square feet a corrugator makes in a year at a given width, design speed, scheduled hours and OEE."""
    return width_in / 12.0 * fpm * 60.0 * hours * oee / 1e6

def tons_per_mmsf(lb_per_msf): return lb_per_msf * 1000.0 / 2000.0   # 110 lb/MSF -> 55 short tons per MMSF

def haversine(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2-lat1)/2)**2 + np.cos(lat1)*np.cos(lat2)*np.sin((lon2-lon1)/2)**2
    return 2*3958.8*np.arcsin(np.sqrt(a))

def main(src, dst, p=PARAMS):
    D = json.load(open(src)); nodes = D["nodes"]; dem = np.array(D["scenarios"]["fp2026"]["node_demand"], dtype=float)
    lat = np.array([n["lat"] for n in nodes]); lon = np.array([n["lon"] for n in nodes]); J = len(nodes)
    tpm = tons_per_mmsf(p["lb_per_msf"])
    # board tons -> corrugator throughput, in "board-equivalent tons" at 110 lb/MSF so the LP stays in tons: shipped area = tons / 82, produced area = shipped / (1 - waste)
    dem = dem * (tpm / p["tons_per_mmsf_shipped"]) / (1.0 - p["waste"])
    per_corr = {w: mmsf_per_year(int(w), p["design_fpm"][w], p["run_hours"], p["oee"]) for w in p["width_mix"]}
    avg_mmsf = sum(p["width_mix"][w] * per_corr[w] for w in per_corr)
    # ---- allocate corrugator plants: markets above the minimum local demand, in proportion to demand
    eligible = np.array(D["scenarios"]["fp2026"]["node_demand"], dtype=float) >= p["min_local_demand_for_corrugator"]
    corr = np.where(eligible, dem, 0.0); corr = corr / corr.sum() * p["corrugator_plants"]
    corr_cap = corr * avg_mmsf * tpm                                                       # tons of board a market's corrugators can run per year
    # ---- sheet feeders in the largest markets, sheet plants everywhere people are
    top = np.argsort(-dem)[:p["feeder_top_markets"]]; feeder = np.zeros(J); feeder[top] = dem[top] / dem[top].sum() * p["sheet_feeders"]
    feeder_cap = feeder * p["feeder_mmsf"] * tpm
    pop = np.array([n["pop"] for n in nodes], dtype=float); sheet_plants = pop / pop.sum() * p["sheet_plants"]
    # ---- sheet demand: the sheet-plant share of every market's board, plus everything in markets with no corrugator
    sheet_dem = np.where(eligible, dem * p["sheet_share"], dem)
    own_conv = np.where(eligible, dem - dem * p["sheet_share"], 0.0)                     # board a market's own corrugator plants convert into boxes
    spare = np.maximum(0.0, corr_cap - own_conv) + feeder_cap                              # hours left to sell as sheets
    # ---- the sheet trade: transportation LP, markets with spare -> markets with sheet demand
    dist = haversine(lat[:, None], lon[:, None], lat[None, :], lon[None, :])
    rf = p["roll_freight"]; road = dist * rf["road_factor"]
    roll = np.minimum(rf["truck_fixed"] + rf["truck_per_mi"] * road, rf["rail_fixed"] + rf["rail_per_mi"] * road)
    cost = roll * p["sheet_freight_multiplier"] + p["sheet_handling"]
    sup = np.where(spare > 0)[0]; dmd = np.where(sheet_dem > 0)[0]
    C = cost[np.ix_(sup, dmd)]; nS, nD = len(sup), len(dmd); nv = nS * nD
    rows_s = np.repeat(np.arange(nS), nD); rows_d = np.tile(np.arange(nD), nS); cols = np.arange(nv)
    A_ub = coo_matrix((np.ones(nv), (rows_s, cols)), shape=(nS, nv)); A_eq = coo_matrix((np.ones(nv), (rows_d, cols)), shape=(nD, nv))
    unmet_cost = 400.0
    c = np.concatenate([C.flatten(), np.full(nD, unmet_cost)])
    A_ub2 = coo_matrix((A_ub.data, (A_ub.row, A_ub.col)), shape=(nS, nv + nD))
    A_eq2 = coo_matrix((np.concatenate([A_eq.data, np.ones(nD)]), (np.concatenate([A_eq.row, np.arange(nD)]), np.concatenate([A_eq.col, nv + np.arange(nD)]))), shape=(nD, nv + nD))
    res = linprog(c, A_ub=A_ub2, b_ub=spare[sup], A_eq=A_eq2, b_eq=sheet_dem[dmd], bounds=(0, None), method="highs")
    if res.status != 0: raise RuntimeError(res.message)
    X = res.x[:nv].reshape(nS, nD); unmet = res.x[nv:]
    flows = [[int(sup[i]), int(dmd[j]), int(round(X[i, j]))] for i, j in zip(*np.where(X > 500))]
    sold = np.zeros(J); sold[sup] = X.sum(axis=1)
    util = np.where(corr_cap + feeder_cap > 0, (own_conv + sold) / np.maximum(corr_cap + feeder_cap, 1), 0.0)
    sheet_value = np.zeros(J); sheet_value[dmd] = res.eqlin.marginals                      # $/t the marginal sheet is worth delivered in each market
    hours_value = np.zeros(J); hours_value[sup] = -res.ineqlin.marginals                    # $/t one more ton of corrugator capacity would earn in sheet freight saved
    miles = np.zeros(J); miles[sup] = np.where(X.sum(axis=1) > 0, (X * road[np.ix_(sup, dmd)]).sum(axis=1) / np.maximum(X.sum(axis=1), 1), 0)
    out = dict(params={k: v for k, v in p.items() if k != "roll_freight"}, per_corrugator_mmsf={w: round(v) for w, v in per_corr.items()}, avg_corrugator_mmsf=round(avg_mmsf), tons_per_mmsf=tpm,
               nodes=[dict(corrugators=round(float(corr[j]), 2), corr_capacity=int(round(corr_cap[j])), own_conversion=int(round(own_conv[j])), feeders=round(float(feeder[j]), 2), feeder_capacity=int(round(feeder_cap[j])),
                           sheet_plants=round(float(sheet_plants[j]), 1), sheet_demand=int(round(sheet_dem[j])), sheets_sold=int(round(sold[j])), utilization=round(float(util[j]), 3),
                           sheet_value=round(float(sheet_value[j]), 1), hours_value=round(float(hours_value[j]), 1), avg_sheet_haul=round(float(miles[j])), has_corrugator=bool(eligible[j])) for j in range(J)],
               flows=flows,
               kpi=dict(board_total=float(dem.sum()), corrugator_capacity=float(corr_cap.sum()), feeder_capacity=float(feeder_cap.sum()), own_conversion=float(own_conv.sum()), sheet_demand=float(sheet_dem.sum()),
                        sheets_shipped=float(X.sum()), unmet=float(unmet.sum()), national_utilization=float((own_conv.sum() + X.sum()) / (corr_cap.sum() + feeder_cap.sum())),
                        markets_without_corrugator=int((~eligible).sum()), avg_sheet_haul=float((X * road[np.ix_(sup, dmd)]).sum() / max(X.sum(), 1)), sheet_freight_usd=float((X * C).sum()),
                        implied_bsf=float(dem.sum() / tpm / 1000.0), shipped_bsf=float(np.array(D["scenarios"]["fp2026"]["node_demand"]).sum() / p["tons_per_mmsf_shipped"] / 1000.0),
                        fleet_capacity_bsf=float((corr_cap.sum() + feeder_cap.sum()) / tpm / 1000.0)))
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    k = out["kpi"]; print(f"corrugators: {p['corrugator_plants']} plants at {avg_mmsf:.0f} MMSF = {k['corrugator_capacity']/1e6:.1f} Mt capacity (+{k['feeder_capacity']/1e6:.1f} Mt feeders) vs {k['board_total']/1e6:.1f} Mt board -> {k['national_utilization']:.0%} loaded; "
          f"sheet trade {k['sheets_shipped']/1e6:.2f} Mt, avg haul {k['avg_sheet_haul']:.0f} mi, {k['markets_without_corrugator']} markets with no corrugator, unmet {k['unmet']/1e3:.0f} kt; implied {k['implied_bsf']:.0f} BSF")
    return out

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
