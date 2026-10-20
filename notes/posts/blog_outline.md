# Blog piece: "The paper network" (launch post outline, in the house voice)

Working titles
- The paper network: every containerboard mill, and who they could ship to
- A commodity business that behaves like a relationship business, drawn from public data
- Where every ton of board goes

Lede (2–3 sentences)
A corrugated box starts as rolls of linerboard and medium from one of about sixty mills, and ends, ninety percent of the time, back in a bale. The industry runs on a map of mills, plants, freight and prices that everyone carries in their heads and nobody publishes. The inputs are public, so I built it: filings for supply, the Census for demand, diesel and distance for cost, the published index for price, and one min-cost flow to connect them.

Sections
1. What's public and what isn't (the mill table from 10-Ks and closure notices; the box-plant list from the EPA registry [N plants]; the Census county counts; the index points that reach the press; what stays behind paywalls: mill cash costs, contracts, RISI series, FBA regional shipments).
2. The model in one paragraph (transportation problem; two expansions: ownership copies of each market, liner/medium split nodes; HiGHS, 3 s; the duals as the product).
3. Six things it shows (switching gaps; a unilateral increase; West scarcity; the maintenance calendar; the knockouts; the fiber loop). One figure each, numbers from the dashboard.
4. The honest miss (2025 closures vs freight position; the surplus column; what cash cost would add).
5. How close it is (the calibration note condensed: 3–4% national, 1–5% by company, 25–35% by state before the plant layer, [after] with it; the Monte Carlo table).
6. Why publish it (asymmetry, buyers and independents, public-source rule, false precision as the real risk).
7. What's next and how to contribute (NEEDS.md, ROADMAP.md, the refresh calendar, "fix a row").

Figures to pull from the site
- Flows map, October 2026, light theme.
- Call sheet for one owner's +$70 shock.
- Knockout bars.
- Outage calendar, staggered vs assigned.
- The chain diagram from the Throughput tab.
- The proxy-vs-measured state table (after the plant layer).

Closing line
Treat it as a public draft of a map the industry already has in pieces. Every number carries its source; the ones that are wrong are the ones worth telling me about.
