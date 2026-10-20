"""FRED series for the Prices tab (free key: https://fred.stlouisfed.org/docs/api/api_key.html).
Usage: FRED_API_KEY=... python fred.py ../data/fred_series.csv"""
import os, sys, json, urllib.request, pandas as pd
SERIES = {"PCU322211322211": "PPI: corrugated and solid fiber box manufacturing (index)", "PCU32213032213": "PPI: paperboard mills (index)",
          "GASDESW": "US diesel, weekly retail ($/gal)", "IPG322S": "Industrial production: paper (index)", "ECOMSA": "E-commerce retail sales ($M, quarterly)", "RSXFS": "Retail sales ex food services ($M, monthly)"}
def main(dst):
    key = os.environ["FRED_API_KEY"]; rows = []
    for sid, label in SERIES.items():
        url = f"https://api.stlouisfed.org/fred/series/observations?series_id={sid}&api_key={key}&file_type=json&observation_start=2019-01-01"
        try:
            obs = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "the-paper-network"}), timeout=60))["observations"]
            rows += [dict(series=sid, label=label, date=o["date"], value=o["value"]) for o in obs if o["value"] not in (".", "")]
            print(sid, len(obs), "obs")
        except Exception as e: print(sid, "failed:", str(e)[:120])
    pd.DataFrame(rows).to_csv(dst, index=False); print(len(rows), "rows ->", dst)
if __name__ == "__main__": main(sys.argv[1])
