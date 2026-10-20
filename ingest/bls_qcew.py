"""BLS QCEW open-data industry slice: county employment and establishments for NAICS 322211, latest quarter. No key needed.
https://data.bls.gov/cew/data/api/{year}/{qtr}/industry/322211.csv   (BLS_API_KEY is only for the v2 time-series API; unused here)
Usage: python bls_qcew.py ../data/qcew_322211_county.csv"""
import sys, io, urllib.request, urllib.error, pandas as pd
def main(dst):
    for year, q in [(2026, 2), (2026, 1), (2025, 4), (2025, 3), (2025, 2)]:
        url = f"https://data.bls.gov/cew/data/api/{year}/{q}/industry/322211.csv"
        try:
            body = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "the-paper-network"}), timeout=120).read()
        except urllib.error.HTTPError as e:
            print(year, q, "HTTP", e.code); continue
        d = pd.read_csv(io.BytesIO(body), dtype=str)
        c = d[(d.own_code == "5") & d.area_fips.str.match(r"^\d{5}$") & ~d.area_fips.str.endswith("000")].copy()   # private ownership, county areas
        for col in ("qtrly_estabs", "month3_emplvl", "total_qtrly_wages"): c[col] = pd.to_numeric(c[col], errors="coerce").fillna(0).astype(int)
        out = c.rename(columns={"area_fips": "fips", "qtrly_estabs": "estab", "month3_emplvl": "emp", "total_qtrly_wages": "wages_q"})[["fips", "estab", "emp", "wages_q", "disclosure_code", "year", "qtr"]]
        out.to_csv(dst, index=False); print(f"QCEW {year} Q{q}: {len(out)} counties, {out.estab.sum()} establishments, {out.emp.sum():,} employees (suppressed cells show 0) -> {dst}"); return
    raise SystemExit("no QCEW quarter retrieved")
if __name__ == "__main__": main(sys.argv[1])
