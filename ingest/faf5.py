"""FAF5 (Freight Analysis Framework, FHWA/BTS/ORNL): paper (SCTG 27) and paper articles (SCTG 28)
tons and ton-miles by origin, destination and mode. No key. Annual.

    python ingest/faf5.py data/faf5_paper.csv                       # downloads the FAF5 STATE database zip
    python ingest/faf5.py data/faf5_paper.csv --zip ~/FAF5.6.1_State.zip   # or use a file you already have
    python ingest/faf5.py data/faf5_paper.csv --url <zip url>       # a newer FAF release

Also writes data/faf5_summary.json next to the CSV: average haul (ton-miles / tons), modal split and the
import share by foreign origin for SCTG 27 and 28, domestic flows, latest year in the file. The model reads
the summary (export_json.py puts it in params.freight.faf5) and the receipts check the model's average haul
and rail share against it (audit/recompute.py).

WHAT THIS REPLACES. The model's 509-mile average haul and 41.7% rail share are outputs of the two-line
freight rule in model/netmodel.py; nothing measured them. FAF5 is the public measurement: ton-miles over
tons for the commodity, by origin state and mode. "Paper" (SCTG 27) is pulp, newsprint, paper and
paperboard together; containerboard is inside it, not separable. That is stated in the summary.

UNITS. FAF5 tons are THOUSAND short tons; ton-miles are MILLION ton-miles; value is million dollars.
average haul (miles) = tmiles_millions * 1e6 / (tons_thousands * 1e3).

COLUMNS (FAF5.6 state database): fr_orig, dms_origst, dms_destst, fr_dest, fr_inmode, dms_mode, fr_outmode,
sctg2, trade_type, dist_band, tons_<year>..., value_<year>..., tmiles_<year>... The regional database uses
dms_orig / dms_dest (FAF zones) instead of the state columns; both are accepted. Verify the column names
against the release you download; the script fails loudly on a mismatch rather than guessing.

MODES (dms_mode): 1 truck, 2 rail, 3 water, 4 air, 5 multiple modes and mail, 6 pipeline, 7 other/unknown,
8 no domestic mode. TRADE TYPE: 1 domestic, 2 import, 3 export.
"""
import argparse, io, json, os, sys, urllib.request, zipfile
import pandas as pd

DEFAULT_URL = "https://faf.ornl.gov/faf5/data/download_files/FAF5.6.1_State.zip"
MODES = {1: "truck", 2: "rail", 3: "water", 4: "air", 5: "multiple", 6: "pipeline", 7: "other", 8: "no_domestic_mode"}
TRADE = {1: "domestic", 2: "import", 3: "export"}
SCTG = {27: "paper (pulp, newsprint, paper, paperboard)", 28: "paper articles (boxes, containers, converted paper)"}
STATE_FIPS = {1:"AL",2:"AK",4:"AZ",5:"AR",6:"CA",8:"CO",9:"CT",10:"DE",11:"DC",12:"FL",13:"GA",15:"HI",16:"ID",17:"IL",18:"IN",19:"IA",20:"KS",21:"KY",22:"LA",23:"ME",24:"MD",25:"MA",26:"MI",27:"MN",28:"MS",29:"MO",30:"MT",31:"NE",32:"NV",33:"NH",34:"NJ",35:"NM",36:"NY",37:"NC",38:"ND",39:"OH",40:"OK",41:"OR",42:"PA",44:"RI",45:"SC",46:"SD",47:"TN",48:"TX",49:"UT",50:"VT",51:"VA",53:"WA",54:"WV",55:"WI",56:"WY"}


def latest_year(columns):
    years = sorted(int(c.split("_")[1]) for c in columns if c.startswith("tons_") and c.split("_")[1].isdigit())
    if not years:
        raise SystemExit("no tons_<year> column found; FAF column names changed — read the release notes and update faf5.py")
    return years[-1]


def tidy(raw: pd.DataFrame, year: int | None = None) -> pd.DataFrame:
    """Filter to SCTG 27/28 and reshape one FAF frame into the output schema (all trade types kept, flagged)."""
    cols = {c.lower(): c for c in raw.columns}
    orig = cols.get("dms_origst") or cols.get("dms_orig")
    dest = cols.get("dms_destst") or cols.get("dms_dest")
    need = [orig, dest, cols.get("sctg2"), cols.get("dms_mode"), cols.get("trade_type")]
    if any(n is None for n in need):
        raise SystemExit(f"FAF columns missing; have {list(raw.columns)[:12]}...")
    year = year or latest_year([c.lower() for c in raw.columns])
    tons_c, tmi_c = cols.get(f"tons_{year}"), cols.get(f"tmiles_{year}")
    if tons_c is None or tmi_c is None:
        raise SystemExit(f"no tons_{year}/tmiles_{year} columns")
    df = raw[raw[cols["sctg2"]].astype(int).isin(SCTG)].copy()
    out = pd.DataFrame({
        "year": year,
        "sctg2": df[cols["sctg2"]].astype(int),
        "trade_type": df[cols["trade_type"]].astype(int).map(TRADE).fillna("unknown"),
        "origin": df[orig].astype(int),
        "dest": df[dest].astype(int),
        "fr_orig": df[cols["fr_orig"]].astype(int) if "fr_orig" in cols else 0,
        "mode": df[cols["dms_mode"]].astype(int).map(MODES).fillna("other"),
        "tons_kt": df[tons_c].astype(float),
        "tmiles_mmi": df[tmi_c].astype(float),
    })
    out["origin_state"] = out.origin.map(STATE_FIPS)  # None for FAF zones in the regional file
    return out[out.tons_kt > 0].reset_index(drop=True)


def summarize(tidy_df: pd.DataFrame) -> dict:
    """Average haul, modal split and import origin shares, SCTG 27 and 28, domestic flows. Pure; tested on a fixture."""
    out = {"source": "FAF5 (FHWA/BTS/ORNL), https://faf.ornl.gov/faf5", "units": "tons thousand short tons; ton-miles million; haul miles = tmiles*1e6/(tons*1e3)",
           "year": int(tidy_df.year.max()) if len(tidy_df) else None, "commodities": {}, "caveat": "SCTG 27 is all paper and paperboard including pulp and newsprint; containerboard is inside it and not separable."}
    for s, label in SCTG.items():
        d = tidy_df[(tidy_df.sctg2 == s) & (tidy_df.trade_type == "domestic")]
        tons, tmi = float(d.tons_kt.sum()), float(d.tmiles_mmi.sum())
        by_mode = d.groupby("mode").agg(tons_kt=("tons_kt", "sum"), tmiles_mmi=("tmiles_mmi", "sum"))
        modes = {m: dict(tons_share=round(float(r.tons_kt / tons), 4) if tons else None,
                         avg_haul_mi=round(float(r.tmiles_mmi * 1e3 / r.tons_kt), 1) if r.tons_kt else None)
                 for m, r in by_mode.iterrows()}
        by_state = d[d.origin_state.notna()].groupby("origin_state").agg(tons_kt=("tons_kt", "sum"), tmiles_mmi=("tmiles_mmi", "sum"))
        states = {st: dict(tons_kt=round(float(r.tons_kt), 1), avg_haul_mi=round(float(r.tmiles_mmi * 1e3 / r.tons_kt), 1)) for st, r in by_state.iterrows()} if len(by_state) else {}
        imp = tidy_df[(tidy_df.sctg2 == s) & (tidy_df.trade_type == "import")]
        imp_tons = float(imp.tons_kt.sum())
        imp_by = imp.groupby("fr_orig").tons_kt.sum().sort_values(ascending=False) if imp_tons else pd.Series(dtype=float)
        out["commodities"][str(s)] = dict(
            label=label, domestic_tons_kt=round(tons, 1), domestic_tmiles_mmi=round(tmi, 1),
            avg_haul_mi=round(tmi * 1e3 / tons, 1) if tons else None,
            rail_tons_share=modes.get("rail", {}).get("tons_share"), truck_tons_share=modes.get("truck", {}).get("tons_share"),
            by_mode=modes, by_origin_state=states,
            imports_tons_kt=round(imp_tons, 1), imports_by_foreign_origin_share={str(k): round(float(v / imp_tons), 4) for k, v in imp_by.items()},
        )
    return out


def load_zip(path_or_bytes) -> pd.DataFrame:
    z = zipfile.ZipFile(path_or_bytes)
    names = [n for n in z.namelist() if n.lower().endswith(".csv")]
    if not names:
        raise SystemExit(f"no CSV inside the zip: {z.namelist()[:5]}")
    name = sorted(names, key=lambda n: z.getinfo(n).file_size)[-1]
    print("reading", name, f"{z.getinfo(name).file_size/1e6:.0f} MB")
    with z.open(name) as fh:
        return pd.read_csv(fh, low_memory=False)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("dst"); ap.add_argument("--zip"); ap.add_argument("--url", default=DEFAULT_URL); ap.add_argument("--year", type=int)
    a = ap.parse_args()
    if a.zip:
        raw = load_zip(a.zip); provenance = os.path.abspath(a.zip)
    else:
        print("downloading", a.url)
        req = urllib.request.Request(a.url, headers={"User-Agent": "the-paper-network/ingest (public model; https://github.com/justfetz/the-paper-network)"})
        raw = load_zip(io.BytesIO(urllib.request.urlopen(req, timeout=600).read())); provenance = a.url
    df = tidy(raw, a.year)
    df.to_csv(a.dst, index=False)
    summary = summarize(df); summary["provenance"] = provenance; summary["pulled"] = pd.Timestamp.utcnow().strftime("%Y-%m-%d")
    spath = os.path.join(os.path.dirname(os.path.abspath(a.dst)), "faf5_summary.json")
    json.dump(summary, open(spath, "w"), indent=1)
    c27 = summary["commodities"]["27"]
    print(len(df), "rows ->", a.dst, "| summary ->", spath)
    print(f"SCTG 27 {summary['year']}: avg haul {c27['avg_haul_mi']} mi, rail {c27['rail_tons_share']}, truck {c27['truck_tons_share']}, domestic {c27['domestic_tons_kt']/1e3:.1f} Mt, imports {c27['imports_tons_kt']/1e3:.2f} Mt")


if __name__ == "__main__":
    main()
