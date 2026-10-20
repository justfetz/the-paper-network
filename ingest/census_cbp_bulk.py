"""Census County Business Patterns, complete county file (no key). Newest: https://www.census.gov/data/datasets/2023/econ/cbp/2023-cbp.html
File: https://www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23co.zip  (columns: fipstate, fipscty, naics, emp_nf, emp, qp1_nf, qp1, ap_nf, ap, est, n<5 ... n1000)
Since 2017 CBP uses noise infusion instead of suppression, so employment is present for nearly every county cell (emp_nf is the noise flag).
Usage: python census_cbp_bulk.py cbp23co.zip ../data/cbp_322211_county.csv [2023]"""
import sys, zipfile, io, pandas as pd
CODES = {"322211": "corrugated and solid fiber box", "322130": "paperboard mill", "322120": "paper mill", "322212": "folding paperboard box", "3222//": "converted paper products (all)", "322///": "paper manufacturing (all)"}
def main(zip_path, dst, year="2023"):
    z = zipfile.ZipFile(zip_path); name = next(n for n in z.namelist() if n.lower().endswith((".txt", ".csv")))
    d = pd.read_csv(io.BytesIO(z.read(name)), dtype=str, low_memory=False); d.columns = [c.lower() for c in d.columns]
    d = d[d.naics.isin(CODES)].copy()
    d["fips"] = d.fipstate.str.zfill(2) + d.fipscty.str.zfill(3)
    for c in ("emp", "est", "ap", "qp1"): d[c] = pd.to_numeric(d[c], errors="coerce").fillna(0).astype(int)
    out = d.rename(columns={"est": "estab", "ap": "payann"})[["fips", "naics", "estab", "emp", "payann", "emp_nf"]]
    out["naics_desc"] = out.naics.map(CODES); out["year"] = year
    out.to_csv(dst.replace(".csv", "_all.csv"), index=False)
    box = out[out.naics == "322211"].drop(columns=["naics", "naics_desc"]); box.insert(1, "name", ""); box.to_csv(dst, index=False)
    print(f"{len(box)} counties with 322211 plants: {box.estab.sum()} establishments, {box.emp.sum():,} employees -> {dst}; all paper codes -> {dst.replace('.csv', '_all.csv')}")
if __name__ == "__main__": main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "2023")
