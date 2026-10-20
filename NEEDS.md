# What the project needs from outside the sandbox

Everything on the site today was built from sources reachable without credentials: SEC filings and
company press (via search), trade press, the AF&PA and FBA figures quoted in press, us-atlas,
the JHU county table, and an offline zip-code database. The next layer of accuracy needs the
things below. None of them are expensive; most are free.

| Need | Why | How to get it | Cost |
|---|---|---|---|
| **EPA Facility Registry Service (FRS) bulk CSV** | The best free list of US box plants: every facility with a NAICS code, name, address, lat/lon. Filter NAICS 322211 (corrugated and solid fiber boxes), 322130 (paperboard mills), 322120. | https://www.epa.gov/frs/epa-state-combined-csv-download-files (national zip ~730 MB, or per state). No key. Run `ingest/epa_frs.py`. | free |
| **Census County Business Patterns API key** | Establishment and employment counts for NAICS 322211 by county: calibrates the demand proxy by region and checks the FRS list. | https://api.census.gov/data/key_signup.html then `CENSUS_API_KEY=... python ingest/census_cbp.py` | free |
| **Google Places API key** (or Overpass/OSM, no key) | Name-level box plant and sheet plant discovery ("corrugated", "box plant", "packaging" near each demand point), phone and website for the prospect list. | Google Cloud console → Places API (New); set `GOOGLE_MAPS_API_KEY`. `ingest/google_places.py` does a text search around each of the 441 demand points. Overpass (`ingest/overpass.py`) is the free fallback with thinner coverage. | ~$32 per 1,000 text searches; about 441 × a few queries ≈ $50–100 one-time |
| **AICC and FBA member directories** | Ground truth for independents (AICC: ~630 sheet plants, ~86% independent) and integrateds (FBA members run 815 plants). | Member logins; export to `data/plants_directory.csv` by hand or with `ingest/directory_csv.py`. | membership |
| **Job-posting signal** (Indeed, LinkedIn, ZipRecruiter) | A plant posting for a "corrugator operator" has a corrugator; "flexo folder gluer operator" is a box plant; "sheet plant" is a sheet plant. Cheap way to tag corrugator vs sheet plant and to notice new plants. | Indeed Publisher API is closed; use the job-board RSS/JSON search endpoints where terms allow, or a hiring-data vendor. `ingest/jobs_signal.py` is a stub that expects a CSV of postings. | varies |
| **EIA API key** | Weekly on-highway diesel by PADD region; the latest week becomes a live diesel scenario in the model and the series feeds the Prices tab. | https://www.eia.gov/opendata/ → GitHub repo secret `EIA_API_KEY` (Settings → Secrets and variables → Actions) → the `refresh` workflow runs `ingest/eia_diesel.py` every Monday or on demand | free |
| **Fastmarkets RISI / Pulp & Paper Week** | The actual price series (42-lb kraft liner East and West, 26-lb medium, recycled liner, regional OCC). The site uses the price points that appear in press; a subscription gives the monthly series back to the 1990s. | subscription | paid |
| **AF&PA capacity survey and FBA annual report** | Mill-level capacity by grade (AF&PA), box shipments by region and end use (FBA). The site reverse-engineers both from quoted totals. | AF&PA members; FBA report $1,600 for non-members | paid |
| **SEC EDGAR access** (no key, needs a User-Agent header) | Re-pull 10-K Item 2 property lists (plants by state) and Appendix capacity tables automatically every February. | `ingest/edgar_10k.py` with `EDGAR_UA="name email"` | free |
| **FRED API key** (optional) | PPI for corrugated boxes (WPU091503?), paperboard mill PPI, industrial production of paper; context series for the Prices tab. | https://fred.stlouisfed.org/docs/api/api_key.html | free |

## What is deliberately not needed
- No database. CSV in, JSON out, static site.
- No server. GitHub Pages serves `site/`.
- No paid geocoder. The zip-code centroid is within a few miles for mill towns; plants from FRS or Places come with coordinates.
