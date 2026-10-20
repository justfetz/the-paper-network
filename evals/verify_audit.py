"""Re-check a random sample of data/plants_verified.csv with a second model and report agreement per field.
Usage: python evals/verify_audit.py data/plants_verified.csv data/plants_frs_box.csv [--model claude-sonnet-5-5] [--n 10]"""
import sys, os, argparse, random, pandas as pd, anthropic
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ingest")); import claude_verify as cv
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("verified"); ap.add_argument("sites"); ap.add_argument("--model", default="claude-sonnet-5-5"); ap.add_argument("--n", type=int, default=0); a = ap.parse_args()
    v = pd.read_csv(a.verified, dtype=str).fillna(""); sites = {r["registry_id"]: r for r in pd.read_csv(a.sites, dtype=str).fillna("").to_dict("records")}
    n = a.n or max(5, len(v) // 20); sample = v.sample(n=min(n, len(v)), random_state=11); client = anthropic.Anthropic(); rows = []; cost = 0.0
    for r in sample.itertuples():
        rec, searches, c = cv.verify_one(client, a.model, sites[r.registry_id]); cost += c; rec = rec or {}
        rows.append(dict(registry_id=r.registry_id, name=r.name, first_model=r.model, second_model=a.model, operating_1=r.operating, operating_2=rec.get("operating", ""), plant_type_1=r.plant_type, plant_type_2=rec.get("plant_type", ""),
                         owner_1=r.owner, owner_2=rec.get("owner", ""), shifts_1=r.shifts, shifts_2=rec.get("shifts", ""), evidence_2=rec.get("evidence_url", ""), cost_usd=round(c, 4)))
        print(f"{r.name[:36]:36s} operating {r.operating}/{rec.get('operating','')}  type {r.plant_type}/{rec.get('plant_type','')}  owner {r.owner[:18]}/{rec.get('owner','')[:18]}")
    out = pd.DataFrame(rows); out.to_csv("evals/verify_audit.csv", index=False)
    agree = {f: round(float((out[f + "_1"] == out[f + "_2"]).mean()), 3) for f in ["operating", "plant_type", "shifts"]}; agree["owner"] = round(float((out.owner_1.str.lower().str[:6] == out.owner_2.str.lower().str[:6]).mean()), 3)
    print(f"{len(out)} sites re-checked with {a.model}: agreement {agree}; ${cost:.2f}")
if __name__ == "__main__": main()
