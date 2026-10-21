# LinkedIn drafts

Four versions: D is the swaggering one Jason asked for; A, B and C are quieter. Numbers are from the October 2026 run after the 21 October mill audit (audit/RECEIPTS.md), with the EPA plant layer and Census state employment in.
First two lines are what people see before "see more", so they carry the hook.

---

## D. The cocky one (as requested)

Have you seen me lately?

I put the entire US containerboard business on one map. Every mill. Every box market. Who ships to whom at minimum cost, what a ton of capacity is worth in every region, who would switch supplier for five bucks, which mill outage hurts most, and when to take your maintenance. From public data. In a week. With an AI pair and one linear program.

Do you know what I can do with this?

• 64 US mills from the 10-Ks, audited row by row: capacity within 2% of AF&PA, closures within 4% of the trade press count, IP and PCA matched to their own filings.
• 441 markets and 1,605 named box plants from the EPA registry, with Census employment setting the weights.
• A $2.1 billion freight bill, solved to the optimum in 1.9 seconds. Not approximated. Solved.
• 49% of markets can get liner from a second mill for under $5 a ton. The "relationship" is a five-dollar bill.
• Raise your open-market price $70 on your own and the model hands me your call sheet: 82 accounts, 534,000 tons, and the mill that takes each one.
• A ton of West Coast capacity is worth $49 to the network; east of the Rockies, $20. That is the whole business case for the recycled mills, from freight alone.
• My maintenance calendar costs the network $30M a year in outage effects. The hand-drawn one costs $180M.
• It talks. Ask it what happens if Monticello goes down ($98M a year, the costliest single outage) and it tells you, and shows you exactly which numbers it read.
• Every number has a receipt. One script checks each against AF&PA, Fastmarkets and the companies' own 10-Ks, and prints the misses next to the hits.

The honest part, because I'm cocky, not careless: it does not know who ships to whom today, it does not price a contract, and the 2025 closures were not where freight said they would be. Every tab prints its own error bars.

All of it is public. The repo, the data with a citation on every row, the method, the app, and a 5,000-word write-up of how it was built and how it refreshes itself every Monday.

hahahaha. That was an evil laugh.

Write-up: https://justfetz.github.io/posts/the-paper-network.html
The app: https://justfetz.github.io/the-paper-network/
The repo: https://github.com/justfetz/the-paper-network

#corrugated #containerboard #packaging #operationsresearch #supplychain #opendata

---

## A. The wake-up (the measured one)

Half of the box markets in America can get their linerboard from a second mill for $5 a ton more in freight.
I built the map to prove it, from public filings, in a day, with an AI pair.

What's in it:
• Every containerboard mill in the US and Canada, 87 of them, with owner, grades and tonnage from the 10-Ks and the closure notices, audited against AF&PA and the companies' own filings.
• Box demand in 441 markets, 1,605 named box-plant sites from the EPA facility registry, and the min-cost flows between mills and markets, solved as the transshipment problem from a graduate algorithms course.
• A unilateral $70/ton increase on the open market loses every third-party ton in the model. Increases hold because everyone announces together, and the index covers about 5% of consumption.
• A ton of capacity on the West Coast is worth $49 to the network; east of the Rockies, $20. That is the whole business case for the West Coast recycled mills.
• A maintenance calendar priced by the model's own shadow prices cuts the outage cost of the network from $180M to $30M a year, same outages, different months.
• Freight did not predict the 2025 closures. Regional surplus did. The missing variable is cash cost per mill, and it isn't public.
• 30 million tons of boxes come back as OCC; the model routes them to the recycled mills and the docks the same way.

What it does not do: name who ships to whom today, price a contract, or replace a RISI subscription. Every tab says where it is 3% off and where it is 35% off.

It's open. The repo, the data with per-row citations, and the method are at https://justfetz.github.io/posts/the-paper-network.html. Tell me which number is wrong and I'll fix the row.

#corrugated #containerboard #packaging #supplychain #operationsresearch

---

## B. The engineer's version

Eleven years running corrugators taught me the industry runs on a map nobody shares. So I built it from what's public.

87 mills from the 10-Ks. 441 markets from the Census. Freight from distance and diesel. One linear program: minimize freight, respect every mill's capacity and every owner's integration, meet demand. HiGHS solves it in three seconds.

The duals do the talking. The capacity multiplier says what a ton of each mill is worth to the system ($49 in the West, $20 in the East). The demand multiplier says what the last ton costs delivered in every county. Run the twelve months of a maintenance calendar through it and the outage schedule becomes an assignment problem; the optimized calendar costs $122M a year against $269M for the one I drew by hand.

The honest part: the demand map is a Census-weighted proxy until the plant layer lands update: 1,796 named plants from the EPA registry are now in, and Census employment sets the state weights, the flows are a cost-minimizer's answer rather than a record, and the 2025 closures were not where freight said they would be. All of that is written on the page next to the numbers.

Code MIT, data cited row by row: https://justfetz.github.io/posts/the-paper-network.html. Built with Claude as the research and coding partner; every figure traces to a public page.

#operationsresearch #linearprogramming #corrugated #packaging #opendata

---

## C. The teaser (short)

I put the US containerboard business on one map: every mill, every market, the flows between them, what a ton of capacity is worth in each region, who would switch supplier for how much, and what comes back as recycled fiber.

All from public filings. Free, open, cited, and honest about its error bars.

https://justfetz.github.io/posts/the-paper-network.html

Which number do you think is wrong?

---

## E. Reply when someone says the numbers look wrong

Which number? Every one of them has a receipt: https://github.com/justfetz/the-paper-network/blob/main/audit/RECEIPTS.md

Capacity lands within 2% of AF&PA. The 2025 closures in the model add to 4.03 Mt against Fastmarkets' 3.9. IP's and PCA's mills sum to their own 10-K totals, and Smurfit Westrock's come straight from its mill table. When the last audit found two missing mills, I added them, re-solved, and published what moved.

If you have a better figure for a row, send me the source and it's in the next refresh. That's the whole deal: public data, public math, public corrections.

---

## Notes for posting
- If someone says the numbers are wrong: send version E and ask which row. The receipts page lists every anchor, every changed row and the sensitivity table.
- Lead with the image: the flows map (light theme, October 2026 footprint, open-market flows on) or the "will you switch" call sheet. A short screen recording of the knockout select is the strongest motion.
- Link targets: the write-up at justfetz.github.io/posts/the-paper-network.html, the app at justfetz.github.io/the-paper-network (the refresh workflow now tries to enable Pages itself; if the deploy job shows a warning, enable Pages once under Settings, Pages, Source: GitHub Actions), the repo. The claude.ai copy with the chat is private until it is shared from its Share menu.
- Expect two kinds of replies: "that number is wrong" (good: it's the point; fix the row, credit them) and "you can't model relationships" (agree, and point to the open-market share and the error bars).
- Do not post the per-account call sheet with names until the plant layer has been checked against a second source.
