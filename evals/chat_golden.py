"""Write evals/chat_golden.json: questions whose answers come straight from data/paper_network.json.
Usage: python evals/chat_golden.py data/paper_network.json evals/chat_golden.json"""
import json, sys, random
def main(src, dst):
    d = json.load(open(src)); fp = d["scenarios"]["fp2026"]; mills = d["mills"]; nodes = d["nodes"]; rnd = random.Random(7); q = []
    for k in d["knockouts"][:8]:
        q.append(dict(id=f"ko_{k['mill']}", kind="numeric", question=f"What does it cost the network per year if the {k['name']} mill ({k['owner']}) goes down?", value=k["d_total"] / 1e6, unit="M", tol=0.05))
    big = sorted([m for m in mills if m["status"] == "open" and m["country"] == "US"], key=lambda m: -m["cap"])
    for m in rnd.sample(big[:40], 8):
        q.append(dict(id=f"cap_{m['id']}", kind="numeric", question=f"What is the capacity of the {m['name']} mill in {m['st']}, and who owns it?", value=m["cap"] / 1e3, unit="kt", tol=0.02, also=m["owner"]))
    top = sorted(range(len(nodes)), key=lambda i: -fp["node_demand"][i])[:60]
    for i in rnd.sample(top, 6):
        q.append(dict(id=f"dem_{i}", kind="numeric", question=f"How much containerboard does the {nodes[i]['name']}, {nodes[i]['st']} market use in a year?", value=fp["node_demand"][i] / 1e3, unit="kt", tol=0.05))
    for i in rnd.sample(top, 4):
        q.append(dict(id=f"mc_{i}", kind="numeric", question=f"What is the delivered marginal cost of board in {nodes[i]['name']}, {nodes[i]['st']}?", value=fp["node_mc"][i], unit="/t", tol=0.05))
    for o, s in d["price_shocks"].items():
        q.append(dict(id=f"shock_{o[:3]}", kind="numeric", question=f"If {o} raises its open-market price by $70 a ton, how many open-market tons does the model say it loses?", value=s["base_market_tons"] / 1e3, unit="kt", tol=0.05))
    k = fp["kpi"]; q += [dict(id="kpi_freight", kind="numeric", question="What is the total freight bill of the network in the October 2026 footprint?", value=k["freight_usd"] / 1e9, unit="B", tol=0.03),
                      dict(id="kpi_haul", kind="numeric", question="What is the average haul in miles in the 2026 footprint?", value=k["avg_haul_miles"], unit="mi", tol=0.03),
                      dict(id="kpi_rail", kind="numeric", question="What share of tons move by rail in the 2026 footprint?", value=k["rail_share"] * 100, unit="%", tol=0.05),
                      dict(id="kpi_dz6", kind="numeric", question="What is the freight bill if diesel is $6.20 a gallon?", value=d["scenarios"]["dz6"]["kpi"]["freight_usd"] / 1e9, unit="B", tol=0.03)]
    for i, t in enumerate(["What price does International Paper charge Amazon for its boxes?", "Which box plants does the Mansfield mill actually ship to this month?", "What is the cash cost per ton at the Counce mill?", "What did the Fastmarkets linerboard index print this week?", "Who are Pratt Industries' ten largest customers?"]):
        q.append(dict(id=f"abstain_{i}", kind="abstain", question=t))
    json.dump(q, open(dst, "w"), indent=1); print(len(q), "questions ->", dst)
if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
