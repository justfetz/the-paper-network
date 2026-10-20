"""EPA Facility Registry Service -> box plants and paperboard mills with coordinates. No API key.
Download: https://www.epa.gov/frs/epa-state-combined-csv-download-files  (state zips, or the national zip ~730 MB)
Each zip has <STATE>_FACILITY_FILE.CSV with REGISTRY_ID, PRIMARY_NAME, LOCATION_ADDRESS, CITY_NAME, STATE_CODE, POSTAL_CODE,
LATITUDE83, LONGITUDE83 and <STATE>_NAICS_FILE.CSV with REGISTRY_ID, NAICS_CODE, PRIMARY_INDICATOR.
Usage: python epa_frs.py /path/to/unzipped/dir ../data/plants_frs.csv"""
import sys, glob, os, pandas as pd
NAICS = {"322211": "corrugated and solid fiber box", "322130": "paperboard mill", "322120": "paper mill (excl. newsprint)", "322212": "folding paperboard box", "322219": "other paperboard container"}
def main(src, dst):
    out = []
    for fac in glob.glob(os.path.join(src, "*_FACILITY_FILE.CSV")):
        st = os.path.basename(fac).split("_")[0]
        nai = os.path.join(src, f"{st}_NAICS_FILE.CSV")
        if not os.path.exists(nai): continue
        f = pd.read_csv(fac, dtype=str, usecols=lambda c: c in {"REGISTRY_ID","PRIMARY_NAME","LOCATION_ADDRESS","CITY_NAME","STATE_CODE","POSTAL_CODE","LATITUDE83","LONGITUDE83"}, low_memory=False)
        n = pd.read_csv(nai, dtype=str, usecols=["REGISTRY_ID","NAICS_CODE"], low_memory=False)
        n = n[n.NAICS_CODE.isin(NAICS)].drop_duplicates()
        m = n.merge(f, on="REGISTRY_ID", how="inner")
        m["naics_desc"] = m.NAICS_CODE.map(NAICS)
        out.append(m)
    d = pd.concat(out, ignore_index=True)
    d.columns = [c.lower() for c in d.columns]
    d = d.rename(columns={"primary_name":"name","location_address":"address","city_name":"city","state_code":"state","postal_code":"zip","latitude83":"lat","longitude83":"lon","naics_code":"naics"})
    d.to_csv(dst, index=False); print(len(d), "facility-NAICS rows ->", dst, "| box plants (322211):", (d.naics=="322211").sum())
if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
