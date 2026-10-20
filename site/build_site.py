"""Assemble the dashboard: site/index.html + site/data.js (GitHub Pages), site/artifact.html (self-contained), site/test.html (local d3 for screenshots).
Usage: python build_site.py [path/to/paper_network.json] [path/to/basemap.json]"""
import json, os, re, sys, html, math
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); SRC = os.path.join(HERE, "src")
JSON_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data", "paper_network.json")
BM_PATH = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "data", "basemap.json")
D = json.load(open(JSON_PATH)); BM = json.load(open(BM_PATH))
ARTIFACT_URL = "https://claude.ai/artifact/UCaPyJMWgrDAg94xakwn9w"
_ep = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chat_endpoint.txt")   # written by the chat workflow after the Worker deploys
CHAT_ENDPOINT = open(_ep).read().strip() if os.path.exists(_ep) else os.environ.get("PN_CHAT_ENDPOINT", "")   # the live copy, where the chat drawer can ask Claude
CORR_PATH = os.path.join(os.path.dirname(JSON_PATH), "corrugators.json")
PL_PATH = os.path.join(os.path.dirname(JSON_PATH), "plants_frs_box.csv"); PLN_PATH = os.path.join(os.path.dirname(JSON_PATH), "plants_by_node.json")
D["plants"] = None; D["plant_layer"] = None
if os.path.exists(PL_PATH):
    import csv
    rows = list(csv.DictReader(open(PL_PATH, encoding="utf-8", errors="ignore")))
    VER_PATH = os.path.join(os.path.dirname(JSON_PATH), "plants_verified.csv"); ver = {}
    if os.path.exists(VER_PATH):
        for v in csv.DictReader(open(VER_PATH, encoding="utf-8", errors="ignore")): ver[v["registry_id"]] = v
    def vrow(r):   # the EPA row as registered, then what the verification pass established (empty until it has run for that site)
        v = ver.get(r["registry_id"], {})
        return [r["name"], r["city"], r["state"], round(float(r["lat"]), 3), round(float(r["lon"]), 3), int(float(r["node"])),
                v.get("operating", ""), v.get("plant_type", ""), v.get("owner", ""), v.get("confidence", ""), v.get("evidence_url", ""), r.get("address", ""), r.get("zip", "")]   # name and location exactly as registered
    D["plants"] = [vrow(r) for r in rows if r.get("lat") and r.get("lon")]
if os.path.exists(PLN_PATH):
    D["plant_layer"] = json.load(open(PLN_PATH))
    if D["plant_layer"].get("weighting_note") and D.get("params", {}).get("demand_weighting", "").startswith("85%"):
        D["params"]["demand_weighting"] = "85% measured (" + D["plant_layer"]["weighting_note"] + ") + 15% population proxy"
D["corr"] = json.load(open(CORR_PATH)) if os.path.exists(CORR_PATH) else None
mills, S, P, nodes = D["mills"], D["scenarios"], D["params"], D["nodes"]
kt = lambda v: f"{v/1e6:.2f} Mt" if v >= 950000 else f"{round(v/1e3):,} kt"
MT1 = lambda v: f"{v/1e6:.1f}"
caps = {}
for m in mills:
    if m["country"] != "MX" and m["status"] == "open": caps[m["owner"]] = caps.get(m["owner"], 0) + m["cap"]
D["owner_order"] = sorted(caps, key=lambda o: -caps[o])
us = [m for m in mills if m["country"] == "US"]; act24 = set(S["fp2024"]["active"]); act26 = set(S["fp2026"]["active"])
n_us_open = sum(1 for m in us if m["status"] == "open")
cap_us_2024 = sum(m["cap_2024"] for m in us if m["id"] in act24); cap_us_2026 = sum(m["cap"] for m in us if m["status"] == "open")
ip_2024 = sum(m["cap_2024"] for m in us if m["id"] in act24 and m["owner_2024"] == "International Paper")
sw_2026 = sum(m["cap"] for m in us if m["status"] == "open" and m["owner"] == "Smurfit Westrock"); pca_2026 = sum(m["cap"] for m in us if m["status"] == "open" and m["owner"] == "Packaging Corp of America")
closed_2526 = sum(m["cap"] for m in us if m["status"] == "closed" and (m["closed_year"] or 0) >= 2025)
ship_us = lambda key: sum(S[key]["shipped"][m["id"]] for m in us)
k26, k24, kcf = S["fp2026"]["kpi"], S["fp2024"]["kpi"], S["cf2026"]["kpi"]
integ = S["fp2026"]["integration"]; ip = integ["International Paper"]; sw = integ["Smurfit Westrock"]
ip_tot = ip["total"] + ip["exports"]; sw_tot = sw["total"] + sw["exports"]
# ---- local surplus: capacity within 300 mi / 2026 demand within 300 mi, for every mill in the 2024 footprint
def hav(lat1, lon1, lat2, lon2):
    p = math.pi / 180; a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 2 * 3958.8 * math.asin(math.sqrt(a))
dem26 = S["fp2026"]["node_demand"]; fp24 = [m for m in mills if m["id"] in act24]
local_surplus = {}
for m in fp24:
    cap_near = sum(o["cap_2024"] for o in fp24 if hav(m["lat"], m["lon"], o["lat"], o["lon"]) <= 300)
    dem_near = sum(dem26[n["i"] if "i" in n else i] for i, n in enumerate(nodes) if hav(m["lat"], m["lon"], n["lat"], n["lon"]) <= 300)
    local_surplus[m["id"]] = round(cap_near / dem_near, 2) if dem_near > 0 else None
D["local_surplus"] = local_surplus
bt = sorted(D["backtest"], key=lambda r: (r["utilization"], r["shadow"])); rank = {r["mill"]: i + 1 for i, r in enumerate(bt)}
closed = [r for r in bt if r["closed_2025_26"]]
ls_sorted = sorted([(k, v) for k, v in local_surplus.items() if v], key=lambda kv: -kv[1]); ls_rank = {k: i + 1 for i, (k, v) in enumerate(ls_sorted)}
closed_ls_ranks = sorted(ls_rank.get(r["mill"], 999) for r in closed)
# ---- prices (points quoted in trade press; see notes/market_anchors.md)
D["prices"] = {
 "liner_east": [["2023-11", 825], ["2024-01", 865], ["2024-03", 905], ["2025-02", 945], ["2026-01", 945], ["2026-02", 925], ["2026-03", 965], ["2026-04", 995], ["2026-05", 995], ["2026-06", 1045], ["2026-08", 1045], ["2026-09", 1115], ["2026-10", 1115]],
 "recycled_liner": [["2025-02", 835], ["2026-01", 835], ["2026-02", 815], ["2026-03", 855], ["2026-04", 885], ["2026-06", 935], ["2026-09", 1035], ["2026-10", 1035]],
 "occ_national": [["2022-08", 109], ["2023-02", 33], ["2023-08", 54], ["2023-11", 75], ["2024-01", 87], ["2024-02", 91], ["2024-06", 106], ["2024-11", 74], ["2024-12", 66], ["2025-05", 78], ["2025-06", 72], ["2025-11", 44], ["2026-05", 62.5], ["2026-09", 90]],
 "diesel": [["2022", 4.99], ["2023", 4.21], ["2024", 3.76], ["2025", 3.66], ["2026-08", 5.46], ["2026-09", 6.29], ["2026-10", 6.18]],
 "occ_regional": {"May 2026": {"Northeast": 72, "Midwest": 67, "Southeast": 77, "Southwest": 57, "Los Angeles": 52, "San Francisco": 32, "Pacific NW": 57}, "Sep 2026": {"Southeast": 105, "Northeast": 95, "Midwest": 95, "Southwest": 92, "Pacific NW": 92, "Los Angeles": 77, "San Francisco": 57}},
 "diesel_regional_2026_10_12": {"US": 6.18, "West Coast": 7.24, "Midwest": 6.26, "Gulf Coast": 5.81},
 "notes": {"liner_east": "Fastmarkets RISI 42-lb unbleached kraft linerboard, US East, midpoints of the published range at each index move; 2026 levels after May are chained from the reported moves (+$50 Jun, +$70 Sep) and are derived.",
           "occ": "Fastmarkets RISI national average OCC, FOB seller's dock; the Sep-2026 point is the average of the regional quotes ($57 SF to $105 SE).",
           "diesel": "EIA weekly US on-highway diesel: annual averages 2022–2025, monthly 2026 (Aug $5.46, Sep $6.29, week of Oct 12 $6.18; West Coast $7.24).",
           "recycled": "26-lb semichemical medium, East: $830–840 at Feb-2025, then the 2026 index moves (−20, +40, +30, +50, +100) → about $1,035 by Sep-2026, derived. 30/31-lb recycled liner East was $940–950 in Aug-2026.",
           "general": "Price points are the ones that appear in trade press and company releases; they are not a licensed index. Freight is the flow model's delivered marginal cost at the chosen diesel price. See notes/market_anchors.md for every figure's source."}}
DW_PATH = os.path.join(os.path.dirname(JSON_PATH), "diesel_weekly.csv")
if os.path.exists(DW_PATH):
    import csv as _csv
    from collections import defaultdict
    rows = [r for r in _csv.DictReader(open(DW_PATH)) if r.get("region") == "US" and r.get("usd_per_gal")]
    monthly = defaultdict(list)
    for r in rows: monthly[r["date"][:7]].append(float(r["usd_per_gal"]))
    months = sorted(monthly)[-42:]
    D["prices"]["diesel"] = [[m, round(sum(v) / len(v), 2)] for m, v in ((m, monthly[m]) for m in months)]
    latest = sorted(rows, key=lambda r: r["date"])[-1]
    reg = {r["region"]: float(r["usd_per_gal"]) for r in _csv.DictReader(open(DW_PATH)) if r["date"] == latest["date"]}
    D["prices"]["diesel_latest"] = {"date": latest["date"], **{k: round(v, 2) for k, v in reg.items()}}
    D["prices"]["notes"]["diesel"] = f"EIA weekly US on-highway diesel, monthly averages of the weekly series; latest week {latest['date']}: " + ", ".join(f"{k} ${v:.2f}" for k, v in sorted(reg.items())) + "."
FR_PATH = os.path.join(os.path.dirname(JSON_PATH), "fred_series.csv")
if os.path.exists(FR_PATH):
    import csv as _csv2
    from collections import defaultdict as _dd
    fr = _dd(list); labels = {}
    for r in _csv2.DictReader(open(FR_PATH)):
        try: fr[r["series"]].append([r["date"][:7], round(float(r["value"]), 2)]); labels[r["series"]] = r["label"]
        except ValueError: pass
    D["prices"]["fred"] = {sid: {"label": labels[sid], "points": [p for i, p in enumerate(pts) if pts[i-1][0] != p[0] or i == 0][-84:]} for sid, pts in fr.items()}
D["reported_integration"] = {"International Paper": "~80% to own plants (10-K FY2019–22)", "Smurfit Westrock": "~81% implied: WestRock ~23% long on board vs its plants (Fastmarkets)", "Packaging Corp of America": "\"majority\" in the 10-K; ~96% in secondary sources", "Georgia-Pacific": "not disclosed", "Pratt Industries": "not disclosed", "Green Bay Packaging": "not disclosed", "Cascades": "not disclosed"}
D["enduse"] = [{"name": "Food & beverage", "share": 0.36}, {"name": "Retail, e-commerce & general merchandise", "share": 0.18}, {"name": "Durables: furniture, appliances, metal, electrical", "share": 0.12}, {"name": "Paper & allied products", "share": 0.09}, {"name": "Chemicals, plastics & pharma", "share": 0.09}, {"name": "Other nondurables", "share": 0.13}, {"name": "Glass, ceramics & stone", "share": 0.03}]
D["facts"] = {
 "n_us_open": n_us_open, "plants_total": 1092, "corrugator_plants": 458, "fnb_share": "36% (FBA, 2018)", "ecom_share": "16–20% (FBA)",
 "enduse_note": "National end-use shares assembled from Fibre Box Association statements (food & beverage 36%; e-commerce 16–20%) and rounded; the division split is the model's demand allocation. <span class='pill proxy'>allocated</span> Replace with the FBA annual report's end-use table and County Business Patterns by industry (roadmap step 5).",
 "fiber": {"occ_collected": "&gt;33 Mt of cardboard collected (2025)", "consumed": "31.4 Mt (2025)", "exported": "~13 Mt, 29% of recovered paper (2025); 12.3 Mt in 2024", "occ_exported": "~8.4 Mt (68% of 2024 exports)", "destinations": "Mexico 2.0 Mt, Thailand 2.0, Malaysia 1.9, Vietnam 1.4, Canada 1.0; India first (tonnage not quoted)", "yield": "1.1–1.2 t per ton of board (industry rule of thumb)",
           "src_afpa": "AF&amp;PA 2025 recycling statistics, as reported", "src_usitc": "USITC trade data, as reported",
           "note": "Nine Dragons, the world's largest containerboard maker, used to buy a large share of US OCC for its Chinese mills. After China stopped importing recovered paper in January 2021 it bought and converted US mills instead (ND Paper: Biron WI, Rumford ME, Fairmont WV, Old Town ME) to turn the same fiber into pulp and board on this side of the Pacific, and the export tonnage moved to Mexico, Thailand, Malaysia and Vietnam. The docks and their shares on the map are an assumption; the tonnage is the AF&amp;PA and USITC figure. Regional OCC prices in Sep-2026 ran from $57/t in San Francisco to $105/t in the Southeast, which is the shape of the county value layer: fiber is worth most where recycled mills are dense and docks are far."},
 "backtest": {"cap_2024": f"{MT1(cap_us_2024)} vs ~41.4 Mt ({(cap_us_2024/41.4e6-1)*100:+.0f}%)", "ip_2024": f"{MT1(ip_2024)} vs 12.98 Mt ({(ip_2024/12.984e6-1)*100:+.0f}%)", "ship_2024": f"{MT1(ship_us('fp2024'))} vs 37.7 Mt",
              "oprate": f"{ship_us('fp2026')/cap_us_2026:.0%} vs ~95%", "ip_int": f"{ip['internal']/ip_tot:.0%} own + {ip['exports']/ip_tot:.0%} exported vs ~80% own", "sw_int": f"{sw['internal']/sw_tot:.0%} vs ~81%",
              "note": "The supply side reconciles because it was built from the filings. The 2024 shipments figure landing on reported production is a check on the demand assumptions, which were set from box shipments and trade, not from production. The closures are the honest miss: see the table below."},
 "reconciliation": [["US containerboard capacity, end of 2024", f"{MT1(cap_us_2024)} Mt", "~41.4 Mt", "AF&amp;PA capacity survey: 42.3 Mt record in 2021, then −0.6%, −0.7%, −0.9%"],
                    ["US capacity, October 2026 (open mills)", f"{MT1(cap_us_2026)} Mt", "~37.5–38 Mt", "AF&amp;PA −5.1% in 2025; Fastmarkets: 3.9 Mt retired Feb 2025–Mar 2026"],
                    ["International Paper, US, end of 2024", f"{ip_2024/1e6:.2f} Mt", "12.98 Mt", "IP 10-K FY2024, Appendix II"], ["Smurfit Westrock, US mills", f"{sw_2026/1e6:.2f} Mt", "7.23 Mt", "SW 10-K mill table (used directly)"],
                    ["Packaging Corp of America, 2026", f"{pca_2026/1e6:.2f} Mt", "5.8 Mt", "PCA 10-K FY2025 (358 BSF), ten mills"], ["Capacity closed 2025–2026", f"{MT1(closed_2526)} Mt", "~3.9 Mt", "Fastmarkets RISI count of permanent retirements"],
                    ["Board shipped by US mills, 2024 scenario", f"{MT1(ship_us('fp2024'))} Mt", "37.7 Mt produced", "AF&amp;PA 2024 production; 2025 was 36.1 Mt"], ["Box shipments 2024", f"{MT1(P['demand_2024'])} Mt of board demanded", "381 BSF", "Fibre Box Association; ~0.08 Mt of board per BSF"],
                    ["Imports 2024", "Canadian mills sell 35% of capacity south", "1.4 Mt", "AF&amp;PA/trade data as reported"], ["Operating rate 2026", f"{ship_us('fp2026')/cap_us_2026:.0%}", "~95% (Q2 2026)", "AF&amp;PA quarterly report"],
                    ["Integration, IP", f"{ip['internal']/ip_tot:.0%} own, {ip['exports']/ip_tot:.0%} exported", "~80% own", "IP 10-K"], ["Integration, Smurfit Westrock", f"{sw['internal']/sw_tot:.0%} own", "~81% implied", "Fastmarkets pre-merger analysis"]],
 "errorbars": "<b>How close is it?</b> National totals sit within the spread of the published numbers (σ about 3–4%; 2024 mill output +2.7% against AF&amp;PA production, most of it the 1 Mt of Canadian imports the LP under-pulls). Company supply is within 1–5%. Regional demand was the weak part: against the EPA plant registry (1,796 named sites) the population proxy had an RMS log error of 0.44 by state, about 45% for a typical state (Florida at twice its real weight, Illinois and New Jersey at half). This run replaces it: state totals from Census County Business Patterns employment for 322211, within-state placement 70% from the EPA plant counts, 30% from the proxy. The state-level error is now zero against the Census by construction; what remains is within-state placement. Moving the demand shortened the average haul from 568 to 514 miles, cut freight from $64 to $60 a ton and the West's scarcity premium from $96 to $66, and left the switching gaps, integration rates and the calendar result unchanged (notes/how_close.md). A 14-draw Monte Carlo over mill capacities (σ 3–12% by confidence), demand (3.5%), exports (0.5 Mt), the outside-purchase premium and the manufacturing tilt moves the aggregate outputs only a few percent: average haul 544 ± 26 mi, rail share 0.43 ± 0.02, freight $62 ± 2/t, IP internal 0.87 ± 0.04. The capacity values are the unstable output (σ larger than the mean) because the 2026 network is within ~3% of sold out, so a small push either way flips the duals between freight savings and rationing. Full tables: notes/how_close.md.",
 "corr_note": "Counts are public (FBA 2024: 458 corrugator plants in 1,092 facilities; AICC: 634 sheet plants, 86% independent, and about 70 sheet feeders, half of them owned by integrated producers). Where they sit is not: this layer allocates corrugators to markets with at least 35 kt of local board a year in proportion to demand, sheet feeders to the 45 largest markets, and sheet plants by population, then prices the sheet trade at 1.8× roll freight because sheets cube out a trailer at 12–14 tons. The FBA's split of shipments, 84% from corrugator plants and 16% from sheet plants, sets the sheet share. The EPA facility list and a job-posting feed (corrugator operator postings) would place the real machines; see Method.",
 "closure_note": (f"Freight position does not predict the closures. The mills that actually closed were running {min(r['utilization'] for r in closed):.0%}–{max(r['utilization'] for r in closed):.0%} loaded in the LP and rank {', '.join(str(rank[r['mill']]) for r in closed)} of {len(bt)} on the idle list, because they sit in the Southeast and on the Gulf, next to the demand and the export docks. "
                  f"The surplus column is closer: capacity within 300 miles of those mills ran {min(local_surplus.get(r['mill'],0) or 0 for r in closed):.1f}–{max(local_surplus.get(r['mill'],0) or 0 for r in closed):.1f}× the demand there (ranks {', '.join(str(ls_rank.get(r['mill'],'—')) for r in closed)}). "
                  "What the closed mills shared is not in any free dataset: age, cash cost per ton and the capital they needed. The LP's own idle list is the small recycled and Canadian mills whose only edge is a short haul, which is what a freight-only model will always say and what the market did not do. The lesson for the model is a cost column per mill; the lesson for the industry is that the map shows where the surplus is, and the surplus is where the next closure comes from."),
}
# ---- method html, sources, needs
src = open(os.path.join(ROOT, "model", "netmodel.py")).read(); a = src.index("    owners = [k for k in owner_shares"); b = src.index("    if res.status != 0")
excerpt = html.escape("\n".join(l[4:] if l.startswith("    ") else l for l in src[a:b].splitlines()))
method_html = f"""
<p>Each mill is a source with a capacity and a set of grades. Each demand point wants a fixed number of tons of liner and of medium. Moving a ton costs freight, which rises with distance and switches from truck to rail near 450 road miles. Minimize freight subject to meeting demand without exceeding any mill: a transportation problem, the special case of min-cost flow where every arc runs from a source to a sink. Two things about this industry break the plain version, and both are fixed by adding nodes rather than changing the algorithm.</p>
<p>First, the big companies are integrated: a ton of IP board goes to the nearest <em>IP</em> plant. Each integrated owner gets its own copy of every demand point holding its share of the local market (IP 31%, Smurfit Westrock 20%, PCA 15.5%, Georgia-Pacific 9.5%, Pratt 6%, Green Bay 3%, Cascades 2%; 13% independents), served only by its own mills; an arc from the open market into each copy at $150/t lets an owner buy outside when short. Second, mills make specific grades: splitting each mill into a liner node and a medium node behind one capacity arc keeps kraft mills out of the medium market without a second commodity. With those expansions it is one min-cost flow, solved as an LP by HiGHS.</p>
<div class="math"><span class="c"># sets: mills i (capacity c_i, grades), demand points j, grades g ∈ {{liner, medium}}, owners k, ports p</span><br>
min  Σ f_ij (x_ijg + y_ijg)  +  Σ f_ip z_ip  +  150 Σ v_kjg  +  400 Σ u_jg<br>
s.t. Σ_{{j,g}} (x_ijg + y_ijg) + Σ_p z_ip  ≤  c_i a_i          <span class="c"># mill capacity, a_i = availability this month</span><br>
     Σ_{{i owned by k}} x_ijg + v_kjg  =  s_k φ_g D_j           <span class="c"># owner k's box plants at j</span><br>
     Σ_i y_ijg − Σ_k v_kjg + u_jg  =  s_open φ_g D_j         <span class="c"># open market at j</span><br>
     Σ_i z_ip  =  E_p                                        <span class="c"># exports through gateway p (kraft mills only)</span><br>
     f(d) = min(8 + 0.125 d·ft, 35 + 0.065 d·fr) $/ton,  d = 1.2 × great-circle miles, ft/fr = diesel factors (22% / 12% fuel share at $3.75)<br>
<span class="c"># October 2026 instance: {k26['n_vars']:,} variables, {k26['n_rows']:,} constraints, {k26['solve_seconds']} s with HiGHS. {len(S)} scenarios on this page.</span></div>
<p><b>Duals.</b> The multiplier on a mill's capacity row is what one more ton of that mill saves the network (the scarcity layer). The multiplier on a demand row is the delivered cost of the marginal ton in that county (the delivered-cost layer and the calculator's freight). <b>Prospects</b> rank, for every market, the active mills by delivered freight; the gap between the first two is the switching threshold. <b>Price shocks</b> add $70/t to one owner's open-market arcs only. <b>The fiber loop</b> is a second transportation LP: counties supply recovered OCC (92% of consumption, plus 3% for imported goods), recycled mills demand 1.15 t per ton of recycled board they ship, export docks take the AF&amp;PA/USITC export tonnage, and freight decides. <b>The maintenance calendar</b> is an assignment problem: for each mill and month the cost of an outage is estimated as capacity dual × tons lost, from twelve no-outage solves, then assigned with at most {D['calendar_opt']['per_month_cap']} mills per month and two per owner (a small MILP), and re-solved month by month to measure the true penalty. <b>Knockouts</b> remove one mill and re-solve. <b>The backtest</b> puts 2026 demand on the 2024 mill set and asks which mills the LP leaves idle.</p>
<h3>Assumptions that matter</h3>
<ul style="color:var(--ink-2);font-size:14px;padding-left:20px"><li>Demand geography is population tilted by state manufacturing share, rolled up to {len(nodes)} points; two thirds liner, one third medium; {MT1(P['demand_2024'])} Mt domestic + {MT1(P['exports_2024'])} Mt exports in 2024, {MT1(P['demand_2026'])} + {MT1(P['exports_2026'])} in 2026. Canadian mills sell 35% of capacity south; Mexican mills are listed, not modeled.</li>
<li>Owner shares of the box market are national; a state-level plant count by owner (in the 10-K property lists) would make them regional.</li>
<li>Mill capacities are public figures of mixed vintage; owner totals reconcile to the 10-Ks, single IP or PCA legacy mills could be off by 10%.</li>
<li>Freight is two straight lines with a diesel factor. No lanes, backhaul, car supply, transload economics or contracts; no swaps beyond the $150/t outside-purchase arc.</li>
<li>The outage calendar (9 days kraft, 5 recycled, 3% unplanned) and the monthly demand index are the author's; companies' actual outage months are in their earnings guidance.</li></ul>
<h3>The core of the LP, in Python</h3><pre style="font-family:var(--mono);font-size:12px;line-height:1.55;background:var(--code-bg);border:1px solid var(--rule);border-radius:8px;padding:12px 14px;overflow:auto;max-height:420px"><code>{excerpt}</code></pre>"""
sources = " · ".join(['<a href="https://www.sec.gov/Archives/edgar/data/51434/000005143425000013/ip-20241231.htm">IP 10-K FY2024</a>', '<a href="https://www.sec.gov/Archives/edgar/data/2005951/000200595125000005/smur-20241231.htm">Smurfit Westrock 10-K FY2024</a>',
 '<a href="https://www.sec.gov/Archives/edgar/data/75677/000119312526074129/pkg-20251231.htm">PCA 10-K FY2025</a>', '<a href="https://www.packagingdive.com/news/afpa-capacity-data-2025-production-decline-containerboard/821910/">AF&amp;PA 2025 capacity survey (Packaging Dive)</a>',
 '<a href="https://www.fastmarkets.com/insights/north-american-containerboard-market-capacity-cuts/">Fastmarkets on 2025–26 capacity cuts</a>', '<a href="https://www.packagingdive.com/news/international-paper-two-mill-closures-riceboro-savannah-georgia-layoffs/758254/">IP Savannah and Riceboro closures</a>',
 '<a href="https://www.recyclingtoday.com/news/georgia-pacific-mill-closing-cedar-springs-containerboard-cardboard-recycling/">GP Cedar Springs</a>', '<a href="https://ir.packagingcorp.com/news-releases/news-release-details/packaging-corporation-america-announces-agreement-purchase-greif">PCA buys Greif containerboard</a>',
 '<a href="https://www.fibrebox.org/the-corrugated-industry">Fibre Box Association</a>', '<a href="https://now.aiccbox.org/a-look-at-the-evolution-of-box-plants-1/">AICC on box plants</a>', '<a href="https://www.eia.gov/petroleum/gasdiesel/">EIA diesel</a>',
 '<a href="https://www.afandpa.org/statistics-resources/recycling">AF&amp;PA recycling statistics</a>', '<a href="https://github.com/topojson/us-atlas">us-atlas</a>', '<a href="https://github.com/CSSEGISandData/COVID-19">JHU county population table</a>',
 'Every mill row and every price point carries its own citation in <a href="https://github.com/justfetz/the-paper-network/tree/main/data">data/</a> and <a href="https://github.com/justfetz/the-paper-network/tree/main/notes">notes/</a>.'])
needs_html = """<ul style="color:var(--ink-2);font-size:14px;padding-left:20px"><li><b>EPA Facility Registry Service</b> bulk CSV, NAICS 322211: the free list of every US box plant with coordinates. Replaces the demand proxy. No key.</li>
<li><b>Census County Business Patterns</b> key (free): plants and employment by county, to weight demand and check the list.</li>
<li><b>Google Places</b> key (~$50–100 one-time) or Overpass (free): plant discovery and contact details for the call sheet.</li>
<li><b>EIA</b> key (free): weekly diesel by region, live into the freight factor.</li>
<li><b>Fastmarkets RISI</b> (paid): the actual price series, East and West; <b>AF&amp;PA</b> and <b>FBA</b> reports (members): mill-level grades, regional and end-use shipments.</li>
<li><b>AICC/FBA directories</b> and a <b>job-posting feed</b>: ground truth for independents and a cheap corrugator-vs-sheet-plant tag.</li></ul>
<p class="note">Details, endpoints and the scripts that consume each one: <a href="https://github.com/justfetz/the-paper-network/blob/main/NEEDS.md">NEEDS.md</a> and <a href="https://github.com/justfetz/the-paper-network/tree/main/ingest">ingest/</a>.</p>"""
theme_btn = '<button class="theme" id="theme" type="button" aria-label="Toggle dark mode">light / dark</button>'
fill = {"generated": D["generated"], "n_plants": f"{len(D['plants'] or []):,}", "n_us_open": n_us_open, "n_nodes": len(nodes), "p_liner": 1115, "p_medium": 1035, "method_html": method_html, "sources": sources, "needs_html": needs_html}
tpl = open(os.path.join(SRC, "index.template.html")).read()
def render(extra):
    out = tpl
    for k, v in {**fill, **extra}.items(): out = out.replace("{{" + k + "}}", str(v))
    miss = re.findall(r"{{(\w+)}}", out)
    if miss: raise SystemExit("unfilled: " + ", ".join(miss))
    return out
css = open(os.path.join(SRC, "ui.css")).read(); js = open(os.path.join(SRC, "ui_core.js")).read() + "\n" + open(os.path.join(SRC, "ui_corr.js")).read() + "\n" + open(os.path.join(SRC, "ui_thru.js")).read() + "\n" + open(os.path.join(SRC, "ui_tabs.js")).read() + "\n" + open(os.path.join(SRC, "ui_chat.js")).read() + "\n" + open(os.path.join(SRC, "ui_ticker.js")).read()
data_js = "window.PN_DATA=" + json.dumps(D, separators=(",", ":")) + ";\nwindow.PN_BASEMAP=" + json.dumps(BM, separators=(",", ":")) + ";\n" + "window.PN_ARTIFACT_URL=" + json.dumps(ARTIFACT_URL) + ";\n" + ("window.PN_CHAT_ENDPOINT=" + json.dumps(CHAT_ENDPOINT) + ";\n" if CHAT_ENDPOINT else "")

D3 = '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>'
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">'
DESC = "A public, free model of the US containerboard and corrugated box market: every mill from the filings, box demand by county, the min-cost flows between them, prices, diesel, the recovered-fiber loop, maintenance calendars and who would switch supplier for how much."
body = render({"theme_button": theme_btn})
page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>The Paper Network</title>
<meta name="description" content="{html.escape(DESC)}">
<meta property="og:type" content="website">
<meta property="og:title" content="The Paper Network">
<meta property="og:description" content="{html.escape(DESC)}">
<meta property="og:image" content="https://justfetz.github.io/the-paper-network/og.png">
<meta property="og:url" content="https://justfetz.github.io/the-paper-network/">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="The Paper Network">
<meta name="twitter:description" content="{html.escape(DESC)}">
<meta name="twitter:image" content="https://justfetz.github.io/the-paper-network/og.png">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231f5f4e'/%3E%3Cpath d='M7 12l9-5 9 5v8l-9 5-9-5z' fill='none' stroke='%23fff' stroke-width='2'/%3E%3Cpath d='M7 12l9 5 9-5M16 17v8' fill='none' stroke='%23fff' stroke-width='2'/%3E%3C/svg%3E">
{FONTS}
<style>
{css}</style>
</head>
<body>
{body}
{D3}
<script src="data.js"></script>
<script>
{js}</script>
</body>
</html>
"""
open(os.path.join(HERE, "index.html"), "w").write(page); open(os.path.join(HERE, "data.js"), "w").write(data_js); open(os.path.join(HERE, "ui.js"), "w").write(js)
json.dump({"schemaVersion": 1, "label": "model run", "message": D["generated"], "color": "1f5f4e"}, open(os.path.join(HERE, "badge.json"), "w"))   # shields.io endpoint badge in the README
artifact = f"""<title>The Paper Network</title>
<meta name="claude:viewport-fit-sides" content="cover">
{FONTS}
<style>
{css}</style>
{body}
{D3}
<script>
{data_js}</script>
<script>
{js}</script>
"""
open(os.path.join(HERE, "artifact.html"), "w").write(artifact)
d3_local = sys.argv[3] if len(sys.argv) > 3 else ""
if d3_local and os.path.exists(d3_local):
    test = "<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>" + artifact.replace(D3, "<script>" + open(d3_local).read() + "</script>").replace("<header", "</head><body><header", 1) + "</body></html>"
    open(os.path.join(HERE, "test.html"), "w").write(test)
sizes = {f: os.path.getsize(os.path.join(HERE, f)) // 1024 for f in ["index.html", "data.js", "ui.js", "artifact.html"] + (["test.html"] if d3_local else [])}
print("built", sizes, "KB")
print("closure ranks (idle list):", [rank[r['mill']] for r in closed], "surplus ranks:", closed_ls_ranks, "| surplus of closed:", [local_surplus.get(r['mill']) for r in closed])
print("facts:", D["facts"]["backtest"])
