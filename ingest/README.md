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
| `faf5.py` | FAF5 (FHWA/BTS/ORNL) state database, SCTG 27 paper and 28 paper articles, tons and ton-miles by origin, destination and mode (no key; one zip a year) | `faf5_paper.csv`: year, sctg2, trade_type, origin, dest, fr_orig, mode, tons_kt, tmiles_mmi, origin_state; `faf5_summary.json`: average haul, modal split, origin-state hauls, import shares |
| `census_trade_ports.py` | Census International Trade API, HS 4804 and 4805 by US port and partner country, monthly (free key) | `trade_paper_ports.csv`: flow, period, hs4, port, country, value_usd, qty, unit; `trade_paper_ports_summary.json`: export port shares by weight (last 12 months), imports by country and port, Canada share |
| `osrm_lanes.py` | OSRM over OpenStreetMap: routed road miles and drive time for every mill -> market lane (no key; public demo server, car profile, light use) | `lanes_osrm.csv`: mill_id, node_id, gc_miles, road_miles, drive_min, ratio; `lanes_osrm_summary.json`: median and spread of road / great-circle |
| `claude_verify.py` | `plants_frs_box.csv` (+ `ANTHROPIC_API_KEY`) | `plants_verified.csv`: operating, plant_type (corrugator / sheet_feeder / sheet_plant / mill / other), owner, shifts, hiring_signal, evidence_url, confidence, cost; `plants_verified_ledger.json` with the spend |

Run order for a refresh: `epa_frs.py` → `census_cbp.py` → (optional) `google_places.py` → merge with `../model/merge_plants.py` (to be written with step 1 of the roadmap).

## The freight sources (added 2026-10-25)

Three pulls replace assumptions in `model/netmodel.py` with measurements. Each writes a summary JSON next to
its CSV; `model/export_json.py` reads the summaries into `params.freight_measured` and prices every arc on
`lanes_osrm.csv` when it exists (`params.freight.lane_source` says which), and `audit/recompute.py` adds
receipt rows for FAF5 haul and rail share and the Census import total when their files are present. Without
the files nothing changes: the model runs on the 1.2 factor and the receipts say the measurement is pending.

| Pull | Replaces | Cadence |
|---|---|---|
| `faf5.py` | the solved 509-mile average haul and 41.7% rail share, which were outputs of the freight rule, now checked against measured ton-miles over tons | annual (FAF release) |
| `census_trade_ports.py` | the hand-set export gateway shares in `PORTS` (Laredo 28%, Savannah 14%, ...) and the 1.40 Mt import anchor read from press | monthly with the Census key |
| `osrm_lanes.py` | road miles = 1.2 x great-circle on every lane | quarterly (the demo server asks for light use) |

`notes/freight_sources.md` ranks the other free sources (STB waybill sample, BTS Transborder, FMCSA carrier
census, FHWA vehicle-miles, PPI trucking) and says what each would move.
