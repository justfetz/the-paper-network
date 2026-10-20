# The Paper Network

**A public, free model of the US containerboard and corrugated box market, built from public data,
solved as a network-flow problem, and drawn on a map.**

Live site: `site/index.html` (enable GitHub Pages with source "GitHub Actions", set the repository variable `DEPLOY_PAGES=true`, and `.github/workflows/refresh.yml` deploys it to
https://justfetz.github.io/the-paper-network/). A hosted copy of the same page is at
https://claude.ai/artifact/UCaPyJMWgrDAg94xakwn9w. Everything on it is reproducible from this repo.

**Ask the network.** The page has a chat drawer (bottom right) that answers questions about mills, markets, outages,
switching and prices from the page's own numbers: it reads the solved scenarios and the EPA plant list through page
functions, names the scenario each figure comes from, and lists the lookups under every answer. On claude.ai it runs on
the viewer's own account through the artifact runtime. On the public page it runs through `chat/worker.js`, a Cloudflare
Worker that holds the key, fixes the prompt and the tools, allows only this site's origin, limits each visitor to 20
rounds a minute and everyone to 400 rounds a day, and forwards to the Messages API; `chat/README.md` has the deploy
steps and the `chat` workflow does them from repository secrets. No key is ever in the page.

**The tape.** The strip along the bottom scrolls the live inputs (EIA diesel by region, the index points, FRED series)
and the model's results (freight bill, costliest outages, switching gaps, price shocks, capacity values, the 2025
closures); every item jumps to its tab and scenario. Links carry the scenario: `#flows/ko31` opens Flows with
Mansfield knocked out.

## The idea

The corrugated industry is a commodity business that behaves like a relationship business. Board moves
from about sixty mills to about eleven hundred box plants on terms nobody publishes, and the people
who run it carry the map in their heads. But the inputs are public:

- **Supply** is in the 10-Ks and the closure notices: every mill, its grades, its tonnage.
- **Demand** is where people and factories are, and the Fibre Box Association tells you the total.
- **Cost** is freight, and freight is distance and diesel.
- **Price** is a published commodity index (42-lb kraft liner, 26-lb medium, OCC).

Put those together and the question "who ships to whom, at what delivered cost, and who would switch
for how much" is a min-cost flow problem. The solver answers it in three seconds. The duals tell you
what each mill's capacity is worth and what the last ton costs delivered in every county. A
maintenance calendar is an assignment problem priced by those duals. A price increase is a scenario.
A closure is a knockout. The recovered fiber coming back is the same network run in reverse.

This repo is that model, with every assumption written down, every source linked, and a UI that a
sales manager, a mill scheduler or a box buyer can read in a minute.

## What is here

| Folder | Contents |
|---|---|
| `site/` | The UI: one HTML page, one data file, d3. No build step; open `index.html`. |
| `model/` | `netmodel.py` (the LP: demand aggregation, freight, ownership-aware transshipment, duals, prospects, OCC loop), `export_json.py` (every scenario the site shows), `merge_mills.py`, `geocode_mills.py`. |
| `data/` | `mills_final.csv` (90 mills, sourced), `counties.csv` (3,142 counties with population and centroids), `basemap.json`, the research files behind the mill table, and the scenario JSON the site reads. |
| `notes/` | Calibration numbers with sources (`industry_calibration.md`, `market_anchors.md`), plant-footprint notes by company, methodology. |
| `ingest/` | Scripts for the next data layer (EPA FRS plant list, Census CBP, Places, EIA diesel, EDGAR, Overpass, job-posting signals, and `claude_verify.py`, which checks each EPA site with Claude and web search). See `NEEDS.md` for the keys. |
| `chat/` | The chat proxy for the public page: `worker.js` (Cloudflare Worker), `wrangler.toml`, gate tests (`npm test`), README with the deploy steps. |
| `evals/` | How the AI parts are checked: a generated golden set for the chat and its runner, a second-model audit for the plant verification, and the README that explains the guardrails. |
| `.github/workflows/` | `refresh.yml` (scheduled: EIA diesel, FRED, BLS QCEW, plant layer, model, site, publish to the `gh-pages` branch); on demand: `plants.yml` (EPA FRS national file), `cbp.yml` (Census bulk files), `places.yml` (Google Places text search, resumable inside the free tier), `verify.yml` (Claude web check of the plant list, budget-capped), `chat.yml` (deploys the Worker and records its endpoint). |
| `NEEDS.md` | What the project needs from outside: API keys, downloads, memberships, and why. |
| `ROADMAP.md` | What changes the picture most per hour of work, in order. |

## Reproduce

```bash
pip install numpy pandas scipy zipcodes geonamescache
cd model && python export_json.py ../data/mills_final.csv ../data/paper_network.json   # ~4 min: ~60 LP solves + 1 small MILP
python corrugators.py ../data/paper_network.json ../data/corrugators.json                 # the corrugator / sheet-feeder tier, seconds
cd ../site && python build_site.py                                                     # writes index.html and data.js
```

## Status and honesty

The mill side reconciles to the companies' own filings (IP's US capacity within 1%, Smurfit Westrock's
US mills straight from its 10-K table, PCA within 3%, the industry within 4% of the AF&PA survey). The
box-plant side is a population proxy until the EPA facility list is loaded (`ingest/epa_frs.py`).
Freight is two straight lines. Prices are the points that appear in the trade press. All of that is
on the Method tab of the site, and in `notes/`. Pull requests with better data are the point.

## License

Code MIT. Data compiled from public sources; each row carries its source. Commodity price points are
quoted from published reporting and are not a substitute for a Fastmarkets or RISI subscription.
