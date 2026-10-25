# Refresh calendar: what changes, when, and who moves it

Two kinds of refresh. **Machine**: sources with an API or a bulk file, run by `.github/workflows/refresh.yml`
on a schedule (keys as repository secrets). **Judgment**: things that only exist as announcements and press,
read and applied by a scheduled Claude session (or a person), which edits the CSVs and the price points and
commits; the workflow then re-runs the model and redeploys on the push.

| When | What lands | Source | Who | Touches |
|---|---|---|---|---|
| Every Monday | US and regional on-highway diesel | EIA weekly (API, free key) | machine | freight fuel factor; Prices tab |
| First week of each month | Containerboard index move (liner, medium), OCC national and regional, recycled grades | Fastmarkets RISI as reported by Packaging Dive, Recycling Today, PPI Pulp & Paper Week | judgment | `site/build_site.py` price points; calculator defaults |
| Monthly, mid-month | FBA monthly box shipments (members; quarterly in press) | FBA via press | judgment | demand trend note |
| ~4 weeks after quarter end (late Jan, Apr, Jul, Oct) | AF&PA quarterly: production, exports, inventories, operating rate; IP, PCA, SW earnings: outage guidance, downtime, closures, capacity moves | AF&PA press release; 10-Q and earnings calls | judgment | `data/mills_final.csv` (status, capacity), demand/export parameters, outage calendar, notes |
| Late February / March | 10-Ks: Item 2 property lists, capacity appendices (IP), SW mill table, PCA capacity | SEC EDGAR (no key; User-Agent) | machine pulls, judgment reconciles | mill table re-reconciliation; plant counts by state |
| May / June | AF&PA annual capacity survey (press summary) | AF&PA via press | judgment | industry capacity anchor |
| June | Census County Business Patterns (two-year lag) | Census API (free key) | machine | demand weights by county |
| August | FBA annual report (box shipments, end use) | FBA via press | judgment | end-use shares |
| Annually | EPA Facility Registry Service (plant list) | EPA bulk CSV (no key) | machine (manual download) | plant layer |
| Annually (FAF release, usually summer) | FAF5 paper (SCTG 27) and paper articles (SCTG 28): tons and ton-miles by origin, destination, mode | FAF5 state database zip (no key) | machine | `params.freight_measured.faf5`; receipt rows for average haul and rail share |
| Monthly, with the key | HS 4804 and 4805 exports and imports by US port and partner country | Census International Trade API (free key) | machine | `params.freight_measured.trade_ports`: measured export gateway shares, import total and Canada share; receipt row for imports |
| Quarterly | Routed road miles and drive time per mill -> market lane | OSRM public demo server over OpenStreetMap (no key; car profile; light use) | machine | `lanes_osrm.csv`: every arc priced on its own road miles instead of 1.2 x great-circle |
| On the day | Closure, conversion, acquisition, new machine, price increase announcements | company releases, trade press | judgment | mill table; price shocks |

## On-demand workflows

Run from the Actions tab when a source moves; each is skipped when its secret is absent and commits what it fetched.

| Workflow | What it does | Needs | Cost |
|---|---|---|---|
| `plants.yml` | EPA FRS national facility file, filtered to NAICS 322211/322130/322120, geocoded sites | nothing | free |
| `cbp.yml` | Census County Business Patterns bulk county and state files for NAICS 322211 | nothing | free |
| `places.yml` | Google Places (New) text search around every demand point: names and addresses of box plants | `GOOGLE_MAPS_API_KEY` | 1,764 calls, inside the free 5,000-call Pro tier |
| `verify.yml` | Claude reads the web for each EPA site: operating, corrugator or sheet plant, owner, shift hiring; resumable, stops at the budget input | `ANTHROPIC_API_KEY` | about $0.10 a site on Opus 5.5 (see `NEEDS.md`) |
| `chat.yml` | Deploys the chat proxy (Cloudflare Worker) and records its endpoint for the page | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ANTHROPIC_API_KEY` | free tier; the chat itself is a few cents a round, capped per day |

## The Claude scheduled tasks

Three recurring sessions, each with a narrow brief and a hard rule to change only data and notes, never the model:

1. **Monthly, the 9th, 9:00 Chicago.** Search for the month's index moves (liner, medium, OCC national and
   regional, recycled liner), the latest EIA diesel if the workflow has no key, and any closure or capacity
   announcement since the last run. Update the price points and `mills_final.csv`, append to `notes/changelog.md`
   with sources, commit. The workflow re-runs the model and redeploys.
2. **Quarterly, the 28th of January, April, July, October, 9:00 Chicago.** AF&PA quarterly report and the three
   earnings releases: production, exports, operating rate, outage guidance, downtime, mill status. Re-set the
   demand and export parameters for the year if the record has moved more than 3%. Re-run the calibration note.
3. **Yearly, March 5.** 10-K season: re-pull Item 2 and the capacity appendices, re-reconcile every owner total,
   update plant counts by state, refresh `notes/how_close.md`.

## What a refresh must not do silently
Change the model's structure or the freight function, drop a mill without a dated source, or publish a price
point without a URL. Every scheduled commit lists its sources in `notes/changelog.md`.
