"""EPA Facility Registry Service -> box plants and paperboard mills with coordinates. No API key.
Download: https://www.epa.gov/frs/epa-state-combined-csv-download-files (national_combined.zip, or per-state state_combined_XX.zip).
Each archive has <PREFIX>_FACILITY_FILE.CSV (REGISTRY_ID, PRIMARY_NAME, LOCATION_ADDRESS, CITY_NAME, STATE_CODE, POSTAL_CODE,
LATITUDE83, LONGITUDE83, ...) and <PREFIX>_NAICS_FILE.CSV (REGISTRY_ID, NAICS_CODE, PRIMARY_INDICATOR, ...). PREFIX is NATIONAL or a state.
The facility file is large (millions of rows), so it is read in chunks against the set of registry ids that carry our NAICS codes.
Usage: python epa_frs.py /dir/with/unzipped/csvs ../data/plants_frs.csv"""
import sys, glob, os, pandas as pd
NAICS = {"322211": "corrugated and solid fiber box", "322130": "paperboard mill", "322120": "paper mill (excl. newsprint)", "322212": "folding paperboard box", "322219": "other paperboard container", "322299": "other converted paper product"}
KEEP = {"REGISTRY_ID", "PRIMARY_NAME", "LOCATION_ADDRESS", "CITY_NAME", "STATE_CODE", "POSTAL_CODE", "COUNTY_NAME", "FIPS_CODE", "LATITUDE83", "LONGITUDE83", "SITE_TYPE_NAME", "ACTIVE_STATUS"}
def main(src, dst):
    out = []
    for fac in sorted(glob.glob(os.path.join(src, "*_FACILITY_FILE.CSV")) + glob.glob(os.path.join(src, "*_FACILITY_FILE.csv"))):
        prefix = os.path.basename(fac).split("_FACILITY_FILE")[0]
        nai = next((p for p in glob.glob(os.path.join(src, prefix + "_NAICS_FILE.*")) if p.lower().endswith(".csv")), None)
        if not nai: print("no NAICS file for", prefix); continue
        n = pd.read_csv(nai, dtype=str, usecols=lambda c: c.upper() in {"REGISTRY_ID", "NAICS_CODE", "PRIMARY_INDICATOR"}, low_memory=False, encoding_errors="ignore")
        n.columns = [c.upper() for c in n.columns]
        n = n[n.NAICS_CODE.isin(NAICS)].drop_duplicates(["REGISTRY_ID", "NAICS_CODE"])
        ids = set(n.REGISTRY_ID)
        parts = []
        for chunk in pd.read_csv(fac, dtype=str, usecols=lambda c: c.upper() in KEEP, chunksize=400000, low_memory=False, encoding_errors="ignore"):
            chunk.columns = [c.upper() for c in chunk.columns]
            parts.append(chunk[chunk.REGISTRY_ID.isin(ids)])
        f = pd.concat(parts, ignore_index=True) if parts else pd.DataFrame(columns=list(KEEP))
        m = n.merge(f, on="REGISTRY_ID", how="inner"); m["naics_desc"] = m.NAICS_CODE.map(NAICS)
        out.append(m); print(prefix, "facility rows kept:", len(f), "| facility-NAICS rows:", len(m))
    d = pd.concat(out, ignore_index=True)
    d.columns = [c.lower() for c in d.columns]
    d = d.rename(columns={"primary_name": "name", "location_address": "address", "city_name": "city", "state_code": "state", "postal_code": "zip", "county_name": "county", "fips_code": "fips", "latitude83": "lat", "longitude83": "lon", "naics_code": "naics", "site_type_name": "site_type"})
    d.to_csv(dst, index=False)
    print(len(d), "facility-NAICS rows ->", dst, "| box plants (322211):", int((d.naics == "322211").sum()), "| paperboard mills (322130):", int((d.naics == "322130").sum()), "| with coordinates:", int(d.lat.notna().sum()))
if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
