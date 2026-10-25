"""Smoke tests for the committed model output, the site build, the workflows and the eval scaffold. No pytest needed:
    pip install numpy pandas scipy pyyaml && python tests/test_smoke.py
Fails loudly on anything that would make the page lie: tons that do not balance, a mill over capacity, a scenario missing,
a workflow that does not parse, a site build without its data."""
import json, os, sys, glob, subprocess, tempfile, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(ROOT, "model"))
fails = []
def check(name, cond, detail=""):
    print(("ok   " if cond else "FAIL ") + name + (f"   [{detail}]" if (detail and not cond) else "")); 
    if not cond: fails.append(name)

d = json.load(open(os.path.join(ROOT, "data", "paper_network.json")))
mills, nodes, S = d["mills"], d["nodes"], d["scenarios"]
check("mill table and market list sizes", 80 <= len(mills) <= 120 and len(nodes) == 441, f"{len(mills)} mills, {len(nodes)} markets")
check("every scenario the site lists is present", all(k in S for k in ["fp2024", "fp2026", "cf2026", "dz3", "dz5", "dz6"]) and sum(1 for k in S if k.startswith("ko")) == 20 and sum(1 for k in S if k.startswith("m")) == 12)
for key in ["fp2024", "fp2026", "cf2026"]:
    s, k = S[key], S[key]["kpi"]
    check(f"{key}: shipped + unmet = demand", abs(k["tons_shipped_domestic"] + k["unmet_tons"] - s["demand_tons"]) < 1, f"{k['tons_shipped_domestic']} + {k['unmet_tons']} vs {s['demand_tons']}")
    check(f"{key}: exports = export demand", abs(k["tons_exported"] - s["export_tons"]) < 1)
for key, s in S.items():
    k = s["kpi"]
    check(f"{key}: freight per ton and rail share sane", 30 <= k["avg_freight_per_ton"] <= 120 and 0 < k["rail_share"] < 1 and k["freight_usd"] > 0, f"{k['avg_freight_per_ton']} $/t, rail {k['rail_share']}")
fp = S["fp2026"]
check("drawn arcs carry nearly all domestic tons", 0.95 <= sum(a[2] for a in fp["arcs"]) / fp["kpi"]["tons_shipped_domestic"] <= 1.001)
check("export arcs carry all export tons (within 0.1%)", abs(sum(e[2] for e in fp["exports"]) - fp["kpi"]["tons_exported"]) <= 0.001 * fp["kpi"]["tons_exported"], f"{sum(e[2] for e in fp['exports'])} vs {fp['kpi']['tons_exported']}")
check("no mill above capacity", not [m for m in mills if m["status"] == "open" and fp["shipped"][m["id"]] > m["cap"] * 1.001 + 1])
check("utilization and scarcity values well-formed", all(0 <= u <= 1.001 for u in fp["util"]) and all(v >= -1e-6 for v in fp["shadow"]))
check("delivered marginal cost per market", len(fp["node_mc"]) == 441 and all(0 < v < 400 for v in fp["node_mc"] if v), f"min {min(fp['node_mc'])}, max {max(fp['node_mc'])}")
check("knockouts: twenty, sorted by network cost", len(d["knockouts"]) == 20 and d["knockouts"][0]["d_total"] >= max(x["d_total"] for x in d["knockouts"]))
check("prospects: a switching gap for every market", len(d["prospects"]["L"]) == 441 and all(p["gap"] >= 0 for p in d["prospects"]["L"] if p))
check("price shocks lose tons, never gain", all(s["market_tons_after"] <= s["base_market_tons"] + 1 for s in d["price_shocks"].values()))
co = d["calendar_opt"]; check("calendar: optimized penalty below staggered", co["opt_actual_annual_penalty"] < co["random_actual_annual_penalty"])
try:
    import netmodel
    f = netmodel.freight_cost
    check("freight rises with distance and diesel", f(100) < f(500) < f(1500) and f(500, diesel=6.0) > f(500, diesel=3.0))
except Exception as e: check("netmodel imports and freight_cost runs", False, repr(e))
c = json.load(open(os.path.join(ROOT, "data", "corrugators.json")))
check("corrugator tier: 441 markets, utilization in range", len(c["nodes"]) == 441 and 0 < c["kpi"]["national_utilization"] < 1.2)
pl = json.load(open(os.path.join(ROOT, "data", "plants_by_node.json")))
check("plant layer: EPA sites counted per market", len(pl["nodes"]) == 441 and pl["sources"]["frs"]["box_plants"] > 1000)
try:
    import yaml
    for wf in sorted(glob.glob(os.path.join(ROOT, ".github", "workflows", "*.yml"))):
        y = yaml.safe_load(open(wf)); check(f"workflow parses: {os.path.basename(wf)}", isinstance(y, dict) and "jobs" in y)
except ImportError: print("skip workflow parse (pip install pyyaml)")
# the chat's lookups, through their Python mirror (the page's JS mirrors the same logic and is exercised by the Playwright harness)
try:
    sys.path.insert(0, os.path.join(ROOT, "evals")); sys.argv = [sys.argv[0], "x", os.path.join(ROOT, "data", "paper_network.json")]
    import run_chat_eval as rce
    defs, impl = rce.tools_over(d)
    chi = impl["find_market"]("Chicago")[0]
    check("chat lookup: Chicago resolves to Cook, IL with demand, cost and suppliers", chi["market"] == "Cook, IL" and chi["board_demand_tons_per_year"] > 100000 and chi["delivered_marginal_cost_usd_per_ton"] > 0 and len(chi["top_supplying_mills"]) >= 3 and chi["cheapest_linerboard_sources"]["switching_gap_usd_per_ton"] >= 0, json.dumps(chi)[:200])
    check("chat lookup: Houston, TX and Cook both resolve", impl["find_market"]("Houston, TX")[0]["market"] == "Harris, TX" and impl["find_market"]("Cook")[0]["market"] == "Cook, IL")
    check("chat lookup: a state beats the city alias (Madison, AL is the county, bare Madison is the WI city)", impl["find_market"]("Madison, AL")[0]["market"] == "Madison, AL" and impl["find_market"]("Madison")[0]["market"] == "Dane, WI" and impl["find_market"]("Chicago, IL")[0]["market"] == "Cook, IL")
    G = lambda unit, value, text: rce.grade(dict(kind="numeric", unit=unit, value=value, tol=0.03), text, ["lookup"])[0]
    check("eval grader reads units the model actually writes (Mt, million tons, raw dollars, $k, $M, billion, 0.419)", G("kt", 1050, "about 1.05 million tons a year") and G("kt", 1050, "1.05 Mt/yr") and G("kt", 355, "355,000 t per year") and not G("kt", 1050, "$1,050 million") and G("M", 171.05, "$171,048,536 a year") and G("M", 0.775, "about $775k") and G("B", 2.096, "$2,096 million") and G("B", 2.096, "$2.10 billion") and G("/t", 27.5, "$27.5/t") and not G("/t", 27.5, "$70/t") and G("%", 41.9, "rail share 0.419") and G("mi", 514, "514 miles"))
    check("eval grader allows words between a number and its unit, but not across clauses", G("kt", 71.25, "loses all 71,253 of its open-market tons a year") and G("kt", 201, "about 201,000 unmet tons") and not G("kt", 17, "17 markets that switch to other suppliers. Extra cost $775,000"))
    import re as _re; gq = json.load(open(os.path.join(ROOT, "evals", "chat_golden.json")))
    check("golden questions never double the state (no 'Tarrant, TX, TX')", not [q for q in gq if _re.search(r", ([A-Z]{2}), \1\b", q["question"])])
    mans = impl["find_mill"]("Mansfield")[0]
    check("chat lookup: Mansfield has a knockout cost and named top markets", mans["if_this_mill_goes_down"]["network_cost_usd_per_year"] > 1e7 and mans["top_markets_served"] and ", TX, TX" not in mans["top_markets_served"][0])
    fp_ = impl["find_plants"]("International Paper", "TX"); check("chat lookup: plant search returns rows as registered, no guessed owner", fp_["matches"] > 0 and "registered_name" in fp_["shown"][0] and "owner_guess" not in json.dumps(fp_))
    check("chat lookup: price shock and scenarios", impl["price_shock"]("IP")["open_market_tons_before"] > 0 and len(impl["scenarios"]()) > 20 and len(defs) == 6)
except Exception as e: check("chat lookups import and run", False, repr(e))
tmp = tempfile.mkdtemp()
r = subprocess.run([sys.executable, os.path.join(ROOT, "evals", "chat_golden.py"), os.path.join(ROOT, "data", "paper_network.json"), os.path.join(tmp, "g.json")], capture_output=True, text=True)
check("chat golden set generates (>= 40 questions)", r.returncode == 0 and len(json.load(open(os.path.join(tmp, "g.json")))) >= 40, r.stderr[-300:])
r = subprocess.run([sys.executable, os.path.join(ROOT, "site", "build_site.py"), os.path.join(ROOT, "data", "paper_network.json"), os.path.join(ROOT, "data", "basemap.json")], capture_output=True, text=True, cwd=os.path.join(ROOT, "site"))
idx = open(os.path.join(ROOT, "site", "index.html")).read() if r.returncode == 0 else ""
check("site builds", r.returncode == 0, r.stderr[-300:])
check("site has its data, the chat, the tape and no unfilled placeholders", "PN_DATA" in open(os.path.join(ROOT, "site", "data.js")).read()[:40] and "chat-fab" in open(os.path.join(ROOT, "site", "ui.js")).read() and "ticker" in open(os.path.join(ROOT, "site", "ui.js")).read() and "{{n_plants}}" not in idx and "{{generated}}" not in idx)
ui_js = open(os.path.join(ROOT, "site", "ui.js")).read(); tpl = open(os.path.join(ROOT, "site", "src", "index.template.html")).read()
check("guide is bundled: a How-to card per tab, the question index, the tour and the header button", "How to use · " in ui_js and "Which view answers what" in ui_js and "tour-card" in ui_js and 'id="guide-btn"' in tpl and all(k in ui_js for k in ["flows: {", "corr: {", "thru: {", "prospects: {", "prices: {", "fiber: {", "demand: {", "backtest: {", "method: {"]))
r = subprocess.run([sys.executable, os.path.join(ROOT, "tests", "test_public_sources.py")], capture_output=True, text=True, cwd=ROOT)
check("public freight sources: FAF5 / Census trade / OSRM aggregation and the solver on measured lanes", r.returncode == 0, (r.stdout + r.stderr)[-600:])
r = subprocess.run([sys.executable, os.path.join(ROOT, "audit", "recompute.py"), "--no-solve", "--strict"], capture_output=True, text=True, cwd=ROOT)
check("audit: headline totals sit inside the tolerance of their public anchors (capacity, production, IP, PCA, integration)", r.returncode == 0, (r.stdout + r.stderr)[-600:])
_pd = open(os.path.join(ROOT, "site", "data.js")).read(); _D = json.loads(_pd[len("window.PN_DATA="):_pd.index(";\nwindow.PN_BASEMAP=")])
check("sources: the page data cites a source for nearly every mill, and the sources card is bundled", sum(1 for m in _D["mills"] if m.get("src")) >= 0.9 * len(_D["mills"]) and all("basis" in m for m in _D["mills"]) and "Where this comes from" in open(os.path.join(ROOT, "site", "ui.js")).read())
check("model-run badge written", os.path.exists(os.path.join(ROOT, "site", "badge.json")))
if shutil.which("node"):
    for js in sorted(glob.glob(os.path.join(ROOT, "site", "src", "*.js"))) + [os.path.join(ROOT, "chat", "worker.js")]:
        r = subprocess.run(["node", "--check", js], capture_output=True, text=True); check(f"js parses: {os.path.relpath(js, ROOT)}", r.returncode == 0, r.stderr[-200:])
else: print("skip js syntax (no node)")
shutil.rmtree(tmp, ignore_errors=True)
print(f"\n{len(fails)} failed" if fails else "\nall checks passed"); sys.exit(1 if fails else 0)
