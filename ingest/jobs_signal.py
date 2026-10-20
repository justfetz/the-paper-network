"""Turn a CSV of job postings (title, company, city, state, date) into a plant-capability signal.
A posting for a corrugator operator means the site runs a corrugator; folder-gluer / flexo / die-cutter titles mean converting; 'sheet plant' means a sheet plant.
Usage: python jobs_signal.py postings.csv ../data/plants_jobs_signal.csv"""
import sys, re, pandas as pd
RULES = {"has_corrugator": r"corrugator|single ?facer|double ?backer|wet end|dry end", "has_converting": r"flexo|folder ?gluer|die ?cut|rotary|printer slotter|jumbo|gluer", "is_sheet_plant": r"sheet plant|sheet feeder"}
def main(src, dst):
    d = pd.read_csv(src); d["t"] = d.title.fillna("").str.lower() + " " + d.get("description", pd.Series([""]*len(d))).fillna("").str.lower()
    for k, rx in RULES.items(): d[k] = d.t.str.contains(rx, regex=True)
    g = d.groupby(["company", "city", "state"]).agg(has_corrugator=("has_corrugator", "max"), has_converting=("has_converting", "max"), is_sheet_plant=("is_sheet_plant", "max"), first_seen=("date", "min"), postings=("title", "count")).reset_index()
    g.to_csv(dst, index=False); print(len(g), "sites ->", dst)
if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
