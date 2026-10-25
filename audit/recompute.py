#!/usr/bin/env python3
"""Receipts for The Paper Network: recompute the headline numbers from the raw files, check them against public
anchors, show what every mill figure rests on, and re-solve the October 2026 network under perturbed assumptions.
Writes audit/recompute.json and audit/RECEIPTS.md. No network access is needed.

    python audit/recompute.py                         # anchors + sensitivity re-solves (a few minutes)
    python audit/recompute.py --no-solve              # anchors only (seconds); keeps the last run's re-solves
    python audit/recompute.py --before old.json       # also tabulate how the headline outputs moved against an older model run
    python audit/recompute.py --no-solve --strict     # exit 1 if a checked anchor is outside its tolerance (the smoke test runs this)
"""
import argparse, collections, csv, glob, json, os, sys, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "model"))
MT = 1e6

# Public figures the model is checked against: short tons per year unless stated. "derived" = arithmetic on published figures.
ANCHORS = {
    "cap24": dict(value=41.4e6, tol=0.06, label="US containerboard capacity, 2024", source="AF&PA capacity surveys: 2021 record 42.3 Mt, then -0.6%, -0.7%, -0.9% (derived)", url="https://www.afandpa.org/news/2025/afpa-details-us-paper-production-and-capacity-trends"),
    "closures": dict(value=3.9e6, tol=0.10, label="Capacity permanently retired, Feb 2025 to Mar 2026", source="Fastmarkets: ~3.9 Mt, roughly 10% of capacity", url="https://www.fastmarkets.com/insights/north-american-containerboard-market-capacity-cuts/"),
    "cap_after": dict(value=37.5e6, tol=0.05, label="US capacity after those closures", source="41.4 Mt less 3.9 Mt (derived); the model's October 2026 footprint also carries IP's Riverdale PM16 conversion, due by Q3 2026", url="https://www.fastmarkets.com/insights/north-american-containerboard-market-capacity-cuts/"),
    "cap25": dict(value=39.3e6, tol=0.08, label="US capacity, 2025 (AF&PA annual figure)", source="AF&PA 66th survey: -5.1% in 2025 (derived). AF&PA counts a mill that closed in September for most of the year, so its annual figure sits above a year-end footprint", url="https://www.afandpa.org/news/2026/afpa-releases-66th-annual-paper-industry-capacity-and-fiber-consumption-survey"),
    "prod24": dict(value=37.7e6, tol=0.05, label="US containerboard production, 2024", source="AF&PA: 2025 production of 36.1 Mt was -4.4% y/y (derived)", url="https://www.afandpa.org/news/2026/afpa-releases-66th-annual-paper-industry-capacity-and-fiber-consumption-survey"),
    "prod25": dict(value=36.1e6, tol=0.05, label="US containerboard production, 2025 (model: October 2026 footprint)", source="AF&PA 66th survey", url="https://www.afandpa.org/news/2026/afpa-releases-66th-annual-paper-industry-capacity-and-fiber-consumption-survey"),
    "ip_raw": dict(value=12.984e6, tol=0.06, label="International Paper: public per-mill figures, summed, vs IP's own 2024 US total", source="IP FY2024 annual report, Appendix II: 12,984 thousand short tons including Campti", url="https://www.sec.gov/Archives/edgar/data/51434/000119312525069955/d856503dars.pdf"),
    "pca_raw": dict(value=5.8e6, tol=0.06, label="PCA: last per-mill disclosures, summed, vs PCA's own year-end-2025 total", source="PCA FY2025 10-K: about 5.8 million tons (358 BSF)", url="https://www.sec.gov/Archives/edgar/data/75677/000119312526074129/pkg-20251231.htm"),
    "ip_int": dict(value=0.80, tol=0.12, label="IP board to its own box plants (share)", source="IP 10-K FY2019-22: about 80%", url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000051434&type=10-K"),
    "imports": dict(value=1.40e6, tol=0.0, label="Containerboard imports into the US, 2024 (model: Canadian mills' tons into US markets)", source="Fastmarkets: 1.27 M tonnes, mostly from Canada", url="https://www.fastmarkets.com/insights/north-american-linerboard-price-increases/"),
}

def fnum(x):
    try: return float(x)
    except (TypeError, ValueError): return 0.0

def basis_class(r):
    b = (r["capacity_basis"] or "").lower(); u = (r["source_url"] or "").lower()
    if "scaled x" in b: return "company total, split by older public figures"
    if b.startswith("estimate") or b.startswith("derived"): return "estimate"
    if "sec.gov" in u or "10-k" in b or "8-k" in b or "annual report" in b: return "SEC filing"
    if any(k in b for k in ("company", "release", "investor", "permit", "website")) or any(k in u for k in ("news.gp.com", "ir.packagingcorp", "prnewswire", "cascades.com", "krugerproducts", "jdirving", "gbp.com", "domtar.com", "ndpaper", "newindy", "prattindustries", "smurfitwestrock")): return "company statement"
    return "trade press"

def open_at(r, year):
    return r["status_oct2026"] == "open" or (r["status_oct2026"] == "closed" and fnum(r["closed_year"]) > year)

def mill_checks(rows):
    us = [r for r in rows if r["country"] == "US"]
    cap24 = sum(fnum(r["capacity_2024"] or r["capacity_tons_per_year"]) for r in us if open_at(r, 2024))
    cap26 = sum(fnum(r["capacity_tons_per_year"]) for r in us if r["status_oct2026"] == "open")
    ye25 = sum(fnum(r["capacity_2024"] or r["capacity_tons_per_year"]) for r in us if open_at(r, 2025))   # before the 2026 machine changes (Wallula W2 out, Riverdale PM16 in)
    closed_2025 = [r for r in us if r["status_oct2026"] == "closed" and fnum(r["closed_year"]) == 2025]
    cuts = [(r, fnum(r["capacity_2024"]) - fnum(r["capacity_tons_per_year"])) for r in us if r["status_oct2026"] == "open" and fnum(r["capacity_2024"]) > fnum(r["capacity_tons_per_year"])]
    adds = [(r, fnum(r["capacity_tons_per_year"]) - fnum(r["capacity_2024"])) for r in us if r["status_oct2026"] == "open" and fnum(r["capacity_tons_per_year"]) > fnum(r["capacity_2024"])]
    retired = sum(fnum(r["capacity_tons_per_year"]) for r in closed_2025) + sum(c for _, c in cuts)
    by_owner26 = collections.Counter(); by_owner24 = collections.Counter()
    for r in us:
        if open_at(r, 2024): by_owner24[r["owner_2024"] or r["owner"]] += fnum(r["capacity_2024"] or r["capacity_tons_per_year"])
        if r["status_oct2026"] == "open": by_owner26[r["owner"]] += fnum(r["capacity_tons_per_year"])
    pca_ye25 = sum(fnum(r["capacity_2024"]) for r in us if r["owner"] == "Packaging Corp of America" and open_at(r, 2025))
    cls = collections.Counter(); ncls = collections.Counter(); conf = collections.Counter(); nconf = collections.Counter()
    for r in us:
        if r["status_oct2026"] != "open": continue
        c = fnum(r["capacity_tons_per_year"]); k = basis_class(r); cls[k] += c; ncls[k] += 1; conf[r["confidence"]] += c; nconf[r["confidence"]] += 1
    est = sorted([r for r in us if r["status_oct2026"] == "open" and basis_class(r) == "estimate"], key=lambda r: -fnum(r["capacity_tons_per_year"]))
    return dict(n_us=len(us), n_open_2026=sum(1 for r in us if r["status_oct2026"] == "open"), n_open_2024=sum(1 for r in us if open_at(r, 2024)),
                cap24=cap24, cap26=cap26, ye25=ye25, retired=retired, pca_ye25=pca_ye25, by_owner_2024=dict(by_owner24), by_owner_2026=dict(by_owner26),
                closures=[dict(mill=r["mill_name"], st=r["state"], owner=r["owner"], kt=round(fnum(r["capacity_tons_per_year"]) / 1e3)) for r in closed_2025] + [dict(mill=r["mill_name"] + " (machine)", st=r["state"], owner=r["owner"], kt=round(c / 1e3)) for r, c in cuts],
                additions=[dict(mill=r["mill_name"], st=r["state"], owner=r["owner"], kt=round(c / 1e3)) for r, c in adds],
                by_class={k: dict(mills=ncls[k], share=round(v / cap26, 3)) for k, v in cls.most_common()}, by_confidence={k: dict(mills=nconf[k], share=round(v / cap26, 3)) for k, v in conf.most_common()},
                estimates=[dict(mill=r["mill_name"], st=r["state"], owner=r["owner"], kt=round(fnum(r["capacity_tons_per_year"]) / 1e3), basis=r["capacity_basis"][:140]) for r in est])

def model_checks(D):
    s24, s26 = D["scenarios"]["fp2024"], D["scenarios"]["fp2026"]; mills = D["mills"]; p = D["params"]
    def out(s, country): return sum(s["shipped"][m["id"]] for m in mills if m["country"] == country and m["id"] < len(s["shipped"]))
    ip = s26["integration"].get("International Paper", {}); ip_tot = ip.get("total", 0) + ip.get("exports", 0)
    return dict(demand_2024=p["demand_2024"], exports_2024=p["exports_2024"], demand_2026=p["demand_2026"], exports_2026=p["exports_2026"],
                us_out_2024=out(s24, "US"), us_out_2026=out(s26, "US"), ca_2024=out(s24, "CA"), ca_2026=out(s26, "CA"), haul_2026=float(s26["kpi"]["avg_haul_miles"]), rail_2026=float(s26["kpi"]["rail_share"]), ip_int=(ip.get("internal", 0) / ip_tot) if ip_tot else None,
                kpi_2026=s26["kpi"], kpi_2024=s24["kpi"], occ=D["occ"]["kpi"], premium=p["premium"], freight=p["freight"],
                knockouts=[dict(mill=k["name"], st=k["st"], owner=k["owner"], cap_kt=round(k["cap"] / 1e3), musd=round(k["d_total"] / 1e6, 1), unmet_kt=round(k["unmet"] / 1e3)) for k in sorted(D["knockouts"], key=lambda k: -k["d_total"])[:10]])

def demand_checks():
    pl = json.load(open(os.path.join(ROOT, "data", "plants_by_node.json")))
    vp = os.path.join(ROOT, "data", "plants_verified.csv"); ver = list(csv.DictReader(open(vp))) if os.path.exists(vp) else []
    frs = list(csv.DictReader(open(os.path.join(ROOT, "data", "plants_frs_box.csv"))))
    return dict(weighting=pl.get("weighting_note"), vs_epa=pl.get("log_error_vs_frs_share"), vs_cbp_state=pl.get("log_error_vs_cbp_state_emp_share"), cbp=pl.get("sources", {}).get("cbp_state"),
                epa_sites=len(frs), verified=dict(n=len(ver), operating=sum(1 for r in ver if r["operating"] == "yes"), closed=sum(1 for r in ver if r["operating"] == "no")))

def anchors(mc, md, chg):
    rows = []
    def add(key, model, note=""):
        a = ANCHORS[key]; dev = (model - a["value"]) / a["value"]; ok = (abs(dev) <= a["tol"]) if a["tol"] else None
        rows.append(dict(key=key, check=a["label"], model=model, anchor=a["value"], deviation=round(dev, 4), tolerance=a["tol"], ok=ok, source=a["source"], url=a["url"], note=note))
    add("cap24", mc["cap24"], "every US mill open in 2024, at its 2024 capacity")
    add("closures", mc["retired"], "mills the database closes in 2025, plus machines retired at mills that stay open")
    add("cap_after", mc["cap26"], "the October 2026 footprint")
    add("cap25", mc["ye25"], "mills open at the end of 2025, before the 2026 machine changes")
    add("prod24", md["us_out_2024"], f"US mills' shipments plus exports in the solved 2024 network; the overshoot ({(md['us_out_2024'] - ANCHORS['prod24']['value']) / MT:+.2f} Mt) matches the Canadian import gap in the last row ({(ANCHORS['imports']['value'] - md['ca_2024']) / MT:.2f} Mt): board the solver makes at US mills that in reality crosses the border")
    add("prod25", md["us_out_2026"], "US mills' shipments plus exports in the solved October 2026 network; 2026 production is running below 2025")
    if chg:
        add("ip_raw", chg["ip_per_mill_sum_2024_before_kt"] * 1e3, f"before calibration; the database now scales IP's 11 oldest rows x{chg['ip_factor']} so they sum to IP's figure")
        add("pca_raw", chg["pca_last_disclosed_sum_ye2025_kt"] * 1e3, f"PCA stopped publishing per-mill figures after FY2011-12; the database scales the last ones x{chg['pca_factor']} to PCA's total")
    add("ip_int", md["ip_int"] or 0, "known bias: a cost-minimizing solver keeps more of an integrated producer's board at home than contracts do")
    add("imports", md["ca_2024"], "known gap: the solver buys Canadian board only where freight favors it; contracts and currency move about three times as much")
    rows.extend(measured_freight_anchors(md))
    return rows


def measured_freight_anchors(md):
    """Anchors that exist only once their public pull has run (ingest/faf5.py, ingest/census_trade_ports.py).
    Absent files add no rows and fail nothing; the receipts say the measurement is pending."""
    rows = []
    fpath = os.path.join(ROOT, "data", "faf5_summary.json")
    # These rows carry strict False: a data pull must never turn CI red. They print CHECK / outside tolerance in
    # the receipts when the model disagrees with the measurement, which is the point; the gate stays on the
    # capacity, production and company anchors above.
    if os.path.exists(fpath):
        f = json.load(open(fpath)); c27 = f.get("commodities", {}).get("27", {}); yr = f.get("year")
        src = f"FAF5 {yr}, SCTG 27 (all paper and paperboard; containerboard is inside it): ton-miles / tons, domestic flows"
        url = "https://faf.ornl.gov/faf5"
        if c27.get("avg_haul_mi"):
            dev = (md["haul_2026"] - c27["avg_haul_mi"]) / c27["avg_haul_mi"]
            rows.append(dict(key="haul_faf5", check="Average haul, October 2026 network vs FAF5 paper", model=md["haul_2026"], anchor=c27["avg_haul_mi"], deviation=round(dev, 4), tolerance=0.25, ok=abs(dev) <= 0.25, strict=False, source=src, url=url,
                             note="tons-weighted miles of the solved domestic flows against FAF5's measured ton-miles over tons; a wide tolerance because SCTG 27 mixes pulp and printing grades with containerboard"))
        if c27.get("rail_tons_share") is not None:
            dev = (md["rail_2026"] - c27["rail_tons_share"]) / max(c27["rail_tons_share"], 1e-9)
            rows.append(dict(key="rail_faf5", check="Rail share of domestic tons vs FAF5 paper", model=md["rail_2026"], anchor=c27["rail_tons_share"], deviation=round(dev, 4), tolerance=0.30, ok=abs(dev) <= 0.30, strict=False, source=src, url=url,
                             note="the model's rail flag is the cheaper-mode rule in freight_cost; FAF5 reports the mode actually used"))
    tpath = os.path.join(ROOT, "data", "trade_paper_ports_summary.json")
    if os.path.exists(tpath):
        imp = (json.load(open(tpath)).get("imports") or {})
        if imp.get("total_short_tons"):
            dev = (md["ca_2024"] - imp["total_short_tons"]) / imp["total_short_tons"]
            rows.append(dict(key="imports_census", check="Containerboard imports vs Census HS 4804+4805 imports, last 12 months", model=md["ca_2024"], anchor=imp["total_short_tons"], deviation=round(dev, 4), tolerance=0.0, ok=None, strict=False,
                             source=f"Census trade API, imports by port, HS 4804+4805, {imp.get('periods')}; Canada share {imp.get('canada_share')}", url="https://api.census.gov/data/timeseries/intltrade/imports/porths",
                             note="known gap, shown with a measured anchor: HS 4804+4805 is wider than containerboard, so the anchor is an upper bound"))
    return rows

def sensitivity(D):
    import numpy as np, pandas as pd, netmodel
    from netmodel import aggregate_demand_nodes, county_weights, build_and_solve, FREIGHT
    counties = pd.read_csv(os.path.join(ROOT, "data", "counties.csv"), dtype={"fips": str}); nodes = aggregate_demand_nodes(county_weights(counties))
    pl = json.load(open(os.path.join(ROOT, "data", "plants_by_node.json")))
    if pl.get("emp_weights") and len(pl["emp_weights"]) == len(nodes):
        emp = np.array(pl["emp_weights"], dtype=float); proxy = nodes.w_total.values / nodes.w_total.sum(); nodes["w_total"] = 0.85 * emp / emp.sum() + 0.15 * proxy
    allm = pd.read_csv(os.path.join(ROOT, "data", "mills_final.csv")); allm = allm[allm.lat.notna()].reset_index(drop=True)
    fp26 = allm[allm.country.isin(["US", "CA"]) & (allm.status_oct2026 == "open")].reset_index(drop=True)
    p = D["params"]; shares = p["shares"]; base_f = dict(FREIGHT)
    top = [k["name"] for k in sorted(D["knockouts"], key=lambda k: -k["d_total"])[:5]]
    def solve(premium=None, truck=1.0, rail=1.0, diesel=None, integrated=None, knock=None):
        FREIGHT.update(base_f); FREIGHT["truck_per_mi"] = base_f["truck_per_mi"] * truck; FREIGHT["rail_per_mi"] = base_f["rail_per_mi"] * rail
        kw = dict(premium=p["premium"] if premium is None else premium, verbose=False, diesel=netmodel.DIESEL_BASE if diesel is None else diesel)
        sh = shares if integrated is None else {k: v * integrated / sum(shares.values()) for k, v in shares.items()}
        a = None
        if knock is not None: a = np.ones(len(fp26)); a[int(fp26.index[fp26.mill_name == knock][0])] = 0.0
        try: return build_and_solve(fp26, nodes, p["demand_2026"], sh, p["exports_2026"], availability=a, **kw)
        finally: FREIGHT.update(base_f)
    cases = [("base", {}), ("truck cost +20%", dict(truck=1.2)), ("truck cost -20%", dict(truck=0.8)), ("rail cost +20%", dict(rail=1.2)), ("rail cost -20%", dict(rail=0.8)),
             ("open-market premium $80/t", dict(premium=80.0)), ("open-market premium $200/t", dict(premium=200.0)), ("diesel $5.00/gal", dict(diesel=5.0)),
             ("integrated share 80%", dict(integrated=0.80)), ("integrated share 92%", dict(integrated=0.92))]
    out = []
    for name, kw in cases:
        t0 = time.time(); r = solve(**kw); k = solve(knock=top[0], **kw); ip = r["integration"].get("International Paper", {}); ip_tot = ip.get("total", 0) + ip.get("exports", 0)
        res = dict(case=name, avg_haul_miles=round(r["kpi"]["avg_haul_miles"]), rail_share=round(r["kpi"]["rail_share"], 3), freight_per_ton=round(r["kpi"]["avg_freight_per_ton"], 1), freight_musd=round(r["kpi"]["freight_usd"] / 1e6),
                   unmet_kt=round(r["kpi"]["unmet_tons"] / 1e3), ip_internal_share=round(ip.get("internal", 0) / ip_tot, 3) if ip_tot else None,
                   top_knockout=top[0], top_knockout_musd=round((k["kpi"]["objective_usd"] - r["kpi"]["objective_usd"]) / 1e6, 1), top_knockout_unmet_kt=round(k["kpi"]["unmet_tons"] / 1e3), seconds=round(time.time() - t0, 1))
        out.append(res); print(f"  {name:28s} haul {res['avg_haul_miles']} mi · rail {res['rail_share']:.0%} · ${res['freight_per_ton']}/t · {top[0]} out +${res['top_knockout_musd']}M · {res['seconds']}s", flush=True)
    ranking = []
    for name, kw in [("open-market premium $80/t", dict(premium=80.0)), ("open-market premium $200/t", dict(premium=200.0))]:
        r = solve(**kw); costs = {m: round((solve(knock=m, **kw)["kpi"]["objective_usd"] - r["kpi"]["objective_usd"]) / 1e6, 1) for m in top}
        ranking.append(dict(case=name, order=sorted(costs, key=lambda m: -costs[m]), musd=costs)); print(f"  ranking at {name}: {ranking[-1]['order']}", flush=True)
    return dict(cases=out, ranking=ranking, base_order=top)

def before_after(old, new):
    def kp(D):
        s = D["scenarios"]["fp2026"]; k = s["kpi"]; mills = D["mills"]
        us = [m for m in mills if m["country"] == "US" and m["status"] == "open"]; cap = sum(m["cap"] for m in us); shipped = sum(s["shipped"][m["id"]] for m in us if m["id"] < len(s["shipped"]))
        sh = sorted(v for v in s["shadow"] if v > 0); kos = sorted(D["knockouts"], key=lambda x: -x["d_total"])
        shock = {o: round((v["base_market_tons"] - v["market_tons_after"]) / 1e3) for o, v in D["price_shocks"].items()}
        mans = next((x for x in kos if x["name"] == "Mansfield"), None)
        return {"US mills open (Oct 2026)": len(us), "US capacity, Oct 2026 (Mt)": round(cap / MT, 2), "US mill utilization": f"{shipped / cap:.1%}" if cap else None,
                "Average haul (mi)": round(k["avg_haul_miles"]), "Rail share": f"{k['rail_share']:.1%}", "Freight ($/t)": round(k["avg_freight_per_ton"], 1), "Freight bill ($M/yr)": f"{k['freight_usd'] / 1e6:,.0f}",
                "Unmet demand (kt)": round(k["unmet_tons"] / 1e3), "Bought outside own system (kt)": f"{k['owner_purchased_from_market_tons'] / 1e3:,.0f}",
                "Mills with a positive scarcity value": len(sh), "Median scarcity value ($/t)": round(sh[len(sh) // 2], 1) if sh else 0,
                "Costliest knockout": f"{kos[0]['name']} +${kos[0]['d_total'] / 1e6:.0f}M/yr", "Second": f"{kos[1]['name']} +${kos[1]['d_total'] / 1e6:.0f}M/yr", "Third": f"{kos[2]['name']} +${kos[2]['d_total'] / 1e6:.0f}M/yr",
                "Mansfield knockout": f"+${mans['d_total'] / 1e6:.0f}M/yr, {mans['unmet'] / 1e3:.0f} kt unmet" if mans else None,
                **{f"{o} +$70/t alone: open-market tons lost (kt)": v for o, v in shock.items()}}
    a, b = kp(old), kp(new)
    return [dict(metric=m, before=a.get(m), after=b.get(m)) for m in b]

def fmt_t(v): return f"{v / MT:.2f} Mt" if abs(v) >= 1e5 else f"{v:.3f}"
def pct(v): return f"{v * 100:+.1f}%"

def receipts_md(res):
    mc, md, dd, chg, an, sens, ba = res["mills"], res["model"], res["demand"], res.get("changes"), res["checks"], res.get("sensitivity"), res.get("before_after")
    L = []; A = L.append; get = {c["key"]: c for c in an}
    A("# Receipts: how The Paper Network's numbers are checked")
    A(""); A(f"Generated {res['generated']} by `audit/recompute.py` from `data/mills_final.csv` and `data/paper_network.json`. It needs no network access; run it yourself and you get these tables.")
    A(""); A("Every figure in the model is public, and every mill row carries its source. This page sets the model's totals against the public anchors, shows what each mill figure rests on, lists what the last audit changed and why, and shows how far the outputs move when the assumptions move. If a number here is wrong, the fix is one row and one source: see the end of the page.")
    A(""); A("## The short version"); A("")
    checked = [c for c in an if c["ok"] is not None]; ok = [c for c in checked if c["ok"]]
    A(f"- **US capacity, 2024:** {fmt_t(get['cap24']['model'])} in the database against {fmt_t(get['cap24']['anchor'])} from AF&PA ({pct(get['cap24']['deviation'])}).")
    A(f"- **Closures, February 2025 to March 2026:** the database retires {fmt_t(get['closures']['model'])}; Fastmarkets counted about {fmt_t(get['closures']['anchor'])} ({pct(get['closures']['deviation'])}).")
    A(f"- **Production:** the solved 2024 network makes {fmt_t(get['prod24']['model'])} at US mills against AF&PA's {fmt_t(get['prod24']['anchor'])} ({pct(get['prod24']['deviation'])}); the October 2026 network makes {fmt_t(get['prod25']['model'])} against 2025's {fmt_t(get['prod25']['anchor'])} ({pct(get['prod25']['deviation'])}).")
    gap_p = get['prod24']['model'] - get['prod24']['anchor']; gap_i = get['imports']['anchor'] - get['imports']['model']
    A(f"- **Why 2024 production runs high:** the overshoot ({gap_p / MT:+.2f} Mt) is the Canadian import gap ({gap_i / MT:.2f} Mt). With demand and exports as assumed, every ton the solver does not buy from Canada it makes at a US mill; that is an explanation of the gap, not a second check.")
    if "ip_raw" in get: A(f"- **Company totals:** independent public per-mill figures for International Paper sum to within {abs(get['ip_raw']['deviation']) * 100:.1f}% of IP's own disclosed total, and PCA's to within {abs(get['pca_raw']['deviation']) * 100:.1f}% of PCA's. Smurfit Westrock's US and Canadian rows are read straight from its 10-K mill table.")
    A(f"- **{len(ok)} of {len(checked)} checked anchors are inside tolerance.** Two known gaps are shown, not hidden: the solver keeps more of IP's board in-house than IP reports, and it buys less Canadian board than actually crosses the border.")
    if sens:
        c = {x["case"]: x for x in sens["cases"]}; b = c["base"]; fr = [x["freight_per_ton"] for x in sens["cases"][1:5]]; ko = [x["top_knockout_musd"] for x in sens["cases"][1:5]]
        A(f"- **Sensitivity:** moving truck or rail costs 20% either way puts freight between ${min(fr)} and ${max(fr)} a ton (base ${b['freight_per_ton']}) and the {b['top_knockout']} knockout between ${min(ko)}M and ${max(ko)}M (base ${b['top_knockout_musd']}M). The open-market premium is the assumption that drives outage costs, so it is shown at $80 and $200 a ton.")
    A("")
    A("## 1. Totals against public anchors"); A("")
    A("| Check | Model | Public figure | Gap | Status | Source |"); A("|---|---|---|---|---|---|")
    for c in an:
        st = "within tolerance" if c["ok"] is True else ("outside tolerance" if c["ok"] is False else "known gap, shown")
        A(f"| {c['check']} | {fmt_t(c['model'])} | {fmt_t(c['anchor'])} | {pct(c['deviation'])} | {st} | [{c['source']}]({c['url']}) |")
    A(""); A("What each model figure is:"); A("")
    for c in an: A(f"- **{c['check']}:** {c['note']}.")
    A("")
    A("## 2. What each mill figure rests on"); A("")
    A(f"The database has {mc['n_us']} US mill rows; {mc['n_open_2026']} are open in October 2026. Shares are of open US capacity.")
    A(""); A("| Basis of the capacity figure | Mills | Share of capacity |"); A("|---|---|---|")
    for k, v in mc["by_class"].items(): A(f"| {k} | {v['mills']} | {v['share'] * 100:.0f}% |")
    A(""); A("\"Company total, split by older public figures\" means the company discloses its total (International Paper, PCA) but not each mill; the last public per-mill figures are scaled pro rata so the mills add up to the company's own number, and the factor is written into the row.")
    if mc["estimates"]:
        A(""); A("Open US mills whose figure is still an estimate. A better public number for any of these is a one-line fix:"); A("")
        A("| Mill | Owner | Capacity | What the estimate rests on |"); A("|---|---|---|---|")
        for e in mc["estimates"]: A(f"| {e['mill']}, {e['st']} | {e['owner']} | {e['kt']:,} kt | {e['basis']} |")
    A("")
    if chg:
        A(f"## 3. What the {chg['date']} audit changed"); A("")
        A(f"Checked against SEC filings, company releases and trade press. International Paper's oldest rows were scaled x{chg['ip_factor']} and PCA's x{chg['pca_factor']}, about what 10 to 19 years of debottlenecking adds to a mill.")
        A(""); A("| Mill | Owner | Before | After | Why |"); A("|---|---|---|---|---|")
        for x in chg["changes"]:
            bf = x["before"] or {}; af = x["after"] or {}
            if "owner_2024" in af: fb, fa = f"2024 owner: {bf.get('owner_2024')}", f"2024 owner: {af['owner_2024']}"
            elif "capacity_tons_per_year" in af: fb = "not listed" if x["before"] is None else f"{fnum(bf.get('capacity_tons_per_year')) / 1e3:,.0f} kt"; fa = f"{fnum(af['capacity_tons_per_year']) / 1e3:,.0f} kt" + (" (closed)" if af.get("status_oct2026") == "closed" else "")
            elif "capacity_2024" in af: fb, fa = f"{fnum(bf.get('capacity_2024')) / 1e3:,.0f} kt in 2024", f"{fnum(af['capacity_2024']) / 1e3:,.0f} kt in 2024"
            else: fb, fa = "", "flagged"
            A(f"| {x['mill']}, {x['st']} | {x['owner']} | {fb} | {fa} | {x['why']} |")
        A("")
    A("## 4. Closures, 2025 to March 2026"); A("")
    A("| Mill | Owner | Capacity |"); A("|---|---|---|")
    for x in mc["closures"]: A(f"| {x['mill']}, {x['st']} | {x['owner']} | {x['kt']:,} kt |")
    A(f"| **Total** | | **{mc['retired'] / 1e3:,.0f} kt** |")
    if mc["additions"]: A(""); A("Added at mills that stay open: " + "; ".join(f"{x['mill']}, {x['st']} ({x['owner']}) +{x['kt']:,} kt" for x in mc["additions"]) + ".")
    A("")
    if ba:
        A(f"## 5. How the headline outputs moved with the {chg['date'] if chg else 'last'} corrections"); A("")
        A("| October 2026 footprint | Before the audit | After |"); A("|---|---|---|")
        for x in ba: A(f"| {x['metric']} | {x['before']} | {x['after']} |")
        A(""); A("More capacity in the database means a network with more slack: lower scarcity values, less unmet demand when a big mill goes down, and smaller knockout costs. The corrected figures are the ones to quote.")
        A("")
    if sens:
        A("## 6. How far the outputs move when the assumptions move"); A("")
        A(f"Each row re-solves the October 2026 network with one assumption changed, then takes {sens['base_order'][0]} out again (re-solved {sens.get('generated', '2026-10-21')}; `python audit/recompute.py` without `--no-solve` refreshes this table).")
        A(""); A(f"| Case | Haul (mi) | Rail | Freight $/t | Freight bill $M | IP own-plant share | Unmet kt | {sens['base_order'][0]} out, $M/yr |"); A("|---|---|---|---|---|---|---|---|")
        for x in sens["cases"]: A(f"| {x['case']} | {x['avg_haul_miles']} | {x['rail_share'] * 100:.0f}% | {x['freight_per_ton']} | {x['freight_musd']:,} | {x['ip_internal_share'] * 100:.0f}% | {x['unmet_kt']} | +{x['top_knockout_musd']} ({x['top_knockout_unmet_kt']} kt unmet) |")
        A(""); A("The five costliest single-mill outages, re-ranked under the premium extremes (base order " + ", ".join(sens["base_order"]) + "):"); A("")
        for r in sens["ranking"]: A(f"- {r['case'][0].upper() + r['case'][1:]}: " + ", ".join(f"{m} +${r['musd'][m]}M" for m in r["order"]) + ".")
        A("")
    A("## 7. Demand placement"); A("")
    cb = dd.get("cbp") or {}; ve = dd.get("vs_epa") or {}
    A(f"State totals come from Census County Business Patterns employment for NAICS 322211 ({cb.get('establishments', 'n/a'):,} establishments, {cb.get('employment', 'n/a'):,} employees), so state shares match the Census by construction. Within a state, demand follows the EPA Facility Registry's {dd['epa_sites']:,} box-plant sites. Against EPA plant-count shares the model's state shares differ by an RMS log error of {ve.get('rms')} over {ve.get('n_states')} states: the difference between counting plants and counting tons, since Texas and the Southeast run bigger plants than New Jersey and Illinois.")
    A("")
    A("## 8. What these numbers are not"); A("")
    for t in ["The flows are the cheapest routing the solver finds, not a record of who ships to whom. Contracts, swaps and history move real board; none of that is public.",
              "Export tonnage is not published for free (AF&PA sells the trade dataset). The model assumes 4.6 Mt in 2024 and 3.6 Mt in 2026, consistent with AF&PA's reported percentage moves; domestic consumption carries the same uncertainty, ton for ton.",
              "Price points are midpoints of published index moves; the months between moves are chained and marked as derived.",
              "Mexican mills are listed for context and do not supply the US network in the model."]: A(f"- {t}")
    A(""); A("## 9. How to challenge a number"); A("")
    A("Open an issue at https://github.com/justfetz/the-paper-network with the row and a public source, or send a pull request against `data/mills_final.csv` with the citation in the source column. CI checks that the network still balances; the next refresh re-solves every scenario and regenerates this page.")
    return "\n".join(L) + "\n"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--no-solve", action="store_true"); ap.add_argument("--strict", action="store_true"); ap.add_argument("--before"); a = ap.parse_args()
    rows = list(csv.DictReader(open(os.path.join(ROOT, "data", "mills_final.csv")))); D = json.load(open(os.path.join(ROOT, "data", "paper_network.json")))
    logs = sorted(glob.glob(os.path.join(ROOT, "audit", "changes_*.json"))); chg = json.load(open(logs[-1])) if logs else None
    mc = mill_checks(rows); md = model_checks(D); dd = demand_checks(); an = anchors(mc, md, chg)
    prev_path = os.path.join(ROOT, "audit", "recompute.json"); prev = {}
    if os.path.exists(prev_path):
        try: prev = json.load(open(prev_path))
        except Exception: prev = {}
    print(f"Mill database: {mc['n_us']} US rows, {mc['n_open_2026']} open in Oct 2026; capacity by basis " + ", ".join(f"{k} {v['share']:.0%}" for k, v in mc["by_class"].items()))
    print(f"{'check':74s} {'model':>10s} {'anchor':>10s} {'gap':>7s}  status")
    for c in an: print(f"{c['check'][:74]:74s} {fmt_t(c['model']):>10s} {fmt_t(c['anchor']):>10s} {c['deviation']:+7.1%}  {'ok' if c['ok'] is True else ('CHECK' if c['ok'] is False else 'known gap')}")
    sens = prev.get("sensitivity") if isinstance(prev.get("sensitivity"), dict) else None
    if not a.no_solve: print("Sensitivity re-solves (October 2026 footprint):"); sens = sensitivity(D); sens["generated"] = time.strftime("%Y-%m-%d", time.gmtime())
    ba = before_after(json.load(open(a.before)), D) if a.before else prev.get("before_after")
    res = dict(generated=time.strftime("%Y-%m-%d", time.gmtime()), anchors=ANCHORS, checks=an, mills=mc, model=md, demand=dd, changes=chg, sensitivity=sens, before_after=ba)
    json.dump(res, open(prev_path, "w"), indent=1, default=float)
    open(os.path.join(ROOT, "audit", "RECEIPTS.md"), "w").write(receipts_md(res))
    bad = [c for c in an if c["ok"] is False and c.get("strict", True)]   # measured-freight rows report, never gate (see measured_freight_anchors)
    if a.strict and bad: print("FAILED anchors:", [c["check"] for c in bad]); sys.exit(1)

if __name__ == "__main__": main()
