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
check("export arcs carry all export tons", abs(sum(e[2] for e in fp["exports"]) - fp["kpi"]["tons_exported"]) < 1)
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
tmp = tempfile.mkdtemp()
r = subprocess.run([sys.executable, os.path.join(ROOT, "evals", "chat_golden.py"), os.path.join(ROOT, "data", "paper_network.json"), os.path.join(tmp, "g.json")], capture_output=True, text=True)
check("chat golden set generates (>= 40 questions)", r.returncode == 0 and len(json.load(open(os.path.join(tmp, "g.json")))) >= 40, r.stderr[-300:])
r = subprocess.run([sys.executable, os.path.join(ROOT, "site", "build_site.py"), os.path.join(ROOT, "data", "paper_network.json"), os.path.join(ROOT, "data", "basemap.json")], capture_output=True, text=True, cwd=os.path.join(ROOT, "site"))
idx = open(os.path.join(ROOT, "site", "index.html")).read() if r.returncode == 0 else ""
check("site builds", r.returncode == 0, r.stderr[-300:])
check("site has its data, the chat, the tape and no unfilled placeholders", "PN_DATA" in open(os.path.join(ROOT, "site", "data.js")).read()[:40] and "chat-fab" in open(os.path.join(ROOT, "site", "ui.js")).read() and "ticker" in open(os.path.join(ROOT, "site", "ui.js")).read() and "{{n_plants}}" not in idx and "{{generated}}" not in idx)
check("model-run badge written", os.path.exists(os.path.join(ROOT, "site", "badge.json")))
if shutil.which("node"):
    for js in sorted(glob.glob(os.path.join(ROOT, "site", "src", "*.js"))) + [os.path.join(ROOT, "chat", "worker.js")]:
        r = subprocess.run(["node", "--check", js], capture_output=True, text=True); check(f"js parses: {os.path.relpath(js, ROOT)}", r.returncode == 0, r.stderr[-200:])
else: print("skip js syntax (no node)")
shutil.rmtree(tmp, ignore_errors=True)
print(f"\n{len(fails)} failed" if fails else "\nall checks passed"); sys.exit(1 if fails else 0)
