# Free public freight data: what the network holds, what each source replaces

Working note, 2026-10-25, written for this repository (the-paper-network). Inventory from HEAD `676e90e`
(`paper_network.json` generated 2026-10-21). Sources below were checked on
the public web today; where a detail is unverified it says so.

## 1. What the network holds today

| Layer | What it is | Provenance grade |
|---|---|---|
| Mills | 93 containerboard mills (US, CA, MX): owner, grades, capacity, status, lat/lon; 79 open, 87 in the model; each row has its own source URL; confidence 38 high / 29 medium / 26 low | real, hand-researched; the README still says "90" |
| Demand | 3,142 counties → 441 market nodes; weight = 85% Census CBP 322211 employment + 15% population | real inputs, derived weights, ±50% error bar by the repo's own note |
| Plants | 3,446 EPA FRS rows → 1,605 de-duplicated box sites; 695 Google Places hits; 26 verified | real locations, ownership guessed, 1.6% verified |
| Employment | CBP 2023 county and state for NAICS 322211; QCEW 2026 Q1 county | real |
| Prices | EIA weekly diesel US + 5 PADDs back to 1994 (10,206 rows); FRED box PPI, paper production index, retail and e-commerce sales | real; no containerboard price series, press points only |
| Freight | ONE rule: road miles = 1.2 × great-circle; truck $8 + $0.125/mi/t, rail $35 + $0.065/mi/t at $3.75 diesel, cheaper mode wins; 12 export gateways with ASSUMED shares (Laredo 28%, Savannah 14%); 22 t per truck and 80 t per railcar in the Throughput tab | assumption throughout |
| Output | 15 scenarios × 3,719 arcs, knockouts, price shocks, OCC loop, backtest; KPIs: avg haul 509 mi, rail share 41.7%, $59.6/t, $2.08B freight bill | modelled, "cheapest routing, not a record of who ships to whom" |

The repo is honest about its own gaps: average haul "almost certainly high
against reality (a guess: 350–450)", imports modelled at 0.34 Mt against
1.40 Mt public, tons per truckload and $/load for rollstock "NOT FOUND",
and ROADMAP item 3 asks for lane-level freight.

So the mills, the plants and the prices are real. Every number about
MOVEMENT (miles, trucks, rail, ports, lead times) is a rule, not an
observation. That is where free public data changes the model most.

## 2. Trucks per day and miles covered: how you actually get them

**Trucks per day at one plant** is not a public number. It is shipped
volume divided by payload per load. The network's 22 t per truck is a
weight assumption; corrugated typically cubes out a 53 ft van before it
weighs out, so the right divisor is the plant's own loads per day from the
shipping office, which is an owner interview item, not a download. For a
fleet of plants, the public proxy is FAF tons for SCTG 28 (paper articles)
by origin region divided by a payload you state.

**Miles covered** has two honest public sources. FAF5 gives ton-miles and
tons by origin-destination pair, commodity and mode, so ton-miles ÷ tons is
the average haul for paper (SCTG 27) and paper articles (SCTG 28) by region,
which directly tests the model's 509 mi. The 2022 Commodity Flow Survey
gives the distance distribution per shipment by commodity and mode, with
the caveat that 2022 distances are great-circle, not routed, so they sit
closer to the model's own geometry than to odometer miles. Routed road
miles come from a self-hosted router over OpenStreetMap (OSRM, Valhalla or
GraphHopper with a truck profile), which replaces the 1.2× factor with a
real number per lane at zero licence cost.

## 3. Free sources, ranked by what they change

**Tier 1: replaces an assumption in the model**

| Source | What it gives | Grain, cadence | Access | What it replaces here |
|---|---|---|---|---|
| FAF5.6.1 (ORNL / FHWA) | tons, value, ton-miles by origin-destination FAF region, SCTG commodity, mode; 2018–2023 regional file plus forecasts | region pair × commodity × mode, annual | free download, CSV | the 509 mi haul, the 41.7% rail share, the modal split by region |
| STB Carload Waybill Sample, public-use file | a masked sample of rail waybills: commodity (STCC, paper is 26), origin/destination BEA area, tons, revenue, miles | annual, waybill-level masked | free public-use release (the confidential file needs a waiver) | the $35 + $0.065/mi rail rule; real rail paper flows and revenue per ton-mile |
| BTS Transborder Freight Data | truck and rail crossings by port of entry, commodity (HS chapter 48 covers paper), value and weight, US–Mexico and US–Canada | port × commodity × mode, monthly | free download and API | the ASSUMED Laredo 28% and the other gateway shares |
| Census international trade (USA Trade Online / Census trade API, USITC DataWeb) | imports and exports of HS 4804 (kraftliner) and 4805 by country, customs district and port, value and kg | port × country × HS, monthly | free; USA Trade Online needs a free account | the 0.34 vs 1.40 Mt import gap; which ports paper actually enters |
| 2022 Commodity Flow Survey | shipment characteristics by commodity, mode and distance band; area, exports, temperature, hazmat series | national and state, every five years; final estimates released 2025 | free API (`api.census.gov/data/2022/cfsarea`, key required) and bulk files | the haul histogram's shape; truck share under 50 mi for paper |
| OSRM / Valhalla over OpenStreetMap | routed road distance and drive time, truck profile | per lane, on demand | free, self-hosted (a Cloud Run or a small VM) | 1.2 × great-circle; adds drive time, which the model has nowhere today |

**Tier 2: adds a live signal the model lacks**

| Source | What it gives | Cadence | Access | Use |
|---|---|---|---|---|
| FMCSA Motor Carrier Census | every registered carrier: location, power units, drivers, commodities | monthly file | free CSV (data.transportation.gov 4a2k-zf79) | carrier capacity within N miles of each node; a "tight lane" prior |
| FHWA Traffic Volume Trends; Highway Statistics VM-1 | monthly VMT by state and road class; annual VMT by vehicle type incl. combination trucks | monthly / annual | free Excel | a truck-activity index per region; the only free "miles covered" aggregate |
| BLS PPI | PCU322211322211 (boxes, already held); add long-distance truckload trucking (NAICS 484121) and rail (4821) indices | monthly | free via FRED/BLS | freight cost drift without a paid rate index |
| Census M3 | paper products shipments, inventories, orders; FRED U22SIS inventories-to-shipments | monthly | free | the demand side's pulse; a lead on box demand |
| AAR rail traffic | weekly carloads (forest products as a group), monthly pulp and paper carloads | weekly / monthly | press releases; raw files not confirmed | a rail-volume check against the model's rail share |
| Cass Freight Index, ATA tonnage, DAT | national freight volume and rate headlines | monthly / weekly | headline numbers free in press; underlying series paid | context only; never a lane rate |
| NTAD (BTS geospatial catalog) | North American rail network lines and nodes; intermodal TOFC/COFC facilities with SPLC; ports | dynamic updates | free GeoJSON, CSV, WFS | real transload points and rail reachability per mill and node |

**Tier 3: verification**

EPA ECHO / TRI for the mill list (NAICS 322121 paper mills, 322130
paperboard mills) to cross-check the 93 rows; County Business Patterns
322211 by county (already held) to keep the 1,605 FRS sites honest; USACE
waterborne commerce for OCC export tonnage by port.

**What stays paid, and why it is fine:** Fastmarkets / RISI containerboard
prices, FBA regional shipments (the 2026 Statistical Bulletin is $4,525),
AF&PA's monthly detail, DAT and Cass lane rates. The network already says
these stay out. Nothing in Tier 1 needs them.

## 4. How to tell valuable free data from noise

Three tests, in order:

1. **It has units, a grain and a release calendar.** Tons by region-pair
   per year is data. "Freight is up 4%" is a headline.
2. **It replaces a named assumption.** Every Tier 1 row above points at one
   parameter in `model/netmodel.py` or `export_json.py`. If a source does not
   change a number the model uses, it is context, not calibration.
3. **It leaves a receipt.** Source URL, pull date, transformation, and the
   before/after of the parameter it moved, in the same style as
   `audit/RECEIPTS.md` and `docs/PLANT_TRUTH.md`. The paper network already
   does this for mills; freight should get the same ledger.

## 5. Order of work, if we do it

1. FAF5 SCTG 27/28 by region pair: recompute average haul and rail share;
   publish the before/after against 509 mi and 41.7%.
2. Transborder plus Census trade by port: replace the gateway shares and
   close the import gap.
3. OSRM truck profile: routed miles and drive time for the 3,719 arcs.
4. STB public-use waybill: a real rail cost curve for paper.
5. FMCSA census: carrier density per node as a capacity prior, surfaced in
   the chat's `find_market` tool.

Each step is one ingest script in the existing `ingest/` pattern, one
receipt, and one parameter moved. The chat tools need no new shape: the
trail already says "freight rule"; it would say "FAF5 2023, region pair
X→Y" instead.

## Sources

- FAF5: https://faf.ornl.gov/faf5
- CFS 2022 API and explorer: https://cdn.www.census.gov/data/developers/data-sets/cfs.html , https://cfsdata.bts.gov/
- FMCSA Motor Carrier Census: https://catalog.data.gov/dataset/motor-carrier-registrations-census-files
- FHWA Traffic Volume Trends: https://www.fhwa.dot.gov/policyinformation/travel_monitoring/tvt.cfm
- FHWA Highway Statistics VM-1 (per year): https://www.fhwa.dot.gov/policyinformation/statistics/2017/vm1.cfm
- NTAD updates: https://www.bts.gov/newsroom/bts-updates-datasets-national-transportation-atlas-database-winter-2025
- EIA diesel on FRED (PADD II weekly): https://fred.stlouisfed.org/series/GASDESLSMWW
- Box PPI: https://fred.stlouisfed.org/series/PCU322211322211
- M3 inventories-to-shipments, paper: https://fred.stlouisfed.org/data/U22SIS
- CBP API: https://www.census.gov/programs-surveys/cbp/data/api.html
- USITC DataWeb: https://www.usitc.gov/applications/dataweb/about
- AAR monthly category example: https://www.ajot.com/news/rail-traffic-for-november-and-the-week-ending-december-3-2022
- FBA bulletin pricing: https://fibrebox.myshopify.com/products/2026-statistical-bulletin
- OSRM truck routing discussion: https://help.openstreetmap.org/questions/74336/osm-for-commercial-truck-routing

Not verified today (named from memory, check before use): the STB public-use
waybill file's current release page, the BTS Transborder API path, the exact
BLS series id for long-distance truckload PPI, and whether AAR posts raw
weekly files.

## 6. Implemented (branch `feat/public-freight-sources`, 2026-10-25)

Steps 1, 2 and 3 of section 5 are code: `ingest/faf5.py`, `ingest/census_trade_ports.py`,
`ingest/osrm_lanes.py`, the per-lane road factors in `model/netmodel.py`, the measured blocks in
`params.freight_measured`, and the conditional receipt rows in `audit/recompute.py`. The pulls run from
`.github/workflows/refresh.yml` (annual, monthly with the Census key, quarterly); the model and the
receipts change only once their files exist. Steps 4 (STB waybill) and 5 (FMCSA) are not started.

**What the first measurements said (2026-10-25).** OSRM: 41,013 lanes, median road / great-circle 1.197
against the assumed 1.2. FAF5 2023, SCTG 27: average haul 581 mi against the model's 510 (within the
tolerance, SCTG 27 is wider than containerboard); rail 8.1% and multiple modes 15.9% of domestic tons
against the model's 42.6% by rail. The bare cheaper-mode rule was wrong about mode by a factor of five.
The fix (`feat/rail-modal-calibration`) is a rail ACCESS premium, $/t on every rail quote standing for
siding access, transload and dwell, that `export_json.py` solves by bisection so the 2026 footprint's rail
share meets FAF5's explicit rail share (the measured number; `PN_RAIL_TARGET=rail_plus_multiple` instead
targets rail + multiple modes on the assumption that paper's multiple-mode tons are truck-rail, which FAF5
does not decompose, so that is an option, not the default). The premium, the target and its basis, the
band, the breakeven miles and the solve trace ride `params.freight`; the receipts row checks the model
against the FAF5 band and says it is a calibration, not a prediction. Step 4 (the STB waybill) would replace
the premium with a measured rail cost curve.
