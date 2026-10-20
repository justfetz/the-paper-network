"""EIA weekly retail on-highway diesel, US and PADD regions. Free key: https://www.eia.gov/opendata/
Usage: EIA_API_KEY=... python eia_diesel.py ../data/diesel_weekly.csv"""
import os, sys, json, urllib.request, pandas as pd
SERIES = {"US": "EMD_EPD2D_PTE_NUS_DPG", "East Coast": "EMD_EPD2D_PTE_R10_DPG", "Midwest": "EMD_EPD2D_PTE_R20_DPG", "Gulf Coast": "EMD_EPD2D_PTE_R30_DPG", "Rocky Mountain": "EMD_EPD2D_PTE_R40_DPG", "West Coast": "EMD_EPD2D_PTE_R50_DPG"}
def main(dst):
    key = os.environ["EIA_API_KEY"]; rows = []
    for region, sid in SERIES.items():
        url = f"https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key={key}&frequency=weekly&data[0]=value&facets[series][]={sid}&sort[0][column]=period&sort[0][direction]=desc&length=5000"
        for r in json.load(urllib.request.urlopen(url))["response"]["data"]: rows.append(dict(date=r["period"], region=region, usd_per_gal=r["value"]))
    pd.DataFrame(rows).to_csv(dst, index=False); print(len(rows), "rows ->", dst)
if __name__ == "__main__": main(sys.argv[1])
