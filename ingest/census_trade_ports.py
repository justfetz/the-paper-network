"""Census International Trade API: kraft paper and paperboard (HS 4804) and other uncoated paper and
paperboard (HS 4805, where testliner and fluting sit) by US port and partner country, monthly. Free key:
https://api.census.gov/data/key_signup.html

    CENSUS_API_KEY=... python ingest/census_trade_ports.py data/trade_paper_ports.csv --start 2023-01 --end 2025-12

Also writes data/trade_paper_ports_summary.json: export port shares by weight over the last 12 months of the
pull (the candidate replacement for the ASSUMED gateway shares in model/netmodel.py PORTS), import tons by
partner country and port, and the Canada share. The receipts compare the model's Canadian import tons to the
measured import total (audit/recompute.py).

WHAT THIS REPLACES. PORTS carries hand-set shares (Laredo 28%, Savannah 14%, ...) marked "assumption, see
notes", and RECEIPTS shows imports modelled at 0.34 Mt against 1.40 Mt public. Both numbers exist by port and
country in the Census trade series; nothing stopped them being measured except the pull.

ENDPOINTS (verify against the variables.json of each on the first run; the script fails loudly on a missing
variable rather than guessing):
  exports by port: https://api.census.gov/data/timeseries/intltrade/exports/porths
      get=PORT,PORT_NAME,CTY_CODE,CTY_NAME,ALL_VAL_MO,QTY_1_MO,UNIT_QY1  E_COMMODITY=4804  COMM_LVL=HS4  time=from 2023-01 to 2025-12
  imports by port: https://api.census.gov/data/timeseries/intltrade/imports/porths
      get=PORT,PORT_NAME,CTY_CODE,CTY_NAME,GEN_VAL_MO,GEN_QY1_MO,UNIT_QY1  I_COMMODITY=4804  COMM_LVL=HS4  time=...
UNITS. Quantity is in the UNIT_QY1 the API reports (kilograms for chapter 48). Short tons = kg / 907.185.
"""
import argparse, json, os, sys, urllib.parse, urllib.request
import pandas as pd

BASE = "https://api.census.gov/data/timeseries/intltrade"
HS = ("4804", "4805")
KG_PER_SHORT_TON = 907.185
FLOWS = {
    "export": dict(path="exports/porths", comm="E_COMMODITY", get="PORT,PORT_NAME,CTY_CODE,CTY_NAME,ALL_VAL_MO,QTY_1_MO,UNIT_QY1", val="ALL_VAL_MO", qty="QTY_1_MO"),
    "import": dict(path="imports/porths", comm="I_COMMODITY", get="PORT,PORT_NAME,CTY_CODE,CTY_NAME,GEN_VAL_MO,GEN_QY1_MO,UNIT_QY1", val="GEN_VAL_MO", qty="GEN_QY1_MO"),
}


def fetch(flow: str, hs: str, start: str, end: str, key: str) -> pd.DataFrame:
    f = FLOWS[flow]
    q = {"get": f["get"], f["comm"]: hs, "COMM_LVL": "HS4", "time": f"from {start} to {end}"}
    if key: q["key"] = key
    url = f"{BASE}/{f['path']}?{urllib.parse.urlencode(q, safe='+, ')}"
    req = urllib.request.Request(url, headers={"User-Agent": "the-paper-network/ingest (public model)"})
    rows = json.load(urllib.request.urlopen(req, timeout=120))
    head, body = rows[0], rows[1:]
    df = pd.DataFrame(body, columns=head)
    for col in (f["val"], f["qty"]):
        if col not in df:
            raise SystemExit(f"{flow} {hs}: variable {col} missing from the API answer; columns were {head}")
    out = pd.DataFrame({
        "flow": flow, "period": df["time"], "hs4": hs,
        "port_code": df["PORT"], "port_name": df["PORT_NAME"],
        "country_code": df["CTY_CODE"], "country": df["CTY_NAME"],
        "value_usd": pd.to_numeric(df[f["val"]], errors="coerce").fillna(0.0),
        "qty": pd.to_numeric(df[f["qty"]], errors="coerce").fillna(0.0),
        "unit": df["UNIT_QY1"],
    })
    # The API returns total rows (country code '-' or port '-') alongside detail; keep the detail only.
    return out[(out.port_code.astype(str) != "-") & (out.country_code.astype(str) != "-")].reset_index(drop=True)


def _tons(df: pd.DataFrame) -> pd.Series:
    unit = df.unit.astype(str).str.upper()
    return df.qty.where(unit.str.startswith("KG"), other=float("nan")) / KG_PER_SHORT_TON


def port_shares(df: pd.DataFrame, flow: str = "export", months: int = 12) -> dict:
    """Share of weight by port over the LAST `months` periods present. Pure; tested on a fixture."""
    d = df[df.flow == flow].copy()
    if d.empty: return {}
    d["tons"] = _tons(d)
    periods = sorted(d.period.unique())[-months:]
    d = d[d.period.isin(periods) & d.tons.notna()]
    tot = float(d.tons.sum())
    by = d.groupby(["port_code", "port_name"]).tons.sum().sort_values(ascending=False)
    return {"periods": [periods[0], periods[-1]], "total_short_tons": round(tot, 0),
            "ports": [dict(port_code=str(c), port_name=str(n), tons=round(float(t), 0), share=round(float(t / tot), 4)) for (c, n), t in by.items() if tot]}


def import_summary(df: pd.DataFrame, months: int = 12) -> dict:
    d = df[df.flow == "import"].copy()
    if d.empty: return {}
    d["tons"] = _tons(d)
    periods = sorted(d.period.unique())[-months:]
    d = d[d.period.isin(periods) & d.tons.notna()]
    tot = float(d.tons.sum())
    by_cty = d.groupby("country").tons.sum().sort_values(ascending=False)
    by_port = d.groupby(["port_code", "port_name"]).tons.sum().sort_values(ascending=False)
    return {"periods": [periods[0], periods[-1]], "total_short_tons": round(tot, 0),
            "canada_share": round(float(by_cty.get("CANADA", 0.0) / tot), 4) if tot else None,
            "by_country": [dict(country=str(k), tons=round(float(v), 0), share=round(float(v / tot), 4)) for k, v in by_cty.head(15).items()],
            "by_port": [dict(port_code=str(c), port_name=str(n), tons=round(float(t), 0), share=round(float(t / tot), 4)) for (c, n), t in by_port.head(20).items()]}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("dst"); ap.add_argument("--start", default="2023-01"); ap.add_argument("--end", default="2025-12")
    a = ap.parse_args()
    key = os.environ.get("CENSUS_API_KEY", "")
    frames = [fetch(flow, hs, a.start, a.end, key) for flow in FLOWS for hs in HS]
    df = pd.concat(frames, ignore_index=True)
    df.to_csv(a.dst, index=False)
    summary = dict(source=f"{BASE} (exports/porths, imports/porths), HS 4804 + 4805, COMM_LVL=HS4", pulled=pd.Timestamp.now("UTC").strftime("%Y-%m-%d"),
                   window=[a.start, a.end], export_port_shares=port_shares(df, "export"), imports=import_summary(df),
                   note="shares by weight over the last 12 periods present; HS 4804+4805 is wider than containerboard (sack kraft, other uncoated grades are inside)")
    spath = os.path.join(os.path.dirname(os.path.abspath(a.dst)), "trade_paper_ports_summary.json")
    json.dump(summary, open(spath, "w"), indent=1)
    print(len(df), "rows ->", a.dst, "| summary ->", spath)
    if summary["imports"]:
        print(f"imports last 12 periods: {summary['imports']['total_short_tons']/1e6:.2f} Mt, Canada share {summary['imports']['canada_share']}")


if __name__ == "__main__":
    main()
