# How close is the model? A calibration note (October 2026 run)

> **Superseded for current numbers** by [`audit/RECEIPTS.md`](../audit/RECEIPTS.md), regenerated from the data by `audit/recompute.py` (21 October 2026 audit: two missing Smurfit Westrock mills added, IP and PCA rows scaled to the companies' own totals). The method notes below still apply; the figures are from the run before the audit.

Short version: the national totals are within the spread of the published numbers (about ±3–4%), the
company-level supply side is within 1–5%, the regional demand geography is the weak part (±25–35% by
state against the only independent signal we have), and the network outputs are precise given the inputs
(±3–5%) but carry an idealization bias that no public number can size yet.

## 1. Mass balance against the anchors (Mt, short tons)

| Quantity | 2024 model | 2024 record | 2026 model | 2026 record |
|---|---|---|---|---|
| US mill output | 38.7 | 37.7 (AF&PA production) | 35.3 | 36.1 in 2025; Q2-2026 −2% y/y (≈35.4) |
| Canadian board into the US | 0.4 | 1.4 (all imports) | 0.5 | ~1.3 |
| Exports | 4.6 (assumed) | not published; 4–5.5 plausible | 3.6 (assumed) | 2025 −11%, Q1-2026 −19% |
| Domestic board consumed | 34.5 | no single figure | 32.2 | no single figure |
| of which in boxes at 82 t/MMSF | 31.2 | FBA 381 BSF | ~30.2 | FBA ≈ 368–375 BSF implied |
| waste, other uses, inventory | 3.3 (≈10%) | 8–10% is typical | ~2.0 (≈6%) | |

The identity output + imports − exports = consumption closes by construction, because consumption was set
from the anchors. The independent check is output against production: +2.7% in 2024 and within 1% of the
2026 run-rate. Most of the 2024 overshoot is the import gap: the LP pulls only 0.4–0.5 Mt from Canadian
mills on freight grounds, while 1.3–1.4 Mt actually crosses the border on contracts and currency. Fixing it
is a lower bound on Canadian sales into the US (roadmap).

## 2a. Update: the plant layer measured it

With the EPA Facility Registry (1,796 NAICS 322211 sites with coordinates, 48 states) and the Census County Business
Patterns state file (complete state totals for 322211) in hand, the population proxy's state-level error is no longer a
guess: RMS log error 0.44 against the EPA plant counts (0.39 weighted by plants), about 45% for a typical state.
Florida carried twice its real weight (people, few plants: 5.3% of the proxy, 2.7% of plants), Illinois and New Jersey
about half theirs (4.1% vs 8.3%, 2.3% vs 4.7%), California was under by a quarter (11.2% vs 14.2%). Texas is the
instructive case: 5.2% of plants but 8.6% of employment, because Texas plants are large; counts and tonnage are not the
same thing, which is why the new weights use employment for the state totals and plant counts only within a state.

From this run the demand weights are: state share = CBP 322211 employment (complete state file); within a state, 70%
EPA plant counts + 30% the old proxy (so a county with one unregistered plant does not go to zero). The state-level
error against the Census is therefore zero by construction, and the remaining uncertainty is within-state placement,
which the EPA list bounds at roughly the county level. The county-level CBP file (133 counties, 692 establishments)
is thinned by the Census's newer disclosure rules and is kept only as a cross-check.


### What changed when the measured demand went in (same mills, same prices, same freight)

| Output, October 2026 | Population proxy | Measured demand (Census state employment × EPA plants) |
|---|---|---|
| Average haul | 568 mi | 514 mi |
| Rail share | 44% | 42% |
| Freight per ton | $64 | $60 |
| West capacity value | $96/t | $66/t |
| East capacity value | $39/t | $33/t |
| IP internal share | 88% | 88% |
| Median gap to the 2nd-cheapest mill | $5.2/t | $5.2/t |
| Markets with a 2nd mill within $5/t | 49% | 49% |
| Outage calendar, staggered → assigned | $269M → $122M | $276M → $122M |
| Largest knockout | Mansfield +$186M | Mansfield +$172M |
| Corrugator markets with no corrugator | 99 of 441 | 171 of 441 |
| State shares, top 5 | CA 11.2, TX 8.1, FL 5.3, NY 4.6, OH 4.5 | CA 9.9, OH 6.8, TX 6.8, PA 6.3, IL 4.9 |

The proxy had been putting board where people live rather than where boxes are made: too much in Florida, Texas
and New York, too little in Ohio, Pennsylvania, Wisconsin, Indiana and Illinois. Moving it shortened the average
haul by about 10%, cut the freight bill by 6%, and took a third off the West's scarcity premium (the proxy had
overstated Western demand relative to Western plants). The switching math did not move at all: the gap between a
market's cheapest and second-cheapest mill is freight geometry, not demand. Integration rates and the maintenance
calendar result were unchanged. The corrugator tier concentrated: with demand following plants, more small markets
have no corrugator of their own and buy sheets from the nearest one that does.

## 2. Demand geography against an independent signal (before the plant layer)

The model spreads demand by population tilted toward manufacturing states. The only free, independent check
found is D&B's count of corrugated-box listings by state (1,940 listings; includes non-manufacturers):

| State | Model demand share | D&B listing share | Ratio |
|---|---|---|---|
| California | 11.2% | 9.1% | 1.24 |
| Texas | 8.1% | 6.9% | 1.18 |
| Illinois | 4.1% | 7.0% | 0.58 |
| Ohio | 4.5% | 6.6% | 0.67 |

Read as a log error across the four states, that is about ±35% at the state level. The direction is
believable: the industrial Midwest has more plants per person (food processing, durables, Chicago's many
sheet plants) than a population proxy gives it, and the Sunbelt fewer. Plant counts overstate the error in
tonnage terms (Sunbelt plants are larger on average), so the working estimate is: state σ ≈ 25–35%, Census
division σ ≈ 15–20%, single county σ ≈ 50% or more. This is the dominant uncertainty in the whole model and
the cheapest to remove: County Business Patterns employment for NAICS 322211 (free key) replaces the proxy.

## 3. Monte Carlo over the inputs we are least sure of

Fourteen re-solves of the October 2026 network with: mill capacities perturbed by confidence (σ 3% high,
7% medium, 12% low), demand σ 3.5%, exports σ 0.5 Mt, outside-purchase premium drawn from $80–200/t,
manufacturing tilt drawn from 0.3–0.7.

| Output | Base | Mean | σ | σ/mean |
|---|---|---|---|---|
| Average haul (mi) | 568 | 544 | 26 | 4.8% |
| Rail share | 0.44 | 0.43 | 0.02 | 4.7% |
| Freight $/t | 64.1 | 62.2 | 2.1 | 3.4% |
| US mill utilization | 0.977 | 0.971 | 0.021 | 2.2% |
| IP internal share | 0.876 | 0.866 | 0.037 | 4.2% |
| SW internal share | 0.873 | 0.851 | 0.037 | 4.4% |
| Owner outside buys (Mt) | 0.77 | 1.39 | 0.68 | 49% |
| Unmet demand (Mt) | 0.00 | 0.10 | 0.26 | — |
| West capacity value $/t | 96 | 133 | 123 | 93% |
| East capacity value $/t | 39 | 77 | 127 | 164% |

The aggregate flows are stable: haul, modal split, freight per ton and integration move by a few percent
across the input range. Two things are not stable, and both are findings rather than defects. The outside
purchases depend on the premium, which is an assumption about how integrated producers price their own
margin. And the capacity values (the duals) swing wildly because the 2026 network sits within about 3% of
sold out: in the draws where demand lands a little high or a mill a little small, the solver rations and the
marginal ton is worth the $400/t penalty everywhere. That knife-edge matches the 2026 commentary ("nearly
sold out", operating rates ~95%), and it is why the scarcity layer should be read as a stress signal, not a
price forecast.

## 4. What the standard deviations do not cover

Precision is not accuracy. The LP moves board the cheapest way; the industry moves it on contracts, swaps,
history and machine fit. No public number sizes that gap. The average haul of ~550 miles is almost certainly
high against reality (a guess: 350–450), because real networks accept freight penalties to keep accounts and
machines matched. Integration comes out 5–7 points above the disclosed ~80% for the same reason. The
corrugator tier's counts are exact and its locations are statistical; its capacity depends on an OEE
assumption (55%) that could be ±10 points. Price points are from press, not a licensed series.

## 5. What would move each error bar

| Error | Today | With | Expected |
|---|---|---|---|
| National consumption | ±3–4% | AF&PA trade data (exports) | ±2% |
| State/division demand | ±25–35% / ±15–20% | Census CBP 322211 by county (free key) | ±10% / ±5% |
| County demand | ±50%+ | EPA FRS plant list + CBP | ±20% |
| Single mill capacity | ±10% legacy mills | AF&PA capacity survey | ±3% |
| Flows and haul | unknown bias | FBA regional shipments; a few real lane rates | bias measurable |
| Corrugator capacity | ±20% | widths/speeds from suppliers and job postings | ±10% |
| Prices | ±$20–50/t | Fastmarkets series | exact |
