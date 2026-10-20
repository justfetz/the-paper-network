# Roadmap

Ordered by how much each step changes the picture per hour of work.

1. **Real plant list.** EPA FRS (NAICS 322211) + Census CBP by county replaces the population proxy with ~1,100 located plants and county employment weights. Then the demand squares become plants, and sheet plants become a second tier fed by corrugator plants (same min-cost flow, one more layer).
2. **Mill-level grade and basis-weight detail.** Split each mill's capacity by machine and grade (kraft liner 26–69 lb, white-top, semichem medium 23–33 lb, recycled liner/medium), from AF&PA or company machine lists, so the liner/medium split per mill stops being a shared capacity.
3. **Lane-level freight.** Replace the two-line freight function with actual lanes: truck rates from DAT/Cass by region, rail from the tariffs, transload points, plus the EIA diesel feed.
4. **Price series.** Monthly Fastmarkets East and West liner, medium, recycled grades and regional OCC, so the delivered-cost map and the ECT/Mullen calculator run on the real curve and the price-shock scenarios use the actual announced increases.
5. **Downstream demand by industry.** County Business Patterns NAICS 311 (food), 312 (beverage), 325 (chemicals), 337 (furniture), 335 (appliances), 4541 (e-commerce fulfillment) employment → an end-use mix per county instead of a national share.
6. **Recovered fiber detail.** MRF locations (EPA, state lists), OCC export by port (Census trade data, HS 4707.10), recycled-mill fiber yield by mill → the fiber loop becomes a measured network.
7. **Time.** Quarterly re-runs (AF&PA quarterly, FBA monthly, 10-K annually) with a changelog; the maintenance calendar from company outage guidance.
8. **Corrugator-level supply.** Map each corrugator plant to its corrugator width (87/98/110 in) and speed → annual MSF capacity per plant → compare to demand → where the converting capacity is short or long.

Done so far: mills (90), county demand proxy (441 nodes), ownership-aware min-cost flow, 2024/2026 footprints, counterfactual, 12-month outage calendar + dual-priced calendar assignment, 20 knockouts, 5 unilateral price shocks, prospect gaps, diesel sensitivity, OCC loop, closure backtest.
