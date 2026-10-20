"""Census County Business Patterns: establishments and employment for NAICS 322211 by county. Free key: https://api.census.gov/data/key_signup.html
Usage: CENSUS_API_KEY=... python census_cbp.py 2022 ../data/cbp_322211_county.csv"""
import os, sys, json, urllib.request, pandas as pd
def main(year, dst):
    key = os.environ.get("CENSUS_API_KEY", "")
    url = f"https://api.census.gov/data/{year}/cbp?get=NAME,ESTAB,EMP,PAYANN&for=county:*&NAICS2017=322211" + (f"&key={key}" if key else "")
    rows = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "the-paper-network"})))
    d = pd.DataFrame(rows[1:], columns=rows[0]); d["fips"] = d.state + d.county; d["year"] = year
    d[["fips","NAME","ESTAB","EMP","PAYANN","year"]].rename(columns=str.lower).to_csv(dst, index=False); print(len(d), "counties ->", dst)
if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
