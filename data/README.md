# data/

| File | Rows | Columns |
|---|---|---|
| `mills_final.csv` | 90 mills | `owner`, `owner_2024` (Greif and NORPAC before their 2025–26 sales), `mill_name`, `city`, `state`, `country` (US/CA/MX), `grades` (`kraft_linerboard`, `recycled_linerboard`, `white_top_linerboard`, `semichem_medium`, `recycled_medium`, `;`-separated), `capacity_tons_per_year` (short tons, Oct 2026), `capacity_2024` (where different: Riverdale before PM16, Wallula before the W2 shutdown), `status_oct2026` (open/closed/idled), `closed_year`, `status_note`, `capacity_basis` (where the number came from), `source_url`, `confidence` (high/medium/low), `lat`, `lon`, `geo_source`, `in_model` |
| `mills_ip_sw.csv`, `mills_others.csv` | 45 + 55 | The research files behind the merge, one row per mill with source URL; include a few explicitly excluded rows (not containerboard) kept for the record. |
| `mills_seed.csv` | 79 | Prior-knowledge seed used only to cross-check the research files; not used where a researched row exists. |
| `counties.csv` | 3,142 | `fips`, `county`, `state`, `lat`, `lon` (us-atlas centroid), `area_km2`, `pop` (JHU lookup table, 2019–20 estimates). |
| `basemap.json` | — | State and nation outlines as SVG path strings in the Albers USA frame (975×610); built by `geo/basemap.mjs` from us-atlas. |
| `paper_network.json` | — | Everything the site shows: mills, demand nodes, ports, every scenario's flows (delta-encoded against October 2026), knockouts, price shocks, prospects, diesel runs, the OCC loop, the closure backtest, the outage calendars. Written by `model/export_json.py`. |

Conventions: short tons throughout; capacities are annual nameplate as reported; `closed_year` is the year production stopped.
