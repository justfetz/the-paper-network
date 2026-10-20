# The Paper Network

**A public, free model of the US containerboard and corrugated box market, built from public data,
solved as a network-flow problem, and drawn on a map.**

Live site: `site/index.html` (enable GitHub Pages on `main`, folder `/site`, and it serves at
https://justfetz.github.io/the-paper-network/). A hosted copy of the same page is at
https://claude.ai/artifact/UCaPyJMWgrDAg94xakwn9w. Everything on it is reproducible from this repo.

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
| `ingest/` | Scripts for the next data layer (EPA FRS plant list, Census CBP, Places, EIA diesel, EDGAR, Overpass, job-posting signals). See `NEEDS.md` for the keys. |
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
