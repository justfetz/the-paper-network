/* The Paper Network dashboard, part 7: the guide. Per tab, a "How to use this view" card at the top of the side panel
   (what you see, how to read it, what each control and layer does, Try buttons that set the view up, questions to click
   into the chat); hover help on every control; an overview tour across the tabs and a short tour per tab; a one-time
   welcome on the first visit and a nudge the first time each tab opens (both remembered in localStorage); and, behind
   the Guide button in the header, an index of which view answers which question. It only reads the model and drives the
   controls that already exist. */
(function () {
  var D = window.PN_DATA, S = window.PN; if (!D || !S || !S.setTab || !window.d3) return;
  var side = document.getElementById("side"); if (!side) return;
  var LS = "pn-guide", BLOG = "https://justfetz.github.io/posts/the-paper-network.html", REPO = "https://github.com/justfetz/the-paper-network"; var RECEIPTS = REPO + "/blob/main/audit/RECEIPTS.md";
  function store() { try { return JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch (e) { return {}; } }
  function save(patch) { try { var s = store(); Object.keys(patch).forEach(function (k) { s[k] = patch[k]; }); localStorage.setItem(LS, JSON.stringify(s)); } catch (e) {} }
  var expanded = !store().collapsed, mode = "tab", kt = S.kt, musd = S.musd, esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
  var topKo = D.knockouts.slice().sort(function (a, b) { return b.d_total - a.d_total; })[0], shockOwner = Object.keys(D.price_shocks || {})[0] || "International Paper";

  /* ---------- driving the existing controls ---------- */
  function q(sel) { return document.querySelector(sel); }
  function click(sel) { var el = q(sel); if (el) el.click(); return !!el; }
  function pressed(sel) { var el = q(sel); return !!el && el.getAttribute("aria-pressed") === "true"; }
  function setLayer(sel, on) { if (q(sel) && pressed(sel) !== on) click(sel); }
  function setSelect(sel, value) { var el = q(sel); if (!el) return; el.value = value; el.dispatchEvent(new Event("change", { bubbles: true })); }
  function setInput(sel, value) { var el = q(sel); if (!el) return; el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); }
  function scen(key) { if (!D.scenarios[key]) return; if (S.setScenario) S.setScenario(key); else S.scen = key; S.render(); }
  function see(sel) { var el = q(sel); if (el && !el.hidden) el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  function namedAvailable() { var b = document.getElementById("named-toggle"); return !!b && !b.hidden; }
  function named(on) { if (namedAvailable()) setLayer("#named-toggle", on); }
  function ask(question) {   // open the drawer, wait for it to connect, then send; if it never connects, leave the question in the box
    if (!S.chat) return; S.chat.open(true); var tries = 0;
    (function tick() { var st = S.chat.state(); if (st.ready && !st.offline) return S.chat.ask(question); if (++tries < 16 && !st.offline) return setTimeout(tick, 200); var ta = q(".chat textarea"); if (ta) { ta.value = question; ta.focus(); } })();
  }

  /* ---------- what each control does (hover help) ---------- */
  var HELP = {
    "#scen [data-scen=fp2024]": "The mills and demand of the end of 2024", "#scen [data-scen=fp2026]": "Today's footprint: the closures and openings through October 2026", "#scen [data-scen=cf2026]": "2026 mills on 2024 demand, to separate what supply changed from what demand changed",
    "#month": "Planned maintenance outages by month; the network is re-solved around the mills that are down", "#ko": "Remove one mill and re-solve; the KPIs show the extra cost against October 2026", "#minflow": "Hide lines thinner than this to see the big lanes",
    "#layers [data-layer=flows]": "Lines inside one company's system: its mills feeding its own box plants", "#layers [data-layer=market]": "Board sold to other companies' plants, at the model's $150/t open-market premium", "#layers [data-layer=exports]": "Board leaving through the export docks (dashed lines to the triangles)", "#layers [data-layer=demand]": "Box markets as squares sized by board demand",
    "#layers [data-layer=shadow]": "Recolor mills by scarcity value: what one more ton of capacity would save the network. Dark is tight, $0 is slack", "#layers [data-layer=mc]": "Recolor markets by delivered marginal cost: what the next ton costs to reach",
    "#corr-layers [data-clayer=util]": "Markets with corrugators colored by load on corrugator capacity, 50% to 100%", "#corr-layers [data-clayer=sheets]": "Sheets moving from feeders to the markets that have no machine of their own", "#corr-layers [data-clayer=value]": "Markets colored by the freight in the marginal sheet, $/MSF",
    "[data-basis=day]": "Rates per calendar day", "[data-basis=year]": "Totals per year", "#piece": "Which part of the chain to list: mills, corrugator markets, sheet buyers, docks, recycled mills or whole systems",
    "[data-grade=L]": "Cheapest-mill table for linerboard", "[data-grade=M]": "Cheapest-mill table for corrugating medium", "#shock": "Raise one producer's open-market price $70/t and re-solve: who moves, where to, what it costs",
    "[data-spec=ect32]": "32 ECT board, 35-26-35 basis weights", "[data-spec=mullen200]": "200# Mullen board, 42-26-42 basis weights", "#p-liner": "Linerboard price at the mill, $/t; the published index by default", "#p-medium": "Medium price at the mill, $/t", "#diesel": "Freight re-solved at this diesel price", "#p-hike": "An announced mill increase, $/t, translated into $/MSF of board",
    "#fiber-layers [data-flayer=flows]": "OCC moving from the counties where boxes were used to recycled mills and export docks", "#fiber-layers [data-flayer=value]": "Counties colored by what one more ton of OCC is worth there",
    "[data-dlayer=demand]": "Markets colored by tons of board demanded a year", "[data-dlayer=plants]": "Markets as the number of box plants the demand implies", "#named-toggle": "One dot per EPA-registered box plant, exactly as registered; color only after the verification pass", "#named-search": "Search the registered name, city, state or a verified owner",
    "[data-cal=m]": "The maintenance calendar as drawn: outages staggered through the year", "[data-cal=o]": "A calendar from the assignment problem: the same outages, moved to the months that cost least"
  };
  Object.keys(HELP).forEach(function (sel) { document.querySelectorAll(sel).forEach(function (el) { if (!el.title) el.title = HELP[sel]; }); });

  /* ---------- the per-tab guide ---------- */
  var n_mills = D.facts.n_us_open, n_nodes = D.nodes.length;
  var GUIDE = {
    flows: { name: "Flows", what: "The whole network in one scenario: " + n_mills + " US containerboard mills, " + n_nodes + " box markets, and the cheapest way the solver found to move the board between them.",
      read: ["Circles are mills, sized by capacity and colored by owner (the chips under the map; click one to isolate that owner). A dashed hollow circle is a mill that is closed, or knocked out in this scenario.",
        "Squares are box markets, sized by board demand. Lines are flows: a colored line stays inside one company's system, a gray line is an open-market sale, a dashed line goes to an export dock (the triangles).",
        "Hover a mill for its utilization, scarcity value and where its tons go; hover a market for its demand, delivered marginal cost and suppliers.",
        "Click a mill, a market or any dotted figure to see where the number comes from: the filing or report, the method, and how sure it is."],
      controls: [["Scenario", "End of 2024, October 2026, or 2026 mills on 2024 demand. Every number on the page follows the scenario."], ["Maintenance calendar", "Twelve months of planned outages. The mills down that month hollow out and the network re-routes around them."], ["Knock out a mill", "Remove one mill and re-solve. The KPIs show the extra cost per year against October 2026."],
        ["Layers", "Own-system flows, open-market flows, exports and demand points switch on and off. Mills by scarcity value recolors mills by what one more ton of capacity is worth to the network (dark is tight). Demand by delivered cost recolors markets by what the marginal ton costs to reach."], ["Min flow", "Hides lines thinner than the slider, to see the big lanes."],
        ["Below the map", "Tons by haul distance band, the integration table (the model's own-plant share against what each company discloses), the planned-outage months and what each costs, and the knockout chart: click a bar to see the re-routed map."]],
      tries: [["Knock out " + topKo.name + " (+" + musd(topKo.d_total) + "/yr)", function () { scen("ko" + topKo.mill); see("#kpis"); }], ["Mills by scarcity value", function () { setLayer("#layers [data-layer=shadow]", true); see("#mapcard"); }], ["Demand by delivered cost", function () { setLayer("#layers [data-layer=mc]", true); see("#mapcard"); }], ["Show exports", function () { setLayer("#layers [data-layer=exports]", true); see("#mapcard"); }],
        ["Reset to October 2026", function () { scen("fp2026"); setLayer("#layers [data-layer=shadow]", false); setLayer("#layers [data-layer=mc]", false); setLayer("#layers [data-layer=exports]", false); }]],
      asks: ["Who supplies Chicago, and who could?", "What does it cost the network per year if " + topKo.name + " goes down?", "Which mills have the highest scarcity value?"],
      caveat: "The flows are the solver's cheapest answer, not a record of who ships to whom. Contracts, order books and cash costs are not public and are not in here." },
    corr: { name: "Corrugators", what: "The middle tier: the corrugator plants that turn rolls into board, the sheet feeders that sell board as sheets, and the sheet plants that buy them.",
      read: ["Sharp-cornered squares are markets with corrugators, sized by corrugator capacity. Small rounded squares are markets with only sheet plants.", "Markets by corrugator load colors them from 50% to 100% loaded. Sheet flows are the gray lines from feeders to the markets that import sheets. Markets by sheet value colors them by the freight in the marginal sheet, $/MSF.", "Hover a market for its expected plants, capacity, load, and the sheets it buys or sells."],
      controls: [["Markets by corrugator load", "How much of the local corrugator capacity the local demand uses."], ["Sheet flows", "Where sheets travel when a market has more board demand than machine."], ["Markets by sheet value", "What it costs to get the marginal sheet into each market."], ["Where corrugator hours are worth most", "The list ranks markets by the value of one more corrugator hour."], ["Calculator below", "Width, speed, hours, OEE and trim turn into tons and MSF a year. Change them and the width-class table follows."]],
      tries: [["Markets by sheet value", function () { setLayer("#corr-layers [data-clayer=value]", true); see("#mapcard"); }], ["Only the sheet flows", function () { setLayer("#corr-layers [data-clayer=util]", false); setLayer("#corr-layers [data-clayer=value]", false); setLayer("#corr-layers [data-clayer=sheets]", true); see("#mapcard"); }], ["Open the corrugator calculator", function () { see("#kpis-calc"); }]],
      asks: ["What does the model say about Cook County, IL?", "Which markets are tightest on corrugator capacity?"],
      caveat: "Plant counts per market are expected values from the EPA registry and Census counts, not a roster of named machines. Capacities are width × speed × hours × OEE at the settings in the calculator." },
    thru: { name: "Throughput", what: "The same network read as rates: tons a day out of each mill, truckloads and railcars on the lanes, MSF a day through each market's corrugators, sheets to the sheet plants, OCC back to the recycled mills and the docks.",
      read: ["Markets are colored by board consumed, per day or per year. Hover a mill for tons, truckloads and railcars; hover a market for board in, board made and boxes out.", "The chain chart below walks one day of board end to end; hover a band for its number."],
      controls: [["Basis", "Per calendar day or per year."], ["Pieces", "Which part of the chain to list: mills, corrugator markets, markets buying sheets, export docks, recycled mills, or owners as whole systems."], ["Loads on the move", "Truckloads and railcars per day by lane type."], ["Conversions used", "Tons per truckload and railcar, pounds per MSF, waste and recovery rates. Every rate on this tab comes from these."]],
      tries: [["Per year", function () { click("[data-basis=year]"); }], ["List the export docks", function () { setSelect("#piece", "docks"); see("#thru-list"); }], ["Owners as systems", function () { setSelect("#piece", "owners"); see("#thru-list"); }], ["Walk one day of board", function () { see("#chain"); }]],
      asks: ["How much does the Counce mill ship in a year, and to where?", "What is the total freight bill of the network?"],
      caveat: "The rates are the yearly solve divided by days, with the conversions in the table. Change a conversion and every rate changes; none of them is a count of actual trucks." },
    prospects: { name: "Will you switch?", what: "Contestability: for every market, the cheapest mill by delivered freight and the one behind it. The gap between them is the price of loyalty.",
      read: ["Markets are colored by the gap to the second-cheapest mill: dark is $0, a phone call; light is $25 or more, sticky. Squares are sized by open-market tons.", "With a price shock on, the markets that switch turn red, the lines show where their tons go, and the shocked producer's mills dim.", "Hover a market for the three cheapest mills, the solver's current supplier, and what switches after an increase."],
      controls: [["Grade", "Linerboard and medium have separate cheapest-mill tables."], ["Shock", "Pick a producer: its open-market price rises $70/t and the network is re-solved."], ["Call sheet", "The most contestable open-market board, or, with a shock on, who the producer loses and to whom."], ["Below the map", "The shock table for every producer, the distribution of the gap, and open-market tons by owner."]],
      tries: [["Shock " + shockOwner + " +$70/t", function () { setSelect("#shock", shockOwner); see("#calls"); }], ["Medium instead of liner", function () { click("[data-grade=M]"); }], ["Clear the shock", function () { setSelect("#shock", ""); }]],
      asks: ["If " + shockOwner + " raises its open-market price by $70 a ton, how many open-market tons does the model say it loses?", "What is the switching gap in Dallas?"],
      caveat: "Open-market tons are the ones that can move; integrated tons stay with their own mills by construction. Real increases hold because producers announce them together; this shows what one producer alone would face." },
    prices: { name: "Prices & delivered cost", what: "What a thousand square feet of combined board costs delivered in every market: mill prices from the published index, freight from the flow model, diesel from the EIA.",
      read: ["Markets are colored by delivered paper cost per MSF, light cheap to dark dear. Hover a market for paper at the mill plus freight, and the freight share.", "Mills are drawn for orientation only on this tab."],
      controls: [["Spec", "32 ECT or 200# Mullen: different basis weights, the same math."], ["Liner and Medium $/t", "Type your own mill prices; the index print is the default."], ["Diesel", "Freight re-solved at three diesel prices."], ["Increase", "What an announced $/t mill increase adds per MSF, and what share of delivered cost that is."], ["Below the map", "The published price series, the Mullen-to-ECT table in board weight, and the diesel table for the whole freight bill."]],
      tries: [["Diesel at $5.00", function () { setSelect("#diesel", "5.0"); see("#kpis-price"); }], ["200# Mullen", function () { click("[data-spec=mullen200]"); }], ["A $100/t increase", function () { setInput("#p-hike", 100); see("#kpis-price"); }], ["The published series", function () { see("#price-charts"); }]],
      asks: ["What is the freight bill if diesel is $6.20 a gallon?", "What is the delivered marginal cost of board in Phoenix?"],
      caveat: "Index prices are the public print, not transaction prices. The map shows the paper cost of the board, not the box price, and no converting cost." },
    fiber: { name: "Fiber loop", what: "The loop closed: recovered corrugated flows from where the boxes were used to the recycled mills and export docks that want it. Same network, run backwards.",
      read: ["Squares are counties sized by OCC recovered; Counties by fiber value colors them by what one more ton is worth there.", "Gray lines are OCC flows. Mills are sized by their OCC intake (virgin-fiber mills dim); triangles are export docks. Hover anything."],
      controls: [["OCC flows", "The lines from counties to mills and docks."], ["Counties by fiber value", "The dual on each county's supply: what the network would pay for one more ton collected there."], ["Recycled mills by fiber intake", "The list ranks mills by OCC in and average haul."], ["The loop in numbers", "Recovered, to mills, exported, and the tons that find no taker at today's mill appetite."]],
      tries: [["Value map only", function () { setLayer("#fiber-layers [data-flayer=flows]", false); setLayer("#fiber-layers [data-flayer=value]", true); see("#mapcard"); }], ["Flows only", function () { setLayer("#fiber-layers [data-flayer=flows]", true); setLayer("#fiber-layers [data-flayer=value]", false); see("#mapcard"); }], ["The loop in numbers", function () { see("#fiber-table"); }]],
      asks: [],
      caveat: "Recovery rates per county are national rates applied to local box use, and the export-dock shares are assumed. Where more OCC is collected than the mills want, the surplus shows as 'no taker'." },
    demand: { name: "Demand", what: "Where the boxes are made. Census employment sets each state's share of board demand, the EPA plant registry places it within the state, and the plants themselves are on the map by name, exactly as registered.",
      read: ["Markets are colored by tons of board demanded a year, or shown as the plants that demand implies.", "Named plants: one dot per EPA site. Green is verified operating, red verified closed, gray not yet checked. Nothing about a plant is inferred: owner, type and status appear only after the verification pass, with a source link."],
      controls: [["Color", "Tons of board, plants implied, or the named EPA plants."], ["Search", "Registered name, city, state, or a verified owner."], ["Largest markets", "Board, corrugator-equivalents and facilities per market."], ["Below the map", "The named-plant table, the population proxy against the measured distribution by state, and demand by Census division and end use."]],
      tries: [["Show the named plants", function () { named(true); see("#named-card"); }], ["Search 'Schwarz'", function () { named(true); setInput("#named-search", "Schwarz"); see("#named-card"); }], ["Plants implied", function () { click("[data-dlayer=plants]"); see("#mapcard"); }]],
      asks: ["List the EPA box plants in Alabama", "Which plants are registered under Corrugated Supplies?"],
      caveat: "The EPA list is a superset: it keeps closed plants and has no owner or status field, so it is larger than the FBA and Census counts. Read an unverified row as 'registered', not 'operating'." },
    backtest: { name: "Backtest", what: "Does the model match the record? Capacity, shipments, integration and operating rates against the filings and the AF&PA survey, and an honest look at the 2025 closures.",
      read: ["The map shows the 2024 network with the mills that closed in 2025 and 2026 in red.", "The table compares model and record line by line; the error bars come from fourteen Monte Carlo draws on the inputs."],
      controls: [["Model vs record", "Each row names the source it is checked against."], ["Did freight position predict the closures?", "It did not: the closed mills were all loaded. The surplus column does better, and the table shows both."]],
      tries: [["The closures table", function () { see("#closure-table"); }], ["Error bars", function () { see("#errorbars"); }], ["Open the receipts", function () { window.open(RECEIPTS, "_blank", "noopener"); }]],
      asks: ["How many tons does the October 2026 scenario ship, and how much is unmet?"],
      caveat: "Capacity, closures and production land within a few percent of AF&PA, Fastmarkets and the companies' own 10-Ks; the receipts list every anchor and every row the last audit changed. The closures are the miss, shown rather than hidden." },
    method: { name: "Method & data", what: "How it is built: one min-cost flow, expanded for ownership and grade; public data in, one JSON out; every assumption and source on this page.",
      read: ["The model section states the objective and the constraints. The sources list has a citation per anchor. The needs list is what the next version requires."],
      controls: [["The write-up", "The long version, with the algorithm, the data sources, the cleaning, the evals and the refresh clock."], ["The repository", "Code, data and the per-row citations, MIT licensed."]],
      tries: [["Open the receipts", function () { window.open(RECEIPTS, "_blank", "noopener"); }], ["Open the write-up", function () { window.open(BLOG, "_blank", "noopener"); }], ["Open the repository", function () { window.open(REPO, "_blank", "noopener"); }]],
      asks: ["What scenarios does this page have?"],
      caveat: "If a number on another tab looks wrong, this is where to see what it was built from. Then open an issue with a source, or a pull request against the row." }
  };

  /* ---------- which view answers which question ---------- */
  var INDEX = [
    ["Who supplies a market, and at what delivered cost?", "Flows · hover the market", function () { S.setTab("flows"); see("#mapcard"); }],
    ["What happens if a mill goes down?", "Flows · Knock out a mill", function () { S.setTab("flows"); scen("ko" + topKo.mill); see("#kpis"); }],
    ["Where is capacity tightest?", "Flows · Mills by scarcity value", function () { S.setTab("flows"); setLayer("#layers [data-layer=shadow]", true); see("#mapcard"); }],
    ["Which accounts could switch supplier, and where could I win one?", "Will you switch? · the call sheet", function () { S.setTab("prospects"); see("#calls"); }],
    ["What does one producer's price increase do?", "Will you switch? · Shock", function () { S.setTab("prospects"); setSelect("#shock", shockOwner); see("#calls"); }],
    ["What does board cost delivered, by market?", "Prices & delivered cost", function () { S.setTab("prices"); see("#mapcard"); }],
    ["How loaded are the corrugators, and who buys sheets?", "Corrugators", function () { S.setTab("corr"); see("#mapcard"); }],
    ["How many trucks and railcars a day?", "Throughput", function () { S.setTab("thru"); see("#kpis-thru"); }],
    ["Where does the OCC go, and what is it worth?", "Fiber loop", function () { S.setTab("fiber"); see("#mapcard"); }],
    ["Where are the box plants, and is this one still running?", "Demand · Named plants", function () { S.setTab("demand"); named(true); see("#named-card"); }],
    ["How much should I trust this?", "Backtest, then the receipts", function () { S.setTab("backtest"); see("#bt-table"); }],
    ["Where does a number come from?", "Click it: mills, markets, plants and figures", function () { if (S.sources) S.sources.intro(); }],
    ["Just ask, in words", "Ask the network", function () { if (S.chat) S.chat.open(true); }]
  ];

  /* ---------- the card ---------- */
  var card = document.createElement("section"); card.className = "card guide"; card.id = "guide"; card.setAttribute("aria-label", "How to use this view"); side.insertBefore(card, side.firstChild);
  var btnTop = document.getElementById("guide-btn"), lastTab = null;
  function render() {
    var g = GUIDE[S.tab] || GUIDE.flows, h = "";
    card.classList.toggle("slim", !expanded); if (btnTop) btnTop.setAttribute("aria-expanded", expanded ? "true" : "false");
    h += "<div class='ghead'><h2>" + (mode === "index" ? "Which view answers what" : "How to use · " + esc(g.name)) + "</h2><div class='gbtns'>";
    if (expanded) h += (mode === "index" ? "<button type='button' data-g='tour'>Overview tour</button>" : "<button type='button' data-g='tourtab'>Tour this view</button>") + "<button type='button' data-g='" + (mode === "index" ? "tab" : "index") + "'>" + (mode === "index" ? "This view" : "All views") + "</button><button type='button' data-g='hide' aria-label='Hide the guide'>Hide</button>";
    else h += "<button type='button' data-g='show'>Show</button><button type='button' data-g='tourtab'>Tour this view</button>";
    h += "</div></div>";
    if (expanded && mode === "index") {
      h += "<div class='gbody'><p class='gwhat'>Every tab is a view of the same solved network. Pick the question; the page sets itself up. New here? The overview tour walks the five views that matter most in two minutes.</p><ul class='gindex'>" + INDEX.map(function (r, i) { return "<li><button type='button' data-jump='" + i + "'>" + esc(r[0]) + "</button><span>" + esc(r[1]) + "</span></li>"; }).join("") + "</ul>" +
        "<h3>Words that recur</h3><dl class='gdl'><dt>Delivered marginal cost</dt><dd>The model's price of one more ton delivered to a market: freight plus any premium on the cheapest route left. Not a market price.</dd><dt>Scarcity value</dt><dd>What one more ton of a mill's capacity would save the network. $0 means the mill has slack.</dd><dt>Own-system vs open-market</dt><dd>A company's mill feeding its own plants, or selling to someone else's at the model's $150/t premium.</dd><dt>Unmet demand</dt><dd>Tons no mill can reach in the scenario, charged at $400/t.</dd><dt>Gap</dt><dd>Freight difference between a market's cheapest mill and its second cheapest: the price of loyalty.</dd><dt>MSF, ECT, Mullen</dt><dd>A thousand square feet of board; a box spec by edge crush; a box spec by burst strength.</dd><dt>OCC</dt><dd>Old corrugated containers, the recovered fiber.</dd></dl></div>";
    } else if (expanded) {
      h += "<div class='gbody'><p class='gwhat'>" + esc(g.what) + "</p><h3>How to read it</h3><ul>" + g.read.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>";
      h += "<h3>Controls on this tab</h3><dl class='gdl'>" + g.controls.map(function (c) { return "<dt>" + esc(c[0]) + "</dt><dd>" + esc(c[1]) + "</dd>"; }).join("") + "</dl>";
      if (g.tries.length) h += "<h3>Try</h3><div class='gtry'>" + g.tries.map(function (t, i) { return "<button type='button' data-try='" + i + "'>" + esc(t[0]) + "</button>"; }).join("") + "</div>";
      if (g.asks.length && S.chat) h += "<h3>Ask the network</h3><div class='gask'>" + g.asks.map(function (a, i) { return "<button type='button' data-ask='" + i + "'>" + esc(a) + "</button>"; }).join("") + "</div>";
      h += "<p class='note'>" + esc(g.caveat) + "</p></div>";
    }
    card.innerHTML = h; lastTab = S.tab;
  }
  card.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return; var g = GUIDE[S.tab] || GUIDE.flows;
    if (b.dataset.g === "hide") { expanded = false; save({ collapsed: true }); render(); }
    else if (b.dataset.g === "show") { expanded = true; mode = "tab"; save({ collapsed: false }); render(); }
    else if (b.dataset.g === "index") { mode = "index"; render(); }
    else if (b.dataset.g === "tab") { mode = "tab"; render(); }
    else if (b.dataset.g === "tour") tourStart();
    else if (b.dataset.g === "tourtab") tourStart(S.tab);
    else if (b.dataset.try != null) { try { g.tries[+b.dataset.try][1](); } catch (e) {} }
    else if (b.dataset.ask != null) ask(g.asks[+b.dataset.ask]);
    else if (b.dataset.jump != null) { mode = "tab"; try { INDEX[+b.dataset.jump][2](); } catch (e) {} render(); }
  });
  if (btnTop) btnTop.addEventListener("click", function () { if (expanded && mode === "index") { expanded = false; save({ collapsed: true }); } else { expanded = true; mode = "index"; save({ collapsed: false }); } render(); if (expanded) see("#guide"); });
  var render0 = S.render; S.render = function () { render0(); if (S.tab !== lastTab) { var first = lastTab === null; if (mode === "index" && !first) mode = "tab"; render(); if (!first) maybeNudge(S.tab); } };

  /* ---------- the tours: one overview across the tabs, and a short one per tab ---------- */
  var OVERVIEW = [
    { tab: "flows", target: "#mapcard", title: "The map", text: "Circles are mills, sized by capacity and colored by owner. Squares are box markets, sized by demand. The lines are the solver's cheapest routing: colored inside one company's system, gray on the open market, dashed to the export docks. Hover anything for its numbers." },
    { tab: "flows", target: "#ko", title: "One scenario at a time", prep: function () { scen("ko" + topKo.mill); }, undo: function () { scen("fp2026"); },
      text: "Every number on the page belongs to the scenario chosen here. This is the network with " + topKo.name + ", its costliest single mill, knocked out: the lines redraw from a fresh solve and the KPIs below show the extra cost against October 2026. The buttons above switch footprints; the calendar runs the maintenance months." },
    { tab: "flows", target: "#kpis", title: "Read the bill", text: "Network cost, freight, average haul, rail share and unmet demand, each with its change against October 2026. Unmet demand turns orange when the network cannot serve every ton." },
    { tab: "flows", target: "#layers", title: "Layers", prep: function () { this.was = pressed("#layers [data-layer=shadow]"); setLayer("#layers [data-layer=shadow]", true); }, undo: function () { setLayer("#layers [data-layer=shadow]", !!this.was); },
      text: "Own-system flows, open-market flows, exports and demand points switch on and off. Mills by scarcity value, on now, recolors mills by what one more ton of capacity is worth: dark is tight, pale is slack. Demand by delivered cost does the same for markets." },
    { tab: "prospects", target: "#panel-prospects", title: "Will you switch?", text: "For every market, the cheapest mill by delivered freight and the next one. Dark markets are a phone call away from a second supplier. Pick a producer under Shock to raise its open-market price $70 and read the call sheet of who moves, and to whom." },
    { tab: "prices", target: "#panel-prices", title: "Delivered cost", text: "Mill prices from the index, freight from the model, diesel from the EIA: the map prices a thousand square feet of board delivered in every market. Type your own prices, switch between an ECT and a Mullen spec, change the diesel." },
    { tab: "demand", target: "#panel-demand", title: "The plants, as registered", prep: function () { this.was = pressed("#named-toggle"); named(true); }, undo: function () { named(!!this.was); },
      text: "EPA's box-plant list, one dot per site, shown exactly as registered. Green is verified operating, red verified closed, gray not yet checked; nothing is inferred. Search by name, city, state or a verified owner." },
    { tab: "backtest", target: "#panel-backtest", title: "The honest miss", text: "Model against the record: capacity and shipments reconcile with the filings; the 2025 closures were not where freight said they would be, and the page shows it rather than hiding it. Method & data, next door, has every assumption and source." },
    { tab: "flows", target: ".chat-fab", title: "Ask the network", text: "Ask in words. The chat answers only from the page's own functions and lists every lookup under its answer, with the raw numbers one click away. An answer with no lookup behind it is flagged. That is the end of the tour; each tab has its own short tour under How to use, and the Guide button in the header brings everything back." }
  ];
  var TOURS = {
    flows: [
      { tab: "flows", target: "#mapcard", title: "What you are looking at", text: "The whole network in one scenario. Circles are mills, sized by capacity and colored by owner; squares are box markets, sized by demand; lines are the cheapest routing the solver found. Hover anything for its numbers, click anything for its source." },
      { tab: "flows", target: "#scen", title: "Pick a scenario", text: "Every number on the page follows the scenario chosen here: end of 2024, October 2026, or 2026 mills on 2024 demand. The two menus below run a maintenance month or knock out one mill and re-solve." },
      { tab: "flows", target: "#layers", title: "Turn layers on and off", prep: function () { this.was = pressed("#layers [data-layer=shadow]"); setLayer("#layers [data-layer=shadow]", true); }, undo: function () { setLayer("#layers [data-layer=shadow]", !!this.was); },
        text: "Own-system flows, open-market flows, exports and demand points. Mills by scarcity value is on now: dark mills are the tight ones, where one more ton of capacity is worth most." },
      { tab: "flows", target: "#kpis", title: "Read the bill", text: "Network cost, freight, average haul, rail share and unmet demand, each with its change against October 2026. Below the map: haul distance, integration against what each company discloses, the outage calendar and the knockout chart." }
    ],
    corr: [
      { tab: "corr", target: "#mapcard", title: "The middle tier", text: "Sharp-cornered squares are markets with corrugators, sized by machine capacity. Small rounded squares have only sheet plants and buy their board as sheets. Hover a market for its load, its sheet trade and the value of one more machine hour." },
      { tab: "corr", target: "#corr-layers", title: "Three ways to color it", prep: function () { this.was = pressed("#corr-layers [data-clayer=value]"); setLayer("#corr-layers [data-clayer=value]", true); }, undo: function () { setLayer("#corr-layers [data-clayer=value]", !!this.was); },
        text: "Load on corrugator capacity, the sheet flows from feeders to the markets that import, and, on now, the freight carried in the marginal sheet in dollars per thousand square feet." },
      { tab: "corr", target: "#detail-corr .card", title: "One corrugator, in numbers", text: "Width, speed, hours and OEE make a machine's yearly capacity; the calculator below the map prices sheets against converting. Change a setting and every market's load changes with it." },
      { tab: "corr", target: "#corr-rank", title: "Where hours are worth most", text: "The list ranks markets by the value of one more corrugator hour. That is the model's answer to where a machine would pay back fastest; the caveat under How to use says what it is not." }
    ],
    thru: [
      { tab: "thru", target: "#kpis-thru", title: "The same network as rates", text: "Tons a day out of the mills, truckloads and railcars on the lanes, thousand square feet a day through the corrugators, sheets to the sheet plants, OCC back to the recycled mills." },
      { tab: "thru", target: "#piece", title: "Choose the basis and the piece", text: "Per calendar day or per year, then which part of the chain to list: mills, corrugator markets, sheet buyers, docks, recycled mills, or whole owner systems. The map recolors to match." },
      { tab: "thru", target: "#chain", title: "Walk one day of board", text: "The chain chart follows a single day end to end. Hover a band for its number. Every rate uses the conversions in the table below it; change a conversion and every rate changes." }
    ],
    prospects: [
      { tab: "prospects", target: "#mapcard", title: "The price of loyalty", text: "Every market is colored by the gap between its cheapest mill and the next one. Dark is a few dollars a ton, a phone call; light is $25 or more, sticky. Squares are sized by open-market tons." },
      { tab: "prospects", target: "#shock", title: "Raise one producer's price", prep: function () { this.was = (q("#shock") || {}).value || ""; setSelect("#shock", shockOwner); }, undo: function () { setSelect("#shock", this.was || ""); },
        text: shockOwner + " has just raised its open-market price $70 a ton and the network re-solved. The markets that switch turn red, the lines show where their tons go, and the producer's mills dim." },
      { tab: "prospects", target: "#calls", title: "The call sheet", text: "With no shock, the most contestable open-market board. With a shock on, who the producer loses and to whom. Grade switches between linerboard and medium; the tables below the map show every producer." }
    ],
    prices: [
      { tab: "prices", target: "#mapcard", title: "Board, delivered", text: "Every market is colored by the paper cost of a thousand square feet of combined board delivered there: mill prices from the published index, freight from the flow model, diesel from the EIA. Hover for the split." },
      { tab: "prices", target: "#diesel", title: "Your numbers, not ours", prep: function () { this.was = (q("#diesel") || {}).value || "3.75"; setSelect("#diesel", "5.0"); }, undo: function () { setSelect("#diesel", this.was || "3.75"); },
        text: "Type your own liner and medium prices, switch between a 32 ECT and a 200# Mullen spec, change the diesel. Diesel is at $5.00 now; the KPIs below show what it did to the freight bill." },
      { tab: "prices", target: "#kpis-price", title: "An increase, in board terms", text: "The Increase box turns an announced dollars-per-ton mill increase into dollars per thousand square feet, and shows what share of delivered cost that is. The published price series sits below the map." }
    ],
    fiber: [
      { tab: "fiber", target: "#mapcard", title: "The boxes come back", text: "The same network run backwards. Squares are counties sized by recovered corrugated; gray lines carry it to the recycled mills and the export docks; virgin-fiber mills dim." },
      { tab: "fiber", target: "#fiber-layers", title: "Flows, or what a ton is worth", text: "OCC flows draws the lines. Counties by fiber value colors each county by what the network would pay for one more ton collected there, the dual on its supply." },
      { tab: "fiber", target: "#fiber-table", title: "The loop in numbers", text: "Recovered, to mills, exported, and the tons that find no taker at today's mill appetite. Recovery rates are national rates applied to local box use; the caveat under How to use says so." }
    ],
    demand: [
      { tab: "demand", target: "#mapcard", title: "Where the boxes are made", text: "Markets colored by tons of board demanded a year, or shown as the number of plants that demand implies. Census employment sets each state's share; the EPA registry places it within the state." },
      { tab: "demand", target: "#named-toggle", title: "The plants, by name", prep: function () { this.was = pressed("#named-toggle"); named(true); }, undo: function () { named(!!this.was); },
        text: "One dot per EPA-registered box plant, exactly as registered. Green is verified operating, red verified closed, gray not yet checked. Nothing about a plant is inferred; owner, type and status appear only after the verification pass, with a source." },
      { tab: "demand", target: "#enduse-chart", title: "Who uses the boxes", text: "Below the map: the named-plant table with search, the population proxy against the measured distribution by state, and demand by Census division and end use." }
    ],
    backtest: [
      { tab: "backtest", target: "#kpis-bt", title: "Does the model match the record?", text: "Capacity, shipments, integration and operating rates against the filings and the AF&PA survey. The map shows the 2024 network with the mills that closed in 2025 and 2026 in red." },
      { tab: "backtest", target: "#bt-table", title: "Line by line", text: "Each row names the source it is checked against; the error bars come from fourteen Monte Carlo draws on the inputs. The receipts file in the repository lists every anchor and every row the last audit changed." },
      { tab: "backtest", target: "#closure-table", title: "The honest miss", text: "Freight position did not predict the 2025 closures: the closed mills were all loaded. The surplus column does better, and the table shows both rather than hiding the miss." }
    ],
    method: [
      { tab: "method", target: "#panel-method", title: "Read me first", text: "Every mill comes from a filing, a press release or a closure notice; every demand square is a statistical stand-in; the flows are a solver's answer to the cheapest routing, not a record of shipments." },
      { tab: "method", target: "#detail-method .card", title: "The model", text: "One min-cost flow, expanded for ownership and grade. The objective and the constraints are stated here in full, with the sources list and the per-anchor citations beside it." },
      { tab: "method", target: "#detail-method .card:last-child", title: "What the next version needs", text: "The open list. If a number elsewhere looks wrong, this tab shows what it was built from; then open an issue with a source, or a pull request against the row." }
    ]
  };
  var ring, tcard, steps = OVERVIEW, tourName = "", step = -1, saved = null;
  function tourStart(kind) { if (ring) return; closeWelcome(); hideNudge(); steps = (kind && TOURS[kind]) ? TOURS[kind] : OVERVIEW; tourName = (kind && TOURS[kind]) ? GUIDE[kind].name : "Overview";
    saved = { tab: S.tab, scen: S.scen, expanded: expanded }; expanded = false; render(); document.body.classList.add("touring");   // the card folds away so the map and the highlighted control share the screen
    ring = document.createElement("div"); ring.className = "tour-ring"; tcard = document.createElement("div"); tcard.className = "tour-card"; tcard.setAttribute("role", "dialog"); tcard.setAttribute("aria-label", "Guided tour: " + tourName); document.body.appendChild(ring); document.body.appendChild(tcard);
    tcard.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; if (b.dataset.t === "next") go(step + 1); else if (b.dataset.t === "back") go(step - 1); else tourEnd(); });
    window.addEventListener("resize", place); window.addEventListener("scroll", place, { passive: true }); document.addEventListener("keydown", keys); go(0); }
  function keys(ev) { if (!ring) return; if (ev.key === "Escape") tourEnd(); else if (ev.key === "ArrowRight") go(step + 1); else if (ev.key === "ArrowLeft") go(step - 1); }
  function go(i) {
    if (i < 0) return; if (i >= steps.length) return tourEnd();
    var prev = steps[step]; if (prev && prev.undo) try { prev.undo(); } catch (e) {}
    step = i; var s = steps[i]; if (S.tab !== s.tab) S.setTab(s.tab); if (s.prep) try { s.prep(); } catch (e) {}
    tcard.innerHTML = "<div class='tstep'>" + esc(tourName) + " · " + (i + 1) + " of " + steps.length + "</div><b>" + esc(s.title) + "</b><p>" + esc(s.text) + "</p><div class='tbtns'>" + (i > 0 ? "<button type='button' data-t='back'>Back</button>" : "") + "<button type='button' data-t='next' class='primary'>" + (i === steps.length - 1 ? "Done" : "Next") + "</button><button type='button' data-t='end'>" + (i === steps.length - 1 ? "Close" : "Skip") + "</button><span class='tkeys'>Esc closes · arrow keys move</span></div>";
    var el = q(s.target); if (el && !el.hidden) el.scrollIntoView({ behavior: "smooth", block: "center" });
    place(); setTimeout(place, 400); setTimeout(place, 900); var nb = tcard.querySelector("[data-t=next]"); if (nb) nb.focus({ preventScroll: true });
  }
  function place() { if (!ring) return; var s = steps[step], el = s && q(s.target); if (!el || el.hidden) { ring.style.display = "none"; return; } var r = el.getBoundingClientRect(); if (!r.width) { ring.style.display = "none"; return; }
    ring.style.display = "block"; ring.style.left = (r.left + window.scrollX - 6) + "px"; ring.style.top = (r.top + window.scrollY - 6) + "px"; ring.style.width = (r.width + 12) + "px"; ring.style.height = (r.height + 12) + "px"; }
  function tourEnd() { if (!ring) return; var cur = steps[step]; if (cur && cur.undo) try { cur.undo(); } catch (e) {}
    ring.remove(); tcard.remove(); ring = tcard = null; step = -1; document.body.classList.remove("touring"); window.removeEventListener("resize", place); window.removeEventListener("scroll", place); document.removeEventListener("keydown", keys);
    var toured = store().toured; if (typeof toured !== "object" || !toured) toured = {}; toured[tourName === "Overview" ? "overview" : (saved && saved.tab) || S.tab] = true;
    if (saved) { if (saved.scen && D.scenarios[saved.scen]) scen(saved.scen); S.setTab(saved.tab); expanded = saved.expanded; } save({ toured: toured }); render(); see("#guide"); }

  /* ---------- the soft landing: a one-time welcome, and a nudge the first time each tab opens ---------- */
  var welcome = null, nudge = null, nudgeTimer = null;
  function seenTabs() { var s = store().seen; return (s && typeof s === "object") ? s : {}; }
  function markSeen(tab) { var s = seenTabs(); if (!s[tab]) { s[tab] = true; save({ seen: s }); } }
  function closeWelcome() { if (!welcome) return; welcome.remove(); welcome = null; document.body.classList.remove("welcoming"); save({ welcomed: true }); markSeen(S.tab); }
  function showWelcome() {
    if (welcome || store().welcomed) return;
    welcome = document.createElement("div"); welcome.className = "welcome-backdrop"; document.body.classList.add("welcoming");
    welcome.innerHTML = "<div class='welcome' role='dialog' aria-modal='true' aria-labelledby='welcome-h'><div class='wk'>The Paper Network</div><h2 id='welcome-h'>Where every ton of board goes</h2>" +
      "<p>A public, free model of the US containerboard network: <b>" + n_mills + " mills</b>, <b>" + n_nodes + " box markets</b>, and the cheapest way the board moves between them, solved from filings and public data. Nothing here is a private order book, and every number has its source one click away.</p>" +
      "<p class='wsub'>Nine views, one solved network. Three ways in:</p>" +
      "<div class='wbtns'><button type='button' data-w='tour' class='primary'>Take the two-minute tour</button><button type='button' data-w='ask'>Start from a question</button><button type='button' data-w='explore'>Explore on my own</button></div>" +
      "<p class='wnote'>Each view keeps a short tour and a How to use card; the Guide button in the header brings them back any time.</p></div>";
    welcome.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (b) { var w = b.dataset.w; closeWelcome(); if (w === "tour") tourStart(); else if (w === "ask") { expanded = true; mode = "index"; save({ collapsed: false }); render(); see("#guide"); } return; } if (ev.target === welcome) closeWelcome(); });
    document.addEventListener("keydown", function esc(ev) { if (ev.key === "Escape") { closeWelcome(); document.removeEventListener("keydown", esc); } });
    document.body.appendChild(welcome); var first = welcome.querySelector("button.primary"); if (first) first.focus({ preventScroll: true });
  }
  function hideNudge() { if (nudgeTimer) { clearTimeout(nudgeTimer); nudgeTimer = null; } if (nudge) { nudge.remove(); nudge = null; } }
  function maybeNudge(tab) {
    hideNudge(); if (ring || welcome || !TOURS[tab]) return; if (seenTabs()[tab]) return; markSeen(tab);
    nudge = document.createElement("div"); nudge.className = "tour-nudge"; nudge.setAttribute("role", "status");
    nudge.innerHTML = "<span>First time on <b>" + esc(GUIDE[tab].name) + "</b>? There is a " + TOURS[tab].length + "-step tour.</span><button type='button' data-n='tour' class='primary'>Tour this view</button><button type='button' data-n='no'>Not now</button>";
    nudge.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; var t = b.dataset.n; hideNudge(); if (t === "tour") tourStart(tab); });
    document.body.appendChild(nudge); nudgeTimer = setTimeout(hideNudge, 14000);
  }
  S.guide = { render: render, tour: tourStart, end: tourEnd, index: INDEX, spec: GUIDE, steps: OVERVIEW, tours: TOURS, welcome: showWelcome, nudge: maybeNudge };
  render(); markSeen(S.tab); showWelcome();
})();
