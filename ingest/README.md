# Ingestion scripts

Each script writes a CSV into `../data/` and never edits the model. They are stubs where a key or
a download is required (see `../NEEDS.md`); each one documents the exact endpoint, fields and the
output schema so they can be run from any machine with network access.

| Script | Source | Output |
|---|---|---|
| `epa_frs.py` | EPA FRS state/national CSV (NAICS 322211, 322130, 322120) | `plants_frs.csv`: registry_id, name, address, city, state, zip, lat, lon, naics, naics_desc |
| `census_cbp.py` | Census CBP API, NAICS 322211 by county | `cbp_322211_county.csv`: fips, estab, emp, payann, year |
| `google_places.py` | Places API (New) text search around each demand node | `plants_places.csv`: place_id, name, address, lat, lon, types, website, phone, query_node |
| `overpass.py` | OpenStreetMap Overpass (industrial, name~corrugat|box|packaging) | `plants_osm.csv` |
| `eia_diesel.py` | EIA weekly on-highway diesel by PADD | `diesel_weekly.csv`: date, region, usd_per_gal |
| `fred.py` | FRED: PPI corrugated boxes, PPI paperboard mills, diesel, paper production, e-commerce and retail sales | `fred_series.csv`: series, label, date, value |
| `bls_qcew.py` | BLS QCEW industry slice (no key): county employment and establishments for 322211, latest quarter | `qcew_322211_county.csv` |
| `census_cbp_bulk.py` | Census CBP complete county and state files (no key) | `cbp_322211_county.csv`, `cbp_322211_state.csv` |
| `edgar_10k.py` | SEC EDGAR full-text + filing index for IP, SW, PKG, GPK, SON | `10k_properties_<ticker>_<year>.txt` |
| `jobs_signal.py` | job-posting CSV (title, company, city, state, date) | `plants_jobs_signal.csv`: company, city, state, has_corrugator, has_converting, first_seen |

Run order for a refresh: `epa_frs.py` → `census_cbp.py` → (optional) `google_places.py` → merge with `../model/merge_plants.py` (to be written with step 1 of the roadmap).
