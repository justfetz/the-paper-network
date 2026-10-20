# What the project needs from outside the sandbox

Everything on the site today was built from sources reachable without credentials: SEC filings and
company press (via search), trade press, the AF&PA and FBA figures quoted in press, us-atlas,
the JHU county table, and an offline zip-code database. The next layer of accuracy needs the
things below. None of them are expensive; most are free.

Keys in place as repository secrets (October 2026): `EIA_API_KEY`, `FRED_API_KEY`, `BLS_API_KEY`, `EDGAR_UA`
(the EDGAR User-Agent: a name and an email address), `GOOGLE_MAPS_API_KEY`. Wanted next: `ANTHROPIC_API_KEY`, which
turns on `verify.yml`. Keys never go in the code or the site; each workflow step is skipped when its secret is absent.

| Need | Why | How to get it | Cost |
|---|---|---|---|
| **EPA Facility Registry Service (FRS) bulk CSV** | The best free list of US box plants: every facility with a NAICS code, name, address, lat/lon. Filter NAICS 322211 (corrugated and solid fiber boxes), 322130 (paperboard mills), 322120. | https://www.epa.gov/frs/epa-state-combined-csv-download-files (national zip ~730 MB, or per state). No key. Run `ingest/epa_frs.py`. | free |
| **Census County Business Patterns API key**  (not needed: `cbp.yml` reads the bulk county and state files) | Establishment and employment counts for NAICS 322211 by county: calibrates the demand proxy by region and checks the FRS list. | https://api.census.gov/data/key_signup.html then `CENSUS_API_KEY=... python ingest/census_cbp.py` | free |
| **Google Places API key** (or Overpass/OSM, no key)  (in place; `places.yml` runs 441 nodes x 4 queries = 1,764 calls inside the free 5,000-call Pro tier; website and phone fields are Enterprise-tier and off by default) | Name-level box plant and sheet plant discovery ("corrugated", "box plant", "packaging" near each demand point), phone and website for the prospect list. | Google Cloud console → Places API (New); set `GOOGLE_MAPS_API_KEY`. `ingest/google_places.py` does a text search around each of the 441 demand points. Overpass (`ingest/overpass.py`) is the free fallback with thinner coverage. | ~$32 per 1,000 text searches; about 441 × a few queries ≈ $50–100 one-time |
| **AICC and FBA member directories** | Ground truth for independents (AICC: ~630 sheet plants, ~86% independent) and integrateds (FBA members run 815 plants). | Member logins; export to `data/plants_directory.csv` by hand or with `ingest/directory_csv.py`. | membership |
| **Job-posting signal** (Indeed, LinkedIn, ZipRecruiter) | A plant posting for a "corrugator operator" has a corrugator; "flexo folder gluer operator" is a box plant; "sheet plant" is a sheet plant. Cheap way to tag corrugator vs sheet plant and to notice new plants. | Indeed Publisher API is closed; use the job-board RSS/JSON search endpoints where terms allow, or a hiring-data vendor. `ingest/jobs_signal.py` is a stub that expects a CSV of postings. | varies |
| **EIA API key**  (in place; weekly diesel lands every Monday) | Weekly on-highway diesel by PADD region; the latest week becomes a live diesel scenario in the model and the series feeds the Prices tab. | https://www.eia.gov/opendata/ → GitHub repo secret `EIA_API_KEY` (Settings → Secrets and variables → Actions) → the `refresh` workflow runs `ingest/eia_diesel.py` every Monday or on demand | free |
| **Fastmarkets RISI / Pulp & Paper Week** | The actual price series (42-lb kraft liner East and West, 26-lb medium, recycled liner, regional OCC). The site uses the price points that appear in press; a subscription gives the monthly series back to the 1990s. | subscription | paid |
| **AF&PA capacity survey and FBA annual report** | Mill-level capacity by grade (AF&PA), box shipments by region and end use (FBA). The site reverse-engineers both from quoted totals. | AF&PA members; FBA report $1,600 for non-members | paid |
| **SEC EDGAR access** (no key, needs a User-Agent header)  (`EDGAR_UA` in place) | Re-pull 10-K Item 2 property lists (plants by state) and Appendix capacity tables automatically every February. | `ingest/edgar_10k.py` with `EDGAR_UA="name email"` | free |
| **FRED API key** (optional)  (in place; PPI and production series on the Prices tab) | PPI for corrugated boxes (WPU091503?), paperboard mill PPI, industrial production of paper; context series for the Prices tab. | https://fred.stlouisfed.org/docs/api/api_key.html | free |
| **Anthropic API key** (`ANTHROPIC_API_KEY`) | Checks each EPA box-plant site with Claude and web search: operating or closed, corrugator vs sheet plant vs sheet feeder, owner today, and whether it is hiring for a 2nd or 3rd shift (the corrugator-shift signal). Retires the stale third of the EPA list and names the corrugators. | console.anthropic.com, API keys; store as the repository secret and run `verify.yml` (inputs: sites per run, model, budget). The Message Batches option halves token cost. | About $0.10 per site on Claude Opus 5.5, $0.06 on Sonnet 5.5, $0.02 on Haiku 5.5 (web search is $10 per 1,000 searches and dominates the cheap tiers); the whole 1,605-site list is roughly $160 / $95 / $35, or about half that through batches. |

## What is deliberately not needed
- No database. CSV in, JSON out, static site.
- No server. GitHub Pages serves `site/`.
- No paid geocoder. The zip-code centroid is within a few miles for mill towns; plants from FRS or Places come with coordinates.
