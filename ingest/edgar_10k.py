"""Pull the latest 10-K for the public producers and save Item 2 (Properties) text. No key; SEC requires a descriptive User-Agent.
Usage: EDGAR_UA="Your Name you@example.com" python edgar_10k.py ../data/10k"""
import os, sys, json, re, urllib.request, time
CIKS = {"IP": "0000051434", "SW": "0002005951", "PKG": "0000075677", "GPK": "0001408075", "SON": "0000091767", "GEF": "0000043920", "CAS": None}
def get(url, ua):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": ua, "Accept-Encoding": "identity"})).read()
def main(outdir):
    ua = os.environ["EDGAR_UA"]; os.makedirs(outdir, exist_ok=True)
    for tk, cik in CIKS.items():
        if not cik: continue
        sub = json.loads(get(f"https://data.sec.gov/submissions/CIK{cik}.json", ua))
        f = sub["filings"]["recent"]; idx = next(i for i, form in enumerate(f["form"]) if form == "10-K")
        acc = f["accessionNumber"][idx].replace("-", ""); doc = f["primaryDocument"][idx]
        html = get(f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc}/{doc}", ua).decode("utf8", "ignore")
        text = re.sub(r"<[^>]+>", " ", html); text = re.sub(r"\s+", " ", text)
        m = re.search(r"Item\s*2\.?\s*Properties(.*?)Item\s*3\.?\s*Legal Proceedings", text, re.I | re.S)
        open(os.path.join(outdir, f"10k_properties_{tk}_{f['filingDate'][idx][:4]}.txt"), "w").write(m.group(1) if m else text[:200000])
        print(tk, f["filingDate"][idx], "ok" if m else "Item 2 not isolated; saved head"); time.sleep(0.5)
if __name__ == "__main__": main(sys.argv[1])
