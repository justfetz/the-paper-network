# Receipts: how The Paper Network's numbers are checked

Generated 2026-10-25 by `audit/recompute.py` from `data/mills_final.csv` and `data/paper_network.json`. It needs no network access; run it yourself and you get these tables.

Every figure in the model is public, and every mill row carries its source. This page sets the model's totals against the public anchors, shows what each mill figure rests on, lists what the last audit changed and why, and shows how far the outputs move when the assumptions move. If a number here is wrong, the fix is one row and one source: see the end of the page.

## The short version

- **US capacity, 2024:** 40.76 Mt in the database against 41.40 Mt from AF&PA (-1.6%).
- **Closures, February 2025 to March 2026:** the database retires 4.03 Mt; Fastmarkets counted about 3.90 Mt (+3.4%).
- **Production:** the solved 2024 network makes 38.70 Mt at US mills against AF&PA's 37.70 Mt (+2.6%); the October 2026 network makes 35.35 Mt against 2025's 36.10 Mt (-2.1%).
- **Why 2024 production runs high:** the overshoot (+1.00 Mt) is the Canadian import gap (1.00 Mt). With demand and exports as assumed, every ton the solver does not buy from Canada it makes at a US mill; that is an explanation of the gap, not a second check.
- **Company totals:** independent public per-mill figures for International Paper sum to within 4.4% of IP's own disclosed total, and PCA's to within 4.3% of PCA's. Smurfit Westrock's US and Canadian rows are read straight from its 10-K mill table.
- **11 of 11 checked anchors are inside tolerance.** Two known gaps are shown, not hidden: the solver keeps more of IP's board in-house than IP reports, and it buys less Canadian board than actually crosses the border.
- **Sensitivity:** moving truck or rail costs 20% either way puts freight between $55.0 and $63.2 a ton (base $59.6) and the Monticello knockout between $89.7M and $104.2M (base $97.9M). The open-market premium is the assumption that drives outage costs, so it is shown at $80 and $200 a ton.

## 1. Totals against public anchors

| Check | Model | Public figure | Gap | Status | Source |
|---|---|---|---|---|---|
| US containerboard capacity, 2024 | 40.76 Mt | 41.40 Mt | -1.6% | within tolerance | [AF&PA capacity surveys: 2021 record 42.3 Mt, then -0.6%, -0.7%, -0.9% (derived)](https://www.afandpa.org/news/2025/afpa-details-us-paper-production-and-capacity-trends) |
| Capacity permanently retired, Feb 2025 to Mar 2026 | 4.03 Mt | 3.90 Mt | +3.4% | within tolerance | [Fastmarkets: ~3.9 Mt, roughly 10% of capacity](https://www.fastmarkets.com/insights/north-american-containerboard-market-capacity-cuts/) |
| US capacity after those closures | 37.15 Mt | 37.50 Mt | -0.9% | within tolerance | [41.4 Mt less 3.9 Mt (derived); the model's October 2026 footprint also carries IP's Riverdale PM16 conversion, due by Q3 2026](https://www.fastmarkets.com/insights/north-american-containerboard-market-capacity-cuts/) |
| US capacity, 2025 (AF&PA annual figure) | 36.97 Mt | 39.30 Mt | -5.9% | within tolerance | [AF&PA 66th survey: -5.1% in 2025 (derived). AF&PA counts a mill that closed in September for most of the year, so its annual figure sits above a year-end footprint](https://www.afandpa.org/news/2026/afpa-releases-66th-annual-paper-industry-capacity-and-fiber-consumption-survey) |
| US containerboard production, 2024 | 38.70 Mt | 37.70 Mt | +2.6% | within tolerance | [AF&PA: 2025 production of 36.1 Mt was -4.4% y/y (derived)](https://www.afandpa.org/news/2026/afpa-releases-66th-annual-paper-industry-capacity-and-fiber-consumption-survey) |
| US containerboard production, 2025 (model: October 2026 footprint) | 35.35 Mt | 36.10 Mt | -2.1% | within tolerance | [AF&PA 66th survey](https://www.afandpa.org/news/2026/afpa-releases-66th-annual-paper-industry-capacity-and-fiber-consumption-survey) |
| International Paper: public per-mill figures, summed, vs IP's own 2024 US total | 12.42 Mt | 12.98 Mt | -4.4% | within tolerance | [IP FY2024 annual report, Appendix II: 12,984 thousand short tons including Campti](https://www.sec.gov/Archives/edgar/data/51434/000119312525069955/d856503dars.pdf) |
| PCA: last per-mill disclosures, summed, vs PCA's own year-end-2025 total | 5.55 Mt | 5.80 Mt | -4.3% | within tolerance | [PCA FY2025 10-K: about 5.8 million tons (358 BSF)](https://www.sec.gov/Archives/edgar/data/75677/000119312526074129/pkg-20251231.htm) |
| IP board to its own box plants (share) | 0.847 | 0.800 | +5.9% | within tolerance | [IP 10-K FY2019-22: about 80%](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000051434&type=10-K) |
| Containerboard imports into the US, 2024 (model: Canadian mills' tons into US markets) | 0.40 Mt | 1.40 Mt | -71.1% | known gap, shown | [Fastmarkets: 1.27 M tonnes, mostly from Canada](https://www.fastmarkets.com/insights/north-american-linerboard-price-increases/) |
| Average haul, October 2026 network vs FAF5 paper | 505.978 | 581.000 | -12.9% | within tolerance | [FAF5 2023, SCTG 27 (all paper and paperboard; containerboard is inside it): ton-miles / tons, domestic flows](https://faf.ornl.gov/faf5) |
| Rail share of domestic tons vs FAF5 paper (rail 8.1% to rail + multiple modes 24.0%) | 0.243 | 0.240 | +1.2% | within tolerance | [FAF5 2023, SCTG 27 (all paper and paperboard; containerboard is inside it): ton-miles / tons, domestic flows](https://faf.ornl.gov/faf5) |

What each model figure is:

- **US containerboard capacity, 2024:** every US mill open in 2024, at its 2024 capacity.
- **Capacity permanently retired, Feb 2025 to Mar 2026:** mills the database closes in 2025, plus machines retired at mills that stay open.
- **US capacity after those closures:** the October 2026 footprint.
- **US capacity, 2025 (AF&PA annual figure):** mills open at the end of 2025, before the 2026 machine changes.
- **US containerboard production, 2024:** US mills' shipments plus exports in the solved 2024 network; the overshoot (+1.00 Mt) matches the Canadian import gap in the last row (1.00 Mt): board the solver makes at US mills that in reality crosses the border.
- **US containerboard production, 2025 (model: October 2026 footprint):** US mills' shipments plus exports in the solved October 2026 network; 2026 production is running below 2025.
- **International Paper: public per-mill figures, summed, vs IP's own 2024 US total:** before calibration; the database now scales IP's 11 oldest rows x1.0674 so they sum to IP's figure.
- **PCA: last per-mill disclosures, summed, vs PCA's own year-end-2025 total:** PCA stopped publishing per-mill figures after FY2011-12; the database scales the last ones x1.0708 to PCA's total.
- **IP board to its own box plants (share):** known bias: a cost-minimizing solver keeps more of an integrated producer's board at home than contracts do.
- **Containerboard imports into the US, 2024 (model: Canadian mills' tons into US markets):** known gap: the solver buys Canadian board only where freight favors it; contracts and currency move about three times as much.
- **Average haul, October 2026 network vs FAF5 paper:** tons-weighted miles of the solved domestic flows against FAF5's measured ton-miles over tons; a wide tolerance because SCTG 27 mixes pulp and printing grades with containerboard.
- **Rail share of domestic tons vs FAF5 paper (rail 8.1% to rail + multiple modes 24.0%):** the model's rail flag is the cheaper-mode rule with a rail access premium of $16.41/t that export_json.py calibrates to the band's upper edge; this row shows the calibration closed, not an independent prediction.

## 2. What each mill figure rests on

The database has 77 US mill rows; 64 are open in October 2026. Shares are of open US capacity.

| Basis of the capacity figure | Mills | Share of capacity |
|---|---|---|
| company total, split by older public figures | 16 | 34% |
| SEC filing | 17 | 28% |
| company statement | 13 | 20% |
| estimate | 10 | 10% |
| trade press | 8 | 8% |

"Company total, split by older public figures" means the company discloses its total (International Paper, PCA) but not each mill; the last public per-mill figures are scaled pro rata so the mills add up to the company's own number, and the factor is written into the row.

Open US mills whose figure is still an estimate. A better public number for any of these is a one-line fix:

| Mill | Owner | Capacity | What the estimate rests on |
|---|---|---|---|
| Toledo, OR | Georgia-Pacific | 950 kt | estimate; trade press ~1999: >900,000 t/yr containerboard; three paper machines per 2019 report; no current disclosure found |
| Arkansas Kraft, AR | Green Bay Packaging | 450 kt | estimate; company 2015: integrated two-machine virgin mill producing 420-440k t/yr; later press-section upgrade for lightweight linerboard |
| Shreveport (PM16), LA | Pratt Industries | 360 kt | estimate; 2008-09 project ($150M) described as processing up to 430,000 t/yr recovered paper (intake); output assumed ~360k t |
| NORPAC Longview, WA | International Paper | 330 kt | estimate; mill ~1,000,000 t/yr all grades on three machines; 2019 plan shifted ~one-third of capacity to recycled packaging (NorLiner, NORFL |
| Conyers (PM14), GA | Pratt Industries | 330 kt | estimate; residual of Fastmarkets RISI five-mill total of 1.91 Mt/yr (2020) after Staten Island, Shreveport, Valparaiso, Wapakoneta |
| St. Francisville, LA | Hood Container | 300 kt | estimate; 2015 reports: 650-700 tpd with stated goal of 300,000 t/yr; 2025 release: $118.9M primary-machine upgrade adds ~80,000 t/yr |
| Port Townsend, WA | Port Townsend Paper | 300 kt | estimate; company FAQ ~950 tpd paper + market pulp; WA Ecology 2025: ~1,000 tpd incl. pulp; 2005 reference ~325,000 t/yr; machine count unce |
| Becker, MN | Liberty Paper | 280 kt | estimate; company testimony Apr 2026: ~1,000 tpd OCC in, ~800 tpd paper out; older directories 200-240k t/yr |
| Oxnard, CA | New-Indy | 195 kt | derived: Kraft Group states the two California mills produce 570,000 t/yr combined; minus Ontario 375k |
| Hartford City, IN | New-Indy | 180 kt | derived: company says its three recycled mills total 750,000 t/yr; minus ~570k for the California mills |

## 3. What the 2026-10-21 audit changed

Checked against SEC filings, company releases and trade press. International Paper's oldest rows were scaled x1.0674 and PCA's x1.0708, about what 10 to 19 years of debottlenecking adds to a mill.

| Mill | Owner | Before | After | Why |
|---|---|---|---|---|
| Riceboro, GA | International Paper | 2024 owner: International Paper | 2024 owner: DS Smith | Riceboro belonged to DS Smith until IP closed the DS Smith acquisition in January 2025, so it is not in IP's 2024 total |
| Forney, TX | Smurfit Westrock | 275 kt | 354 kt | SW FY2024 10-K mill table lists Forney at 354k; the 275k was an estimate |
| Cerro Gordo, Estado de Mexico | Smurfit Westrock | 750 kt | 259 kt | replaced an estimate with the SW FY2025 10-K mill-table figure (Mexican mills are context only; they do not supply the US network in the model) |
| Los Reyes, Estado de Mexico | Smurfit Westrock | 500 kt | 158 kt | replaced an estimate with the SW FY2025 10-K mill-table figure (Mexican mills are context only; they do not supply the US network in the model) |
| San Luis Potosi, San Luis Potosi | Smurfit Westrock | 68 kt | 71 kt | replaced an estimate with the SW FY2025 10-K mill-table figure (Mexican mills are context only; they do not supply the US network in the model) |
| Monterrey, Nuevo Leon | Smurfit Westrock | 400 kt | 402 kt | SW FY2025 10-K mill table lists Monterrey at 402k |
| Monterrey, Nuevo Leon | Smurfit Westrock |  | flagged | flagged as a possible duplicate: the retrieved SW table shows one Monterrey row; kept (context only, no effect on the US network) until the full table is read |
| Big Island, VA | Georgia-Pacific | 480 kt | 607 kt | GP's own later 10-K lists 319k medium + 288k recycled linerboard; the 480k came from 1995-96 start-up reports |
| Wallula, WA | Packaging Corp of America | 450 kt in 2024 | 535 kt in 2024 | PCA 8-K (3 Dec 2025): W2 and kraft pulping shutdown removes ~250k; W3 continues at ~285k, so the year-end-2025 mill was ~535k |
| Counce, TN | Packaging Corp of America | 1,150 kt | 1,078 kt | last public per-mill figure scaled x1.071 so PCA's mills sum to its disclosed ~5.8 Mt at year-end 2025 (FY2025 10-K) |
| DeRidder, LA | Packaging Corp of America | 1,050 kt | 1,065 kt | last public per-mill figure scaled x1.071 so PCA's mills sum to its disclosed ~5.8 Mt at year-end 2025 (FY2025 10-K) |
| Tomahawk, WI | Packaging Corp of America | 600 kt | 560 kt | last public per-mill figure scaled x1.071 so PCA's mills sum to its disclosed ~5.8 Mt at year-end 2025 (FY2025 10-K) |
| Valdosta, GA | Packaging Corp of America | 580 kt | 595 kt | last public per-mill figure scaled x1.071 so PCA's mills sum to its disclosed ~5.8 Mt at year-end 2025 (FY2025 10-K) |
| Filer City, MI | Packaging Corp of America | 430 kt | 466 kt | last public per-mill figure scaled x1.071 so PCA's mills sum to its disclosed ~5.8 Mt at year-end 2025 (FY2025 10-K) |
| Mansfield, LA | International Paper | 1,400 kt | 1,494 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Valliant, OK | International Paper | 1,330 kt | 1,420 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Cedar River, IA | International Paper | 1,020 kt | 1,089 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Springfield, OR | International Paper | 630 kt | 672 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Henderson, KY | International Paper | 210 kt | 224 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Pensacola (Cantonment), FL | International Paper | 500 kt | 534 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Vicksburg, MS | International Paper | 550 kt | 587 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Bogalusa, LA | International Paper | 895 kt | 955 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Maysville, KY | International Paper | 525 kt | 560 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Newport, IN | International Paper | 357 kt | 381 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Prattville, AL | International Paper | 1,000 kt | 1,067 kt | figure dated 2010 or earlier (or an estimate) scaled x1.067 so IP's 2024 US mills sum to IP's disclosed 12,984 kt (FY2024 annual report) |
| Roanoke Rapids, NC | Smurfit Westrock | not listed | 322 kt | added: missing from the database; Smurfit Westrock's 10-K lists 322k of containerboard |
| La Tuque, QC | Smurfit Westrock | not listed | 341 kt | added: missing from the database; Smurfit Westrock's 10-K lists 341k of containerboard (Canada) |
| St. Paul (corrugating medium), MN | Smurfit Westrock | not listed | 200 kt (closed) | added: recorded as a closure for completeness (medium ended Oct 2022, so it is in no modeled footprint) |

## 4. Closures, 2025 to March 2026

| Mill | Owner | Capacity |
|---|---|---|
| Niagara Falls (corrugating medium), NY | Cascades | 200 kt |
| Cedar Springs, GA | Georgia-Pacific | 1,000 kt |
| Riceboro, GA | International Paper | 430 kt |
| Savannah, GA | International Paper | 1,000 kt |
| Red River (Campti), LA | International Paper | 800 kt |
| Forney, TX | Smurfit Westrock | 354 kt |
| Wallula (machine), WA | Packaging Corp of America | 250 kt |
| **Total** | | **4,034 kt** |

Added at mills that stay open: Riverdale (Selma), AL (International Paper) +430 kt.

## 5. How the headline outputs moved with the 2026-10-21 corrections

| October 2026 footprint | Before the audit | After |
|---|---|---|
| US mills open (Oct 2026) | 63 | 64 |
| US capacity, Oct 2026 (Mt) | 36.19 | 37.15 |
| US mill utilization | 97.7% | 95.1% |
| Average haul (mi) | 514 | 509 |
| Rail share | 41.9% | 41.7% |
| Freight ($/t) | 60.0 | 59.6 |
| Freight bill ($M/yr) | 2,096 | 2,083 |
| Unmet demand (kt) | 0 | 0 |
| Bought outside own system (kt) | 901 | 727 |
| Mills with a positive scarcity value | 64 | 57 |
| Median scarcity value ($/t) | 32.2 | 18.5 |
| Costliest knockout | Mansfield +$171M/yr | Monticello +$98M/yr |
| Second | Valliant +$134M/yr | Cedar River +$92M/yr |
| Third | Toledo +$117M/yr | Toledo +$91M/yr |
| Mansfield knockout | +$171M/yr, 201 kt unmet | +$78M/yr, 0 kt unmet |
| International Paper +$70/t alone: open-market tons lost (kt) | 355 | 534 |
| Smurfit Westrock +$70/t alone: open-market tons lost (kt) | 71 | 142 |
| Packaging Corp of America +$70/t alone: open-market tons lost (kt) | 105 | 140 |
| Georgia-Pacific +$70/t alone: open-market tons lost (kt) | 35 | 45 |
| Pratt Industries +$70/t alone: open-market tons lost (kt) | 517 | 522 |

More capacity in the database means a network with more slack: lower scarcity values, less unmet demand when a big mill goes down, and smaller knockout costs. The corrected figures are the ones to quote.

## 6. How far the outputs move when the assumptions move

Each row re-solves the October 2026 network with one assumption changed, then takes Monticello out again (re-solved 2026-10-21; `python audit/recompute.py` without `--no-solve` refreshes this table).

| Case | Haul (mi) | Rail | Freight $/t | Freight bill $M | IP own-plant share | Unmet kt | Monticello out, $M/yr |
|---|---|---|---|---|---|---|---|
| base | 509 | 42% | 59.6 | 2,083 | 85% | 0 | +97.9 (0 kt unmet) |
| truck cost +20% | 511 | 53% | 62.1 | 2,168 | 85% | 0 | +102.7 (0 kt unmet) |
| truck cost -20% | 507 | 22% | 55.4 | 1,932 | 86% | 0 | +96.9 (0 kt unmet) |
| rail cost +20% | 494 | 32% | 63.2 | 2,215 | 84% | 0 | +89.7 (0 kt unmet) |
| rail cost -20% | 523 | 48% | 55.0 | 1,922 | 85% | 0 | +104.2 (0 kt unmet) |
| open-market premium $80/t | 451 | 37% | 54.9 | 1,932 | 82% | 0 | +32.4 (0 kt unmet) |
| open-market premium $200/t | 540 | 43% | 61.9 | 2,164 | 84% | 0 | +142.2 (0 kt unmet) |
| diesel $5.00/gal | 507 | 46% | 61.5 | 2,149 | 85% | 0 | +97.9 (0 kt unmet) |
| integrated share 80% | 485 | 39% | 57.5 | 2,015 | 80% | 0 | +94.1 (0 kt unmet) |
| integrated share 92% | 525 | 44% | 61.1 | 2,133 | 88% | 0 | +104.3 (0 kt unmet) |

The five costliest single-mill outages, re-ranked under the premium extremes (base order Monticello, Cedar River, Toledo, Mansfield, DeRidder):

- Open-market premium $80/t: Toledo +$72.1M, Cedar River +$67.4M, Mansfield +$44.7M, DeRidder +$39.2M, Monticello +$32.4M.
- Open-market premium $200/t: Monticello +$142.2M, Toledo +$120.6M, Cedar River +$95.9M, Mansfield +$87.9M, DeRidder +$85.8M.

## 7. Demand placement

State totals come from Census County Business Patterns employment for NAICS 322211 (1,159 establishments, 90,228 employees), so state shares match the Census by construction. Within a state, demand follows the EPA Facility Registry's 1,605 box-plant sites. Against EPA plant-count shares the model's state shares differ by an RMS log error of 0.353 over 38 states: the difference between counting plants and counting tons, since Texas and the Southeast run bigger plants than New Jersey and Illinois.

## 8. What these numbers are not

- The flows are the cheapest routing the solver finds, not a record of who ships to whom. Contracts, swaps and history move real board; none of that is public.
- Export tonnage is not published for free (AF&PA sells the trade dataset). The model assumes 4.6 Mt in 2024 and 3.6 Mt in 2026, consistent with AF&PA's reported percentage moves; domestic consumption carries the same uncertainty, ton for ton.
- Price points are midpoints of published index moves; the months between moves are chained and marked as derived.
- Mexican mills are listed for context and do not supply the US network in the model.

## 9. How to challenge a number

Open an issue at https://github.com/justfetz/the-paper-network with the row and a public source, or send a pull request against `data/mills_final.csv` with the citation in the source column. CI checks that the network still balances; the next refresh re-solves every scenario and regenerates this page.
