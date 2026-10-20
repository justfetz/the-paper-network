# LinkedIn drafts

Three versions. Numbers are from the October 2026 run; the ones in [brackets] get filled from the plant-layer build.
First two lines are what people see before "see more", so they carry the hook.

---

## A. The wake-up (recommended)

Half of the box markets in America can get their linerboard from a second mill for $5 a ton more in freight.
I built the map to prove it, from public filings, in a day, with an AI pair.

What's in it:
• Every containerboard mill in the US and Canada, 90 of them, with owner, grades and tonnage from the 10-Ks and the closure notices. The company totals land within 1–5% of what the companies report.
• Box demand in 441 markets, [N named box plants from the EPA facility registry], and the min-cost flows between mills and markets, solved as the transshipment problem from a graduate algorithms course.
• A unilateral $70/ton increase on the open market loses every third-party ton in the model. Increases hold because everyone announces together, and the index covers about 5% of consumption.
• A ton of capacity on the West Coast is worth $72 to the network; east of the Rockies, $27. That is the whole business case for the West Coast recycled mills.
• A maintenance calendar priced by the model's own shadow prices cuts the outage cost of the network from $269M to $122M a year, same outages, different months.
• Freight did not predict the 2025 closures. Regional surplus did. The missing variable is cash cost per mill, and it isn't public.
• 30 million tons of boxes come back as OCC; the model routes them to the recycled mills and the docks the same way.

What it does not do: name who ships to whom today, price a contract, or replace a RISI subscription. Every tab says where it is 3% off and where it is 35% off.

It's open. The repo, the data with per-row citations, and the method are at [link]. Tell me which number is wrong and I'll fix the row.

#corrugated #containerboard #packaging #supplychain #operationsresearch

---

## B. The engineer's version

Eleven years running corrugators taught me the industry runs on a map nobody shares. So I built it from what's public.

90 mills from the 10-Ks. 441 markets from the Census. Freight from distance and diesel. One linear program: minimize freight, respect every mill's capacity and every owner's integration, meet demand. HiGHS solves it in three seconds.

The duals do the talking. The capacity multiplier says what a ton of each mill is worth to the system ($72 in the West, $27 in the East). The demand multiplier says what the last ton costs delivered in every county. Run the twelve months of a maintenance calendar through it and the outage schedule becomes an assignment problem; the optimized calendar costs $122M a year against $269M for the one I drew by hand.

The honest part: the demand map is a Census-weighted proxy until the plant layer lands [update: N named plants from EPA now in], the flows are a cost-minimizer's answer rather than a record, and the 2025 closures were not where freight said they would be. All of that is written on the page next to the numbers.

Code MIT, data cited row by row: [link]. Built with Claude as the research and coding partner; every figure traces to a public page.

#operationsresearch #linearprogramming #corrugated #packaging #opendata

---

## C. The teaser (short)

I put the US containerboard business on one map: every mill, every market, the flows between them, what a ton of capacity is worth in each region, who would switch supplier for how much, and what comes back as recycled fiber.

All from public filings. Free, open, cited, and honest about its error bars.

[link]

Which number do you think is wrong?

---

## Notes for posting
- Lead with the image: the flows map (light theme, October 2026 footprint, open-market flows on) or the "will you switch" call sheet. A short screen recording of the knockout select is the strongest motion.
- Link target: GitHub Pages once enabled (justfetz.github.io/the-paper-network); until then the repo. The claude.ai artifact is private.
- Expect two kinds of replies: "that number is wrong" (good: it's the point; fix the row, credit them) and "you can't model relationships" (agree, and point to the open-market share and the error bars).
- Do not post the per-account call sheet with names until the plant layer has been checked against a second source.
