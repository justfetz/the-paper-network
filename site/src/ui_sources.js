/* The Paper Network dashboard, part 8: where each number comes from. Click a mill, a market, a named plant or a headline figure
   and a card shows the source, the method that produced the number and how sure we are; the hover box says so. Mill sources are
   joined from data/mills_final.csv at build time; the methods for the figures are written out here, next to the code that draws them. */
(function () {
  var D = window.PN_DATA, S = window.PN; if (!D || !S || !window.d3) return;
  var BLOB = "https://github.com/justfetz/the-paper-network/blob/main/", kt = S.kt;
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var host = function (u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } };
  var LINKS = {
    receipts: ["The receipts: every headline number against its public anchor", BLOB + "audit/RECEIPTS.md"],
    mills: ["The mill list, a source on every row", BLOB + "data/mills_final.csv"],
    model: ["The model (min-cost flow)", BLOB + "model/netmodel.py"],
    scen: ["How each scenario is run", BLOB + "model/export_json.py"],
    corr: ["The corrugator layer", BLOB + "model/corrugators.py"],
    cbp: ["Census County Business Patterns, NAICS 322211", "https://www.census.gov/programs-surveys/cbp.html"],
    frs: ["EPA Facility Registry Service", "https://www.epa.gov/frs"],
    afpa: ["AF&PA capacity and production survey", "https://www.afandpa.org/news/2026/afpa-releases-66th-annual-paper-industry-capacity-and-fiber-consumption-survey"],
    fba: ["Fibre Box Association industry statistics", "https://www.fibrebox.org/the-corrugated-industry"],
    eia: ["EIA weekly on-highway diesel", "https://www.eia.gov/petroleum/gasdiesel/"],
    fastm: ["Fastmarkets on the 2025-26 closures", "https://www.fastmarkets.com/insights/north-american-containerboard-market-capacity-cuts/"]
  };
  var FREIGHT = "Truck costs $8 a ton plus 12.5 cents a ton-mile and rail $35 plus 6.5 cents, so rail wins on lanes over about 450 road miles (road miles are straight-line distance times 1.2); diesel scales the fuel share of each.";
  /* the method behind each headline figure, matched on its label */
  var METHODS = [
    [/^scenario$/, "Which footprint and assumptions every number on the page belongs to. Change it under Scenario, the maintenance calendar or the knockout list.", ["scen"]],
    [/^board shipped$/, "Tons the solver ships from US and Canadian mills to US box markets in this scenario: the scenario's demand less unmet tons. National demand is AF&PA production plus imports less exports, placed by Census employment and EPA plant counts.", ["afpa", "cbp", "model"]],
    [/^exported$/, "Export tons for the scenario, routed by the solver to the export docks. Export tonnage by grade is not published for free, so the total is an assumption set from AF&PA's reported percentage changes.", ["afpa", "receipts"]],
    [/^average haul$/, "Tons-weighted road miles of the solved flows. " + FREIGHT, ["model"]],
    [/^by rail$/, "Share of tons on lanes where rail beats truck. " + FREIGHT, ["model", "eia"]],
    [/^freight$/, "Freight per ton and the total bill of the solved routing. " + FREIGHT, ["model", "eia"]],
    [/^bought outside own system$/, "Tons an integrated owner buys from other producers when its own mills are short or far away. Buying outside carries a $150/t premium in the model; the receipts re-solve it at $80 and $200.", ["model", "receipts"]],
    [/^unmet demand$/, "Tons no mill can reach in this scenario. They cost $400 a ton in the model, so the solver leaves tons unmet only when capacity runs out.", ["model"]],
    [/^outage cost this month$/, "This month's network cost with the scheduled outages, minus the same month without them, at a monthly rate.", ["scen"]],
    [/2nd mill within|^within \$10/, "Share of markets whose second-cheapest mill, by delivered freight, is within that many dollars a ton of the cheapest. Freight only: prices and contracts are not public.", ["model"]],
    [/^median gap$/, "Median freight gap between each market's cheapest and second-cheapest mill.", ["model"]],
    [/^open-market board/, "Tons the solver sells across owners: the demand an owner's own mills do not serve.", ["model"]],
    [/^after \+\$70/, "The network re-solved with this producer's open-market offers $70 a ton higher and everyone else unchanged: the open-market tons it keeps.", ["scen"]],
    [/^accounts that move$/, "Market-and-grade pairs whose open-market supplier changes after the increase.", ["scen"]],
    [/^cost to the rest of the network$/, "Network cost after the increase, minus before.", ["scen"]],
    [/^paper at the mill$/, "Liner and medium basis weights for the spec, times the mill prices set above. The default prices are published index midpoints; months between index moves are chained and marked as derived on the price charts.", ["receipts"]],
    [/^delivered, cheapest/, "Paper at the mill plus freight to each market, priced at the market's delivered marginal cost, per thousand square feet.", ["model"]],
    [/^freight share/, "Freight's share of delivered paper cost, from the cheapest market to the dearest.", ["model"]],
    [/mill increase$/, "An announced increase in dollars a ton, converted to dollars per thousand square feet with the spec's basis weights.", []],
    [/^diesel/, "Freight re-solved at the diesel price chosen; the live option uses the latest EIA weekly price.", ["eia", "model"]],
    [/^OCC recovered where/, "Box use in each market times a 92% recovery rate, plus 3% for imported goods.", ["afpa", "scen"]],
    [/^to recycled mills$/, "OCC the fiber model sends to recycled mills, at 1.15 tons of OCC per ton of recycled board they ship.", ["scen"]],
    [/^no taker in the model$/, "OCC the mills cannot use at today's output and the export docks do not take.", ["scen"]],
    [/^average haul to a mill or dock$/, "Tons-weighted road miles of the OCC flows.", ["scen"]],
    [/^US box-plant demand/, "National board demand for the scenario: AF&PA production plus imports less exports. Census employment sets each state's share; within a state, 70% follows EPA-registered box plants and 30% population.", ["afpa", "cbp", "frs"]],
    [/^corrugator-equivalents/, "Demand divided by one corrugator's yearly output at 1,000 million square feet.", ["fba"]],
    [/^FBA count|share$/, "Fibre Box Association statements, as published.", ["fba"]],
    [/^board out of US/, "Domestic shipments plus exports in the solved scenario.", ["model"]],
    [/^rolls by truck/, "Lane by lane, truck under about 450 road miles and rail beyond; tons divided by 22 tons a truckload and 80 tons a railcar, per calendar day. Lanes under 1,000 tons a year are left out of the data file, about 2% of tons.", ["model"]],
    [/^through the corrugators$|^boxes shipped$|^sheets to sheet plants$/, "Board shipped, converted with the factors in the Conversions used table below: Fibre Box Association tons per MSF of boxes, corrugator trim and waste, and tons per MSF of combined board.", ["fba", "corr"]],
    [/^exported board$/, "Export tons of the solved scenario.", ["afpa"]],
    [/fleet|board made|board to run|sheet|corrugator|rolls consumed/, "From the corrugator layer: public counts (FBA: 458 corrugator plants; AICC: about 634 sheet plants and 70 sheet feeders) placed in markets by demand. Capacity is width times speed times hours times OEE from the calculator; the sheet trade is a second transport problem.", ["corr", "fba"]],
    [/model vs|vs 10-K|vs AF&PA|vs implied/, "The model's figure against the public number named in the label. Every anchor, its source and its tolerance are in the receipts.", ["receipts", "afpa"]],
    [/^LP size|^solve time|^scenarios on this page|^mills on the map|^demand points|^generated$/, "From the solver's own report for this run.", ["model"]]
  ];
  function methodFor(label) { for (var i = 0; i < METHODS.length; i++) if (METHODS[i][0].test(label)) return METHODS[i]; return [null, "Computed from the solved model. The Method & data tab and the receipts list every assumption and source.", ["receipts", "model"]]; }

  /* the card */
  var card = null;
  function close() { if (card) { card.remove(); card = null; document.removeEventListener("keydown", onKey); } }
  function onKey(ev) { if (ev.key === "Escape") close(); }
  function linkList(keys, extra) {
    var items = (extra || []).concat((keys || []).map(function (k) { return LINKS[k]; }).filter(Boolean));
    return items.length ? "<ul class='links'>" + items.map(function (l) { return "<li><a href='" + esc(l[1]) + "' target='_blank' rel='noopener'>" + esc(l[0]) + "</a></li>"; }).join("") + "</ul>" : "";
  }
  function show(kind, title, rows, links, foot) {
    close(); card = document.createElement("div"); card.className = "src-card"; card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "Where this number comes from");
    card.innerHTML = "<div class='sh'><span class='k'>Where this comes from · " + esc(kind) + "</span><button type='button' class='x' aria-label='Close'>×</button></div><h3>" + title + "</h3><dl>" +
      rows.filter(function (r) { return r && r[1] !== undefined && r[1] !== null && r[1] !== ""; }).map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>" + (links || "") + (foot ? "<p class='foot'>" + foot + "</p>" : "");
    document.body.appendChild(card); card.querySelector(".x").addEventListener("click", close); document.addEventListener("keydown", onKey);
  }
  var CONF = { high: "high: a filing or the company's own figure", medium: "medium: a dated filing or a reputable report", low: "low: an estimate or an old figure; a better source is welcome" };
  function openMill(m) {
    var s = S.scen_ ? S.scen_() : D.scenarios.fp2026, id = m.id, on = s.util && s.util[id] > 0;
    var src = m.src ? "<a href='" + esc(m.src) + "' target='_blank' rel='noopener'>" + esc(host(m.src)) + "</a>" : "none recorded";
    var dest = {}; (s.arcs || []).forEach(function (a) { if (a[0] === id) dest[a[1]] = (dest[a[1]] || 0) + a[2]; });
    var top = Object.keys(dest).sort(function (a, b) { return dest[b] - dest[a]; }).slice(0, 3).map(function (j) { return esc(D.nodes[+j].name) + " " + kt(dest[j]); }).join(", ");
    show("mill", esc(m.name) + ", " + esc(m.st) + " · " + esc(m.owner), [
      ["Capacity", "<b>" + kt(S.capIn ? S.capIn(m) : m.cap) + " a year</b>" + (m.cap_2024 && m.cap_2024 !== m.cap ? " (" + kt(m.cap_2024) + " in 2024)" : "")],
      ["Based on", esc(m.basis || "not recorded")], ["Source", src],
      ["Confidence", esc(CONF[m.conf] || m.conf || "not graded") + (m.basis_class ? " <span class='pill'>" + esc(m.basis_class) + "</span>" : "")],
      ["Status", m.status === "closed" ? "closed" + (m.closed_year ? " in " + Math.round(m.closed_year) : "") + (m.note ? ". " + esc(m.note) : "") : (m.note ? esc(m.note) : "")],
      ["In this scenario", on ? "runs at <b>" + Math.round(s.util[id] * 100) + "%</b> and ships " + kt(s.shipped[id]) + (top ? "; biggest markets " + top : "") + ". This is the solver's cheapest routing, not a shipment record." : "not running in this scenario"],
      ["Scarcity value", on ? "$" + (s.shadow[id] || 0).toFixed(1) + " a ton: the dual on the mill's capacity, what one more ton of capacity would save the network" : ""],
      ["Trucks, railcars", "Throughput tab: lane by lane, truck under about 450 road miles and rail beyond, at 22 tons a truckload and 80 a railcar"]
    ], linkList(["mills", "receipts", "model"]), "Know a better figure? Open an issue with the source and the next refresh re-solves.");
  }
  function openMarket(n) {
    var s = S.scen_ ? S.scen_() : D.scenarios.fp2026, i = n.i, sup = {};
    (s.arcs || []).forEach(function (a) { if (a[1] === i) sup[a[0]] = (sup[a[0]] || 0) + a[2]; });
    var top = Object.keys(sup).sort(function (a, b) { return sup[b] - sup[a]; }).slice(0, 3).map(function (k) { var m = S.byId[+k]; return esc(m.name) + " (" + esc(m.owner) + ") " + kt(sup[k]); }).join(", ");
    show("market", esc(n.name), [
      ["Board demand", "<b>" + kt(s.node_demand[i]) + " a year</b>. National demand (AF&amp;PA production plus imports less exports) split by state on Census County Business Patterns employment for box plants, NAICS 322211; within the state, 70% follows EPA-registered box-plant sites and 30% population."],
      ["Delivered cost", "$" + Math.round(s.node_mc[i]) + " a ton: the dual on this market's demand, what one more ton delivered here would add to the network's cost. Freight and premiums only, not a market price."],
      ["Suppliers", top ? top + ". The solver's cheapest routing, not a record of who ships here." : "none in this scenario"],
      ["People", n.pop ? Math.round(n.pop).toLocaleString() + " in the catchment (Census county population)" : ""]
    ], linkList(["cbp", "frs", "receipts", "model"]));
  }
  function openPlant(p) {
    var v = p[6] ? (p[6] === "yes" ? "operating" : p[6] === "no" ? "closed" : "status unknown") + (p[7] && p[7] !== "unknown" ? ", " + esc(String(p[7]).replace("_", " ")) : "") + (p[8] && p[8] !== "unknown" ? ", owner " + esc(p[8]) : "") + (p[9] ? " (" + esc(p[9]) + " confidence)" : "") : "not yet checked";
    show("plant", esc(p[0]), [
      ["Registered", esc((p[11] ? p[11] + ", " : "") + p[1] + ", " + p[2] + " " + (p[12] || "")) + ". Shown exactly as the EPA registry has it; nothing about the plant is inferred."],
      ["Verified", v + (p[10] ? ". Evidence: <a href='" + esc(p[10]) + "' target='_blank' rel='noopener'>" + esc(host(p[10])) + "</a>" : "")],
      ["Market", esc(D.nodes[p[5]] ? D.nodes[p[5]].name : "")]
    ], linkList(["frs"], [["The verification method", BLOB + "ingest/claude_verify.py"]]));
  }
  function openFigure(label, value) {
    var m = methodFor(label);
    show("figure", esc(label), [["Value", "<b>" + esc(value) + "</b>"], ["How it is computed", esc(m[1])], ["Scenario", esc((S.scen_ ? S.scen_() : {}).label || "")]], linkList(m[2]));
  }
  function openIntro() {
    show("everything", "Every number has a source", [
      ["Mills", "Click a mill: capacity, the filing or report it comes from, a confidence grade, and how the solver uses it."],
      ["Markets", "Click a market: where its demand comes from, what its delivered cost means, and who supplies it in the model."],
      ["Figures", "Click any headline figure (the dotted labels) for the method behind it."],
      ["Plants", "On Demand, click a named plant: the EPA registry row and, once checked, the evidence URL."]
    ], linkList(["receipts", "mills", "model"]));
  }

  /* wiring: clicks on the map, clicks on figures, a hint in the hover box, method tooltips on the labels */
  var mapEl = document.getElementById("map"), tipEl = document.querySelector("#mapcard .tip");
  if (mapEl) {
    mapEl.addEventListener("click", function (ev) {
      var t = ev.target; if (!t || !t.matches) return; var d = window.d3.select(t).datum();
      if (t.matches("circle.mill") && d && d.owner !== undefined) openMill(d);
      else if (t.matches("circle.plant") && d && d.length > 5) openPlant(d);
      else if (t.matches("rect") && d && d.i !== undefined && D.nodes[d.i] === d) openMarket(d);
    });
    mapEl.addEventListener("mouseover", function (ev) { var t = ev.target; if (!tipEl || !t || !t.matches) return; if (t.matches("circle.mill, circle.plant, rect")) tipEl.setAttribute("data-hint", "1"); else tipEl.removeAttribute("data-hint"); });
  }
  document.addEventListener("click", function (ev) {
    var k = ev.target && ev.target.closest ? ev.target.closest(".kpis .k.has-src") : null; if (!k) return;
    var lab = k.querySelector("span"), val = k.querySelector("b"); openFigure(lab ? lab.textContent : "", val ? val.textContent : "");
  });
  function decorate() {
    document.querySelectorAll(".kpis .k").forEach(function (k) {
      var lab = k.querySelector("span"); if (!lab) return; var txt = lab.textContent;
      if (k.dataset.srcFor === txt) return; k.dataset.srcFor = txt; k.classList.add("has-src"); k.title = methodFor(txt)[1] + " Click for sources.";
    });
  }
  var obs = new MutationObserver(function () { decorate(); });
  document.querySelectorAll(".kpis").forEach(function (el) { obs.observe(el, { childList: true, subtree: true, characterData: true }); });
  decorate();
  S.sources = { mill: openMill, market: openMarket, plant: openPlant, figure: openFigure, intro: openIntro, close: close, methodFor: methodFor };
})();
