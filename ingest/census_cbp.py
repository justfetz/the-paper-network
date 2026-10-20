"""Census County Business Patterns: establishments and employment for NAICS 322211 by county.
Keyless requests are allowed in small numbers; a free key (https://api.census.gov/data/key_signup.html) removes the limit.
Usage: [CENSUS_API_KEY=...] python census_cbp.py 2022 ../data/cbp_322211_county.csv"""
import os, sys, json, time, urllib.request, urllib.error, pandas as pd
STATES = ["01","02","04","05","06","08","09","10","11","12","13","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42","44","45","46","47","48","49","50","51","53","54","55","56"]
def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "the-paper-network (public data project)"})
    with urllib.request.urlopen(req, timeout=120) as r: body = r.read().decode("utf-8", "ignore")
    try: return json.loads(body)
    except json.JSONDecodeError: raise RuntimeError("non-JSON response: " + body[:300].replace("\n", " "))
def main(year, dst):
    key = os.environ.get("CENSUS_API_KEY", ""); naics_var = "NAICS2017" if int(year) < 2023 else "NAICS2022"
    base = f"https://api.census.gov/data/{year}/cbp?get=NAME,ESTAB,EMP,PAYANN&{naics_var}=322211"; k = f"&key={key}" if key else ""
    rows = None
    try: rows = fetch(base + "&for=county:*" + k)
    except Exception as e:
        print("county:* failed:", e, "-> falling back to one request per state"); rows = None
        for st in STATES:
            try:
                part = fetch(base + f"&for=county:*&in=state:{st}" + k)
                rows = part if rows is None else rows + part[1:]
            except urllib.error.HTTPError as he:
                if he.code == 204: continue
                print("state", st, "HTTP", he.code)
            except Exception as e2: print("state", st, "failed:", str(e2)[:120])
            time.sleep(0.3)
    if not rows: raise SystemExit("no CBP rows retrieved")
    d = pd.DataFrame(rows[1:], columns=rows[0]); d["fips"] = d.state + d.county; d["year"] = year
    d[["fips", "NAME", "ESTAB", "EMP", "PAYANN", "year"]].rename(columns=str.lower).to_csv(dst, index=False); print(len(d), "counties ->", dst)
if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
