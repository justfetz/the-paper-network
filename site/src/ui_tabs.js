/* The Paper Network dashboard, part 2: prospects, prices, fiber loop, demand, backtest, method; tab switching; boot. */
(function () {
  var S = window.PN, D = S.D, byId = S.byId, kt = S.kt, musd = S.musd, fmtP = S.fmtP, fmtT = S.fmtT, fmt1 = S.fmt1, ownerVar = S.ownerVar, L = S.layers;
  var DIV = { CT: "New England", ME: "New England", MA: "New England", NH: "New England", RI: "New England", VT: "New England", NJ: "Middle Atlantic", NY: "Middle Atlantic", PA: "Middle Atlantic",
    IL: "East North Central", IN: "East North Central", MI: "East North Central", OH: "East North Central", WI: "East North Central", IA: "West North Central", KS: "West North Central", MN: "West North Central", MO: "West North Central", NE: "West North Central", ND: "West North Central", SD: "West North Central",
    DE: "South Atlantic", DC: "South Atlantic", FL: "South Atlantic", GA: "South Atlantic", MD: "South Atlantic", NC: "South Atlantic", SC: "South Atlantic", VA: "South Atlantic", WV: "South Atlantic", AL: "East South Central", KY: "East South Central", MS: "East South Central", TN: "East South Central",
    AR: "West South Central", LA: "West South Central", OK: "West South Central", TX: "West South Central", AZ: "Mountain", CO: "Mountain", ID: "Mountain", MT: "Mountain", NV: "Mountain", NM: "Mountain", UT: "Mountain", WY: "Mountain", AK: "Pacific", CA: "Pacific", HI: "Pacific", OR: "Pacific", WA: "Pacific" };
  var base = D.scenarios.fp2026, dvb = S.derived("fp2026");
  var marketTons = D.nodes.map(function (n) { return (dvb.byNode[n.i] || []).filter(function (a) { return a[3] === 0; }).reduce(function (a, b) { return a + b[2]; }, 0); });

  /* ---------- prospects ---------- */
  function renderProspects() {
    S.clearLayers();
    var P = D.prospects[S.grade], gapScale = S.seq([0, 25]);
    var shock = S.shock ? D.price_shocks[S.shock] : null, swNodes = {}, swArcs = [];
    if (shock) shock.calls.forEach(function (c) { swNodes[c.node] = (swNodes[c.node] || 0) + c.tons; if (c.to_mill !== null) swArcs.push(c); });
    var as = L.arcs.selectAll("path").data(swArcs, function (c) { return c.node + "|" + c.grade + "|" + c.to_mill; }); as.exit().remove();
    as.enter().append("path").merge(as).attr("class", "arc sw").attr("d", function (c) { return S.arcPath(byId[c.to_mill], D.nodes[c.node]); }).style("stroke", function (c) { return ownerVar(byId[c.to_mill].owner); }).style("stroke-width", function (c) { return Math.max(0.8, S.wArc(c.tons) * 1.5); });
    var ns = L.nodes.selectAll("rect").data(D.nodes, function (n) { return n.id; }); ns.exit().remove();
    ns.enter().append("rect").attr("class", "node ramp").merge(ns)
      .attr("width", function (n) { return Math.max(2.2, S.sNode(marketTons[n.i] * 3)); }).attr("height", function (n) { return Math.max(2.2, S.sNode(marketTons[n.i] * 3)); })
      .attr("x", function (n) { return n.x - Math.max(2.2, S.sNode(marketTons[n.i] * 3)) / 2; }).attr("y", function (n) { return n.y - Math.max(2.2, S.sNode(marketTons[n.i] * 3)) / 2; })
      .style("fill", function (n) { return shock ? (swNodes[n.i] ? "var(--s8)" : "var(--ink-3)") : gapScale(Math.max(0, 25 - P[n.i].gap)); }).style("opacity", function (n) { return shock && !swNodes[n.i] ? 0.35 : 0.95; })
      .on("mousemove", function (ev, n) { var p = P[n.i], b = byId[p.best], s2 = byId[p.second], t = byId[p.third], cur = (dvb.byNode[n.i] || []).filter(function (a) { return a[3] === 0; }).sort(function (a, c) { return c[2] - a[2]; });
        S.showTip(ev, "<b>" + n.name + "</b> · open-market board " + kt(marketTons[n.i]) + "<br>cheapest " + (S.grade === "L" ? "liner" : "medium") + ": " + b.name + ", " + b.st + " (" + b.owner + ") $" + p.best_cost + "/t freight<br>next: " + s2.name + ", " + s2.st + " (" + s2.owner + ") +$" + p.gap + "/t · then " + t.name + " +$" + (p.third_cost - p.best_cost).toFixed(1) +
          (cur.length ? "<br>solver's market supplier: " + cur.slice(0, 2).map(function (a) { return byId[a[0]].name + " " + kt(a[2]); }).join(", ") : "") + (swNodes[n.i] ? "<br><b>switches " + kt(swNodes[n.i]) + " after the increase</b>" : "")); })
      .on("mouseleave", S.hideTip);
    S.drawMills({ dim: function (m) { return shock && m.owner === S.shock; } });
    S.setRamp(shock ? null : "markets: gap to the second-cheapest mill, $25+ (sticky) → $0 (a phone call)");
    var gaps = P.map(function (p) { return p.gap; }).sort(d3.ascending), w5 = gaps.filter(function (g) { return g <= 5; }).length / gaps.length, w10 = gaps.filter(function (g) { return g <= 10; }).length / gaps.length;
    var items = [["markets with a 2nd mill within $5/t", fmtP(w5)], ["within $10/t", fmtP(w10)], ["median gap", "$" + d3.median(gaps).toFixed(1) + "/t"], ["open-market board, all owners", kt(d3.sum(marketTons))]];
    if (shock) items = items.concat([["after +$70/t by " + S.shock, kt(shock.market_tons_after) + " of " + kt(shock.base_market_tons) + " kept"], ["accounts that move", shock.calls.length + " market-grades"], ["cost to the rest of the network", "+" + musd(shock.d_cost) + "/yr"]]);
    var k = d3.select("#kpis-pro").selectAll("div.k").data(items); k.exit().remove(); k.enter().append("div").attr("class", "k").merge(k).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; });
    var rows, head;
    if (shock) { rows = shock.calls.slice(0, 120).map(function (c) { var f = byId[c.from_mill], t = c.to_mill !== null ? byId[c.to_mill] : null, n = D.nodes[c.node]; return "<tr data-node='" + c.node + "'><td>" + n.name + "</td><td class='n'>" + kt(c.tons) + "</td><td>" + f.name + "</td><td>" + (t ? t.name + " (" + t.owner + ")" : "unserved") + "</td><td class='n'>$" + D.prospects[c.grade][c.node].gap + "</td></tr>"; });
      head = "<tr><th>Market</th><th class='n'>Tons</th><th>From</th><th>To</th><th class='n'>Gap</th></tr>"; d3.select("#calls-h").text("Call sheet: who " + S.shock + " loses, and to whom"); }
    else { var idx = d3.range(D.nodes.length).filter(function (i) { return marketTons[i] > 0; }).sort(function (a, b) { return P[a].gap - P[b].gap || marketTons[b] - marketTons[a]; }).slice(0, 120);
      rows = idx.map(function (i) { var p = P[i], b = byId[p.best], s2 = byId[p.second]; return "<tr data-node='" + i + "' class='" + (p.gap <= 5 ? "hot" : "") + "'><td>" + D.nodes[i].name + "</td><td class='n'>" + kt(marketTons[i]) + "</td><td>" + b.name + " (" + b.owner + ")</td><td>" + s2.name + " (" + s2.owner + ")</td><td class='n'>$" + p.gap + "</td></tr>"; });
      head = "<tr><th>Market</th><th class='n'>Open mkt</th><th>Cheapest</th><th>Next</th><th class='n'>Gap</th></tr>"; d3.select("#calls-h").text("Call sheet: most contestable open-market board"); }
    d3.select("#calls").html("<table>" + head + rows.join("") + "</table>");
  }
  d3.selectAll("button[data-grade]").on("click", function () { S.grade = this.dataset.grade; d3.selectAll("button[data-grade]").attr("aria-pressed", function () { return this.dataset.grade === S.grade ? "true" : "false"; }); S.render(); });
  var shockSel = d3.select("#shock"); shockSel.selectAll("option.s").data(Object.keys(D.price_shocks)).enter().append("option").attr("class", "s").attr("value", function (o) { return o; }).text(function (o) { return o + " raises open-market price $70/t"; });
  shockSel.on("change", function () { S.shock = this.value; S.render(); });
  function drawProspectsDetail() {
    var t = d3.select("#shock-table"); t.html("<tr><th>Owner</th><th class='n'>Open-market tons today</th><th class='n'>Kept after +$70</th><th class='n'>Accounts that move</th><th class='n'>Extra cost to network</th></tr>");
    Object.keys(D.price_shocks).forEach(function (o) { var v = D.price_shocks[o]; t.append("tr").html("<td>" + o + "</td><td class='n'>" + kt(v.base_market_tons) + "</td><td class='n'>" + kt(v.market_tons_after) + "</td><td class='n'>" + v.calls.length + "</td><td class='n'>+" + musd(v.d_cost) + "/yr</td>"); });
    var gaps = D.prospects.L.map(function (p) { return p.gap; }), w = 640, h = 200, m = { l: 40, r: 12, t: 12, b: 34 }, iw = w - m.l - m.r, ih = h - m.t - m.b, g = S.chartFrame("#gap-hist", w, h, m);
    var bins = d3.bin().domain([0, 40]).thresholds(d3.range(0, 42, 2.5))(gaps.map(function (v) { return Math.min(v, 39.9); }));
    var x = d3.scaleLinear().domain([0, 40]).range([0, iw]), y = d3.scaleLinear().domain([0, d3.max(bins, function (b) { return b.length; }) * 1.1]).nice().range([ih, 0]);
    g.append("g").attr("class", "grid-ax").call(d3.axisLeft(y).ticks(4).tickSize(-iw)); g.append("g").attr("class", "axis").attr("transform", "translate(0," + ih + ")").call(d3.axisBottom(x).ticks(8).tickFormat(function (v) { return "$" + v; }));
    g.append("text").attr("class", "axlab").attr("x", iw / 2).attr("y", ih + 30).attr("text-anchor", "middle").text("freight gap, cheapest to second-cheapest liner mill ($/t); 441 markets");
    g.selectAll("rect").data(bins).enter().append("rect").attr("x", function (b) { return x(b.x0) + 1; }).attr("width", function (b) { return Math.max(0, x(b.x1) - x(b.x0) - 2); }).attr("y", function (b) { return y(b.length); }).attr("height", function (b) { return Math.max(0, ih - y(b.length)); }).attr("rx", 2).style("fill", "var(--s3)");
    var mo = {}; D.nodes.forEach(function (n) { (dvb.byNode[n.i] || []).forEach(function (a) { if (a[3] === 0) { var o = byId[a[0]].owner; mo[o] = (mo[o] || 0) + a[2]; } }); });
    var rows = Object.keys(mo).map(function (o) { return { o: o, t: mo[o] }; }).sort(function (a, b) { return b.t - a.t; }).slice(0, 12), rowH = 20, m2 = { l: 170, r: 70, t: 6, b: 6 }, h2 = m2.t + m2.b + rows.length * rowH, iw2 = w - m2.l - m2.r, g2 = S.chartFrame("#market-by-owner", w, h2, m2);
    var x2 = d3.scaleLinear().domain([0, d3.max(rows, function (r) { return r.t; }) * 1.05]).range([0, iw2]), y2 = d3.scaleBand().domain(rows.map(function (r) { return r.o; })).range([0, rows.length * rowH]).padding(0.25);
    var r = g2.selectAll("g").data(rows).enter().append("g").attr("transform", function (d) { return "translate(0," + y2(d.o) + ")"; });
    r.append("rect").attr("width", function (d) { return x2(d.t); }).attr("height", y2.bandwidth()).attr("rx", 2).style("fill", function (d) { return ownerVar(d.o); });
    r.append("text").attr("class", "lab").attr("x", -8).attr("y", y2.bandwidth() / 2 + 4).attr("text-anchor", "end").text(function (d) { return d.o; });
    r.append("text").attr("class", "val").attr("x", function (d) { return x2(d.t) + 5; }).attr("y", y2.bandwidth() / 2 + 4).text(function (d) { return kt(d.t); });
  }

  /* ---------- prices and delivered cost ---------- */
  var SPECS = { ect32: { name: "32 ECT single wall, 35-26-35 C-flute", liner: 70, medium: 26 * 1.43, extra: 3 }, mullen200: { name: "200# Mullen single wall, 42-26-42 C-flute", liner: 84, medium: 26 * 1.43, extra: 3 } };
  function dieselScen() { if (S.diesel === "live") return D.scenarios.dzlive || base; return S.diesel === "3.75" ? base : (D.scenarios["dz" + parseInt(S.diesel, 10)] || base); }
  if (D.scenarios.dzlive) { var dsel = document.getElementById("diesel"), opt = document.createElement("option"); opt.value = "live"; opt.textContent = "$" + D.scenarios.dzlive.diesel.toFixed(2) + "/gal · EIA latest week"; dsel.appendChild(opt); }
  function deliveredPerMSF(i, spec) { var sp = SPECS[spec], lb = sp.liner + sp.medium + sp.extra, paper = (sp.liner * S.pLiner + sp.medium * S.pMedium) / 2000, frt = dieselScen().node_mc[i] * lb / 2000; return { paper: paper, freight: frt, total: paper + frt, lb: lb }; }
  function renderPrices() {
    S.clearLayers();
    var vals = D.nodes.map(function (n) { return deliveredPerMSF(n.i, S.spec); }), ext = d3.extent(vals, function (v) { return v.total; }), sc = S.seq(ext), sp = SPECS[S.spec];
    var ns = L.nodes.selectAll("rect").data(D.nodes, function (n) { return n.id; }); ns.exit().remove();
    ns.enter().append("rect").attr("class", "node ramp").merge(ns).attr("width", function (n) { return S.sNode(base.node_demand[n.i]); }).attr("height", function (n) { return S.sNode(base.node_demand[n.i]); })
      .attr("x", function (n) { return n.x - S.sNode(base.node_demand[n.i]) / 2; }).attr("y", function (n) { return n.y - S.sNode(base.node_demand[n.i]) / 2; }).style("fill", function (n) { return sc(vals[n.i].total); })
      .on("mousemove", function (ev, n) { var v = vals[n.i], hike = S.hike * v.lb / 2000; S.showTip(ev, "<b>" + n.name + "</b><br>" + sp.name + " · " + v.lb.toFixed(0) + " lb/MSF<br>paper at the mill $" + v.paper.toFixed(2) + "/MSF + freight $" + v.freight.toFixed(2) + " = <b>$" + v.total.toFixed(2) + "/MSF delivered</b><br>freight is " + fmtP(v.freight / v.total) + " of delivered paper cost<br>a $" + S.hike + "/t increase adds $" + hike.toFixed(2) + "/MSF (" + fmtP(hike / v.total) + ")"); }).on("mouseleave", S.hideTip);
    S.drawMills({ dim: function () { return false; } });
    S.setRamp("delivered paper cost, " + sp.name.split(",")[0] + ": $" + ext[0].toFixed(0) + " → $" + ext[1].toFixed(0) + "/MSF");
    var hikeMSF = S.hike * sp.liner / 2000 + S.hike * sp.medium / 2000 * (S.spec === "ect32" ? 1 : 1), fr = vals.map(function (v) { return v.freight / v.total; });
    var items = [["paper at the mill", "$" + vals[0].paper.toFixed(2) + "/MSF"], ["delivered, cheapest → dearest", "$" + ext[0].toFixed(2) + " → $" + ext[1].toFixed(2)], ["freight share of delivered cost", fmtP(d3.min(fr)) + " → " + fmtP(d3.max(fr))], ["a $" + S.hike + "/t mill increase", "+$" + hikeMSF.toFixed(2) + "/MSF, " + fmtP(hikeMSF / ext[1]) + "–" + fmtP(hikeMSF / ext[0]) + " of delivered"], ["diesel " + S.diesel + " $/gal: network freight", musd(dieselScen().kpi.freight_usd) + " · " + fmtP(dieselScen().kpi.rail_share) + " by rail"]];
    var k = d3.select("#kpis-price").selectAll("div.k").data(items); k.exit().remove(); k.enter().append("div").attr("class", "k").merge(k).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; });
    var order = d3.range(D.nodes.length).sort(function (a, b) { return vals[a].total - vals[b].total; }), rows = order.slice(0, 8).concat([-1], order.slice(-8));
    d3.select("#price-rank").html("<table><tr><th>Market</th><th class='n'>Delivered $/MSF</th><th class='n'>Freight</th></tr>" + rows.map(function (i) { return i < 0 ? "<tr><td colspan='3' style='text-align:center;color:var(--ink-3)'>…</td></tr>" : "<tr data-node='" + i + "'><td>" + D.nodes[i].name + "</td><td class='n'>$" + vals[i].total.toFixed(2) + "</td><td class='n'>" + fmtP(vals[i].freight / vals[i].total) + "</td></tr>"; }).join("") + "</table>");
  }
  d3.selectAll("button[data-spec]").on("click", function () { S.spec = this.dataset.spec; d3.selectAll("button[data-spec]").attr("aria-pressed", function () { return this.dataset.spec === S.spec ? "true" : "false"; }); S.render(); });
  d3.select("#p-liner").on("input", function () { S.pLiner = +this.value || 0; S.render(); }); d3.select("#p-medium").on("input", function () { S.pMedium = +this.value || 0; S.render(); }); d3.select("#p-hike").on("input", function () { S.hike = +this.value || 0; S.render(); });
  d3.select("#diesel").on("change", function () { S.diesel = this.value; S.render(); });
  function lineChart(host, title, series, unit, note) {
    var card = d3.select(host).append("section").attr("class", "card"); card.append("h2").text(title);
    var w = 420, h = 170, m = { l: 44, r: 14, t: 10, b: 24 }, iw = w - m.l - m.r, ih = h - m.t - m.b, id = "pc" + Math.random().toString(36).slice(2, 7); card.append("div").attr("id", id).attr("class", "line");
    var g = S.chartFrame("#" + id, w, h, m), pts = series.map(function (p) { return { d: new Date(p[0] + (p[0].length === 7 ? "-15" : p[0].length === 4 ? "-07-01" : "")), v: p[1] }; }).sort(function (a, b) { return a.d - b.d; });
    var x = d3.scaleTime().domain(d3.extent(pts, function (p) { return p.d; })).range([0, iw]), y = d3.scaleLinear().domain([Math.min(0, d3.min(pts, function (p) { return p.v; })) , d3.max(pts, function (p) { return p.v; }) * 1.1]).nice().range([ih, 0]);
    g.append("g").attr("class", "grid-ax").call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat(function (v) { return unit === "$" ? "$" + v : v; })); g.append("g").attr("class", "axis").attr("transform", "translate(0," + ih + ")").call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%b %y")));
    g.append("path").attr("class", "area").attr("d", d3.area().x(function (p) { return x(p.d); }).y0(ih).y1(function (p) { return y(p.v); })(pts));
    g.append("path").attr("class", "ser").attr("d", d3.line().x(function (p) { return x(p.d); }).y(function (p) { return y(p.v); })(pts));
    g.selectAll("circle").data(pts).enter().append("circle").attr("class", "pt").attr("r", 3.2).attr("cx", function (p) { return x(p.d); }).attr("cy", function (p) { return y(p.v); })
      .on("mousemove", function (ev, p) { S.showTipAt("#" + id, ev, "<b>" + d3.timeFormat("%b %Y")(p.d) + "</b><br>" + (unit === "$" ? "$" : "") + p.v + (unit === "$" ? "" : " " + unit)); }).on("mouseleave", function () { S.hideTipAt("#" + id); });
    var last = pts[pts.length - 1]; g.append("text").attr("class", "val").attr("x", x(last.d) - 4).attr("y", y(last.v) - 8).attr("text-anchor", "end").text((unit === "$" ? "$" : "") + last.v);
    if (note) card.append("p").attr("class", "note").text(note);
  }
  function drawPricesDetail() {
    var P = D.prices, host = "#price-charts"; d3.select(host).html("");
    lineChart(host, "42-lb kraft linerboard, US East ($/short ton)", P.liner_east, "$", P.notes.liner_east);
    lineChart(host, "OCC, national average ($/ton, FOB seller's dock)", P.occ_national, "$", P.notes.occ);
    lineChart(host, "On-highway diesel, US average ($/gal)", P.diesel, "$", P.notes.diesel);
    lineChart(host, "Recycled linerboard 30/31-lb East and medium index ($/t)", P.recycled_liner, "$", P.notes.recycled);
    if (P.fred) Object.keys(P.fred).forEach(function (sid) { var s = P.fred[sid]; if (s.points.length > 3) lineChart(host, s.label + " · FRED " + sid, s.points, s.label.indexOf("$") >= 0 ? "$" : "", "Federal Reserve Economic Data, monthly; indexes are not prices but move with them."); });
    d3.select("#price-note").html(P.notes.general);
    var t = d3.select("#ect-table"); t.html("<tr><th>Spec</th><th>Furnish</th><th class='n'>lb / MSF</th><th class='n'>Paper $/MSF at current prices</th><th class='n'>Tons per 1,000 MSF</th></tr>");
    [["200# Mullen (burst)", "42-26-42, C-flute", 42 + 42 + 26 * 1.43 + 3], ["32 ECT (edge crush)", "35-26-35, C-flute", 35 + 35 + 26 * 1.43 + 3], ["32 ECT with 23-lb medium", "35-23-35, C-flute", 35 + 35 + 23 * 1.43 + 3], ["29 ECT lightweight", "31-23-31, C-flute", 31 + 31 + 23 * 1.43 + 3]].forEach(function (r) {
      var liner = r[2] - 3 - (r[1].indexOf("23") > 0 ? 23 * 1.43 : 26 * 1.43), med = r[2] - 3 - liner, cost = (liner * S.pLiner + med * S.pMedium) / 2000;
      t.append("tr").html("<td>" + r[0] + "</td><td>" + r[1] + "</td><td class='n'>" + r[2].toFixed(0) + "</td><td class='n'>$" + cost.toFixed(2) + "</td><td class='n'>" + (r[2] / 2).toFixed(1) + "</td>"); });
    var dt = d3.select("#diesel-table"); dt.html("<tr><th>Diesel</th><th class='n'>Network freight</th><th class='n'>$/ton</th><th class='n'>By rail</th><th>Context</th></tr>");
    var drows = [["3.0", "$3.00", "2023–25 Gulf Coast range"], ["3.75", "$3.75", "2024 US average (EIA $3.76)"], ["5.0", "$5.00", "2022 average (EIA $4.99); 2026 YTD $5.07"], ["6.2", "$6.20", "week of Oct 12, 2026: US $6.18, West Coast $7.24"]];
    if (D.scenarios.dzlive) drows.push(["live", "$" + D.scenarios.dzlive.diesel.toFixed(2), "EIA latest week" + (D.prices.diesel_latest ? " (" + D.prices.diesel_latest.date + ")" : "")]);
    drows.forEach(function (r) {
      var k = (r[0] === "3.75" ? base : r[0] === "live" ? D.scenarios.dzlive : D.scenarios["dz" + parseInt(r[0], 10)]); if (!k) return;
      dt.append("tr").html("<td>" + r[1] + "/gal</td><td class='n'>" + musd(k.kpi.freight_usd) + "</td><td class='n'>$" + fmt1(k.kpi.avg_freight_per_ton) + "</td><td class='n'>" + fmtP(k.kpi.rail_share) + "</td><td>" + r[2] + "</td>"); });
  }

  /* ---------- fiber loop ---------- */
  var O = D.occ, sinkPos = O.sinks.map(function (s) { return s[0] === "mill" ? byId[s[1]] : O.ports[s[1]]; }), intake = {}, intakeMiles = {};
  O.flows.forEach(function (f) { var s = O.sinks[f[1]], key = s[0] + s[1]; intake[key] = (intake[key] || 0) + f[2]; var n = D.nodes[f[0]], p = sinkPos[f[1]], mi = Math.hypot(n.x - p.x, n.y - p.y) * 2.6; intakeMiles[key] = (intakeMiles[key] || 0) + f[2] * mi; });
  function renderFiber() {
    S.clearLayers();
    var valScale = S.seq([0, d3.quantile(O.county_value.slice().sort(d3.ascending), 0.95) || 1]);
    var fl = S.fiberFlows ? O.flows.filter(function (f) { return f[2] >= 5000; }) : [];
    var as = L.arcs.selectAll("path").data(fl, function (f) { return f[0] + "|" + f[1]; }); as.exit().remove();
    as.enter().append("path").merge(as).attr("class", "arc occ").attr("d", function (f) { return S.arcPath(D.nodes[f[0]], sinkPos[f[1]]); }).style("stroke-width", function (f) { return S.wArc(f[2]); });
    var ns = L.nodes.selectAll("rect").data(D.nodes, function (n) { return n.id; }); ns.exit().remove();
    ns.enter().append("rect").attr("class", "node").merge(ns).classed("ramp", S.fiberValue).attr("width", function (n) { return S.sNode(O.supply[n.i]); }).attr("height", function (n) { return S.sNode(O.supply[n.i]); })
      .attr("x", function (n) { return n.x - S.sNode(O.supply[n.i]) / 2; }).attr("y", function (n) { return n.y - S.sNode(O.supply[n.i]) / 2; }).style("fill", function (n) { return S.fiberValue ? valScale(O.county_value[n.i]) : null; })
      .on("mousemove", function (ev, n) { var out = O.flows.filter(function (f) { return f[0] === n.i; }).sort(function (a, b) { return b[2] - a[2]; }); S.showTip(ev, "<b>" + n.name + "</b><br>" + kt(O.supply[n.i]) + " of OCC recovered a year<br>one more ton here is worth $" + O.county_value[n.i].toFixed(0) + "/t to the network" + (O.surplus[n.i] > 1000 ? "<br>" + kt(O.surplus[n.i]) + " finds no taker in the model" : "") + "<br>" + out.slice(0, 3).map(function (f) { var s = O.sinks[f[1]]; return "→ " + (s[0] === "mill" ? byId[s[1]].name + " (" + byId[s[1]].owner + ")" : O.ports[s[1]].name) + " " + kt(f[2]); }).join("<br>")); }).on("mouseleave", S.hideTip);
    var ps = L.ports.selectAll("path").data(O.ports, function (p) { return p.name; }); ps.exit().remove();
    ps.enter().append("path").attr("class", "port").merge(ps).attr("d", function (p) { var t = intake["port" + O.ports.indexOf(p)] || 0, r = Math.max(3, Math.sqrt(t / 1e6) * 9); return "M" + p.x + "," + (p.y - r) + "L" + (p.x + r) + "," + (p.y + r) + "L" + (p.x - r) + "," + (p.y + r) + "Z"; })
      .on("mousemove", function (ev, p) { S.showTip(ev, "<b>" + p.name + "</b><br>OCC export dock · " + kt(intake["port" + O.ports.indexOf(p)] || 0) + " a year<br>" + fmtP(p.share) + " of US OCC exports (assumed split)"); }).on("mouseleave", S.hideTip);
    S.drawMills({ radius: function (m) { var t = intake["mill" + m.id] || 0; return t ? Math.max(2.4, Math.sqrt(t / 1e6) * 9) : 1.8; }, dim: function (m) { return !intake["mill" + m.id]; },
      tip: function (m) { var t = intake["mill" + m.id] || 0; return "<b>" + m.name + ", " + m.st + "</b> · " + m.owner + "<br>" + S.grades(m.grades) + "<br>" + (t ? "takes in " + kt(t) + " of OCC a year, average haul " + Math.round(intakeMiles["mill" + m.id] / t) + " mi" : "virgin-fiber mill: no OCC in this model"); } });
    S.setRamp(S.fiberValue ? "counties: value of one more ton of OCC, $0 → $" + Math.round(valScale.domain()[1]) + "/t" : null);
    var k = O.kpi, items = [["OCC recovered where boxes are used", kt(k.occ_supply)], ["to recycled mills", kt(k.occ_to_mills)], ["exported", kt(k.occ_exported)], ["no taker in the model", kt(k.occ_unplaced)], ["average haul to a mill or dock", Math.round(k.avg_haul) + " mi"]];
    var kk = d3.select("#kpis-fiber").selectAll("div.k").data(items); kk.exit().remove(); kk.enter().append("div").attr("class", "k").merge(kk).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; });
    var mills = Object.keys(intake).filter(function (k) { return k.indexOf("mill") === 0; }).map(function (k) { var m = byId[+k.slice(4)]; return { m: m, t: intake[k], mi: intakeMiles[k] / intake[k] }; }).sort(function (a, b) { return b.t - a.t; });
    d3.select("#fiber-mills").html("<table><tr><th>Mill</th><th>Owner</th><th class='n'>OCC in</th><th class='n'>Avg haul</th></tr>" + mills.map(function (r) { return "<tr><td>" + r.m.name + ", " + r.m.st + "</td><td>" + r.m.owner + "</td><td class='n'>" + kt(r.t) + "</td><td class='n'>" + Math.round(r.mi) + " mi</td></tr>"; }).join("") + "</table>");
  }
  d3.selectAll("button[data-flayer]").on("click", function () { var k = this.dataset.flayer; if (k === "flows") S.fiberFlows = !S.fiberFlows; else S.fiberValue = !S.fiberValue; d3.selectAll("button[data-flayer]").attr("aria-pressed", function () { return (this.dataset.flayer === "flows" ? S.fiberFlows : S.fiberValue) ? "true" : "false"; }); S.render(); });
  function drawFiberDetail() {
    var F = D.facts.fiber, t = d3.select("#fiber-table"); t.html("<tr><th>Quantity</th><th class='n'>Model</th><th class='n'>Record</th><th>Source</th></tr>");
    [["Corrugated recovered", kt(O.kpi.occ_supply), F.occ_collected, F.src_afpa], ["Recovered paper consumed by US mills (all grades)", "—", F.consumed, F.src_afpa], ["Recovered paper exported (all grades)", "—", F.exported, F.src_afpa], ["OCC exported (68% of exports)", kt(O.kpi.occ_exported), F.occ_exported, F.src_usitc], ["Top destinations 2024", "—", F.destinations, F.src_usitc], ["OCC per ton of recycled board", "1.15 t", F.yield, "assumption"]].forEach(function (r) {
      t.append("tr").html("<td>" + r[0] + "</td><td class='n'>" + r[1] + "</td><td class='n'>" + r[2] + "</td><td>" + r[3] + "</td>"); });
    d3.select("#fiber-note").html(F.note);
  }

  /* ---------- named plants (EPA FRS) ---------- */
  var PL = D.plants || null, PLN = D.plant_layer || null; S.named = false; S.namedQ = "";
  if (PL) { document.getElementById("named-toggle").hidden = false; document.getElementById("named-search-bar").hidden = false; document.getElementById("named-card").hidden = false;
    PL.forEach(function (p) { var q = S.D && window.d3 ? d3.geoConicEqualArea().parallels([29.5, 45.5]).rotate([96, 0]).center([-0.6, 38.7]).scale(1300).translate([487.5, 305])([p[5], p[4]]) : null; p.x = q ? q[0] : null; p.y = q ? q[1] : null; }); }
  function drawNamed() {
    var sel = L.ports.selectAll("circle.plant").data(S.named && PL ? PL.filter(function (p) { return p.x !== null && (!S.namedQ || (p[0] + " " + p[1] + " " + p[2] + " " + p[3]).toLowerCase().indexOf(S.namedQ) >= 0); }) : [], function (p) { return p[0] + p[2] + p[3]; });
    sel.exit().remove();
    sel.enter().append("circle").attr("class", "plant").attr("r", 1.9).style("stroke", "var(--bg)").style("stroke-width", 0.3).style("opacity", 0.9).style("cursor", "pointer").merge(sel)
      .attr("cx", function (p) { return p.x; }).attr("cy", function (p) { return p.y; }).style("fill", function (p) { return p[1] === "Independent / unknown" ? "var(--ink-2)" : ownerVar(p[1]); })
      .on("mousemove", function (ev, p) { S.showTip(ev, "<b>" + p[0] + "</b><br>" + p[2] + ", " + p[3] + " · " + p[1] + "<br><i>EPA FRS, NAICS 322211; in market " + D.nodes[p[6]].name + "</i>"); }).on("mouseleave", S.hideTip);
  }
  function drawNamedList() {
    if (!PL) return;
    var q = S.namedQ, rows = PL.filter(function (p) { return !q || (p[0] + " " + p[1] + " " + p[2] + " " + p[3]).toLowerCase().indexOf(q) >= 0; });
    var byOwner = {}; PL.forEach(function (p) { byOwner[p[1]] = (byOwner[p[1]] || 0) + 1; });
    d3.select("#named-h").text("Named plants from the EPA Facility Registry: " + rows.length.toLocaleString() + (q ? " matching \"" + q + "\"" : "") + " of " + PL.length.toLocaleString());
    d3.select("#named-list").html("<table><tr><th>Plant</th><th>Owner (from the name)</th><th>City</th><th>St</th><th>Market</th></tr>" + rows.slice(0, 400).sort(function (a, b) { return a[3] === b[3] ? a[2].localeCompare(b[2]) : a[3].localeCompare(b[3]); }).map(function (p) { return "<tr data-node='" + p[6] + "'><td>" + p[0] + "</td><td>" + p[1] + "</td><td>" + p[2] + "</td><td>" + p[3] + "</td><td>" + D.nodes[p[6]].name + "</td></tr>"; }).join("") + "</table>");
    d3.select("#named-note").html("Sites with NAICS 322211 (corrugated and solid fiber boxes) in the EPA Facility Registry Service, with coordinates. Owner is inferred from the registered name, so a plant registered under a former owner or a local name shows as independent or unknown; corrugator versus sheet plant is not in the record. By owner: " + Object.keys(byOwner).sort(function (a, b) { return byOwner[b] - byOwner[a]; }).slice(0, 10).map(function (o) { return o + " " + byOwner[o]; }).join(" · ") + ".");
    if (PLN && PLN.state_comparison) { document.getElementById("proxy-card").hidden = false; var t = d3.select("#proxy-table"), sc = PLN.state_comparison, cols = Object.keys(sc[Object.keys(sc)[0]] || {});
      t.html("<tr><th>State</th>" + cols.map(function (c) { return "<th class='n'>" + c.replace("model_share", "proxy (model)").replace("frs_share", "EPA plants").replace("cbp_emp_share", "CBP employment") + "</th>"; }).join("") + "</tr>");
      Object.keys(sc).slice(0, 20).forEach(function (s) { t.append("tr").html("<td>" + s + "</td>" + cols.map(function (c) { return "<td class='n'>" + fmtP(sc[s][c]) + "</td>"; }).join("")); });
      var le = Object.keys(PLN).filter(function (k) { return k.indexOf("log_error") === 0; }).map(function (k) { return k.replace("log_error_vs_", "") + ": rms log error " + PLN[k].rms + " (weighted " + PLN[k].weighted_rms + ", " + PLN[k].n_states + " states)"; }).join("; ");
      d3.select("#proxy-note").text("How far the population proxy is from the measured distribution, by state. " + le + ". A log error of 0.3 means a typical state is off by about 35%; 0.1 means about 10%. " + (D.params.demand_weighting ? "This run's demand weighting: " + D.params.demand_weighting + "." : "")); }
  }
  d3.select("#named-toggle").on("click", function () { S.named = !S.named; d3.select(this).attr("aria-pressed", S.named ? "true" : "false"); S.render(); });
  d3.select("#named-search").on("input", function () { S.namedQ = this.value.trim().toLowerCase(); drawNamed(); drawNamedList(); });
  S.drawNamed = drawNamed;

  /* ---------- demand ---------- */
  var plantsTotal = D.facts.plants_total, corrTons = 53500;
  function renderDemand() {
    S.clearLayers();
    var dem = base.node_demand, tot = d3.sum(dem), plants = D.nodes.map(function (n) { return plantsTotal * dem[n.i] / tot; });
    var sc = S.seq([0, d3.quantile(dem.slice().sort(d3.ascending), 0.95)]);
    var ns = L.nodes.selectAll("rect").data(D.nodes, function (n) { return n.id; }); ns.exit().remove();
    ns.enter().append("rect").attr("class", "node ramp").merge(ns).attr("width", function (n) { return S.sNode(dem[n.i]) * 1.2; }).attr("height", function (n) { return S.sNode(dem[n.i]) * 1.2; }).attr("x", function (n) { return n.x - S.sNode(dem[n.i]) * 0.6; }).attr("y", function (n) { return n.y - S.sNode(dem[n.i]) * 0.6; })
      .style("fill", function (n) { return S.dlayer === "plants" ? "var(--s7)" : sc(dem[n.i]); }).style("opacity", 0.9)
      .on("mousemove", function (ev, n) { var eu = D.enduse.map(function (e) { return e.name + " " + kt(dem[n.i] * e.share); }).slice(0, 4).join("<br>"); S.showTip(ev, "<b>" + n.name + "</b> · " + DIV[n.st] + "<br>" + kt(dem[n.i]) + " of board a year ≈ " + (dem[n.i] / corrTons).toFixed(1) + " corrugator-equivalents<br>≈ " + plants[n.i].toFixed(1) + " of the nation's " + plantsTotal.toLocaleString() + " corrugated facilities, if they follow demand<br><i>end use at national shares:</i><br>" + eu); }).on("mouseleave", S.hideTip);
    S.drawMills({ dim: function () { return true; } }); drawNamed();
    S.setRamp(S.dlayer === "plants" ? null : "markets: board demand, 0 → " + kt(sc.domain()[1]) + " a year");
    var items = [["US box-plant demand, 2026", kt(tot)], ["corrugator-equivalents at 1,000 MMSF each", Math.round(tot / corrTons)], ["FBA count: corrugator plants / facilities", D.facts.corrugator_plants + " / " + plantsTotal.toLocaleString()], ["food & beverage share", D.facts.fnb_share], ["e-commerce share", D.facts.ecom_share]];
    var kk = d3.select("#kpis-demand").selectAll("div.k").data(items); kk.exit().remove(); kk.enter().append("div").attr("class", "k").merge(kk).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; });
    var order = d3.range(D.nodes.length).sort(function (a, b) { return dem[b] - dem[a]; }).slice(0, 40);
    d3.select("#demand-rank").html("<table><tr><th>Market</th><th class='n'>Board</th><th class='n'>Corrugators</th><th class='n'>Facilities</th></tr>" + order.map(function (i) { return "<tr data-node='" + i + "'><td>" + D.nodes[i].name + "</td><td class='n'>" + kt(dem[i]) + "</td><td class='n'>" + (dem[i] / corrTons).toFixed(1) + "</td><td class='n'>" + plants[i].toFixed(0) + "</td></tr>"; }).join("") + "</table>");
  }
  d3.selectAll("button[data-dlayer]").on("click", function () { S.dlayer = this.dataset.dlayer; d3.selectAll("button[data-dlayer]").attr("aria-pressed", function () { return this.dataset.dlayer === S.dlayer ? "true" : "false"; }); S.render(); });
  function drawDemandDetail() {
    var dem = base.node_demand, byDiv = {}; D.nodes.forEach(function (n) { var d = DIV[n.st] || "Other"; byDiv[d] = (byDiv[d] || 0) + dem[n.i]; });
    var divs = Object.keys(byDiv).sort(function (a, b) { return byDiv[b] - byDiv[a]; }), eu = D.enduse.slice(0, 8), w = 900, h = 300, m = { l: 150, r: 20, t: 10, b: 40 }, iw = w - m.l - m.r, ih = h - m.t - m.b, g = S.chartFrame("#enduse-chart", w, h, m);
    var y = d3.scaleBand().domain(divs).range([0, ih]).padding(0.25), x = d3.scaleLinear().domain([0, d3.max(divs, function (d) { return byDiv[d]; }) * 1.05]).nice().range([0, iw]);
    g.append("g").attr("class", "grid-ax").attr("transform", "translate(0," + ih + ")").call(d3.axisBottom(x).ticks(6).tickSize(-ih).tickFormat(function (v) { return (v / 1e6).toFixed(1) + " Mt"; }));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0));
    divs.forEach(function (d) { var acc = 0; eu.forEach(function (e, i) { var v = byDiv[d] * e.share; g.append("rect").attr("x", x(acc) + (i ? 1 : 0)).attr("y", y(d)).attr("width", Math.max(0, x(acc + v) - x(acc) - 1)).attr("height", y.bandwidth()).attr("rx", 1.5).style("fill", "var(--s" + (i + 1) + ")")
        .on("mousemove", function (ev) { S.showTipAt("#enduse-chart", ev, "<b>" + d + "</b><br>" + e.name + ": " + kt(v) + " (" + fmtP(e.share) + " national share)"); }).on("mouseleave", function () { S.hideTipAt("#enduse-chart"); }); acc += v; }); });
    var lg = d3.select("#enduse-chart").append("div").attr("class", "legend"); eu.forEach(function (e, i) { lg.append("span").html("<i style='background:var(--s" + (i + 1) + ")'></i>" + e.name + " " + fmtP(e.share)); });
    d3.select("#enduse-note").html(D.facts.enduse_note);
  }

  /* ---------- backtest ---------- */
  function renderBacktest() { S.clearLayers(); S.scen = "fp2024"; S.drawMills({ fill: function (m) { return m.status === "closed" && (m.closed_year || 0) >= 2025 ? "var(--s8)" : ownerVar(S.ownerIn(m)); }, dim: function (m) { return !(m.status === "closed" && (m.closed_year || 0) >= 2025); } }); S.setRamp(null);
    var B = D.facts.backtest, items = [["US capacity end-2024: model vs AF&PA", B.cap_2024], ["IP US capacity end-2024: model vs 10-K", B.ip_2024], ["2024 US mill shipments: model vs AF&PA production", B.ship_2024], ["Operating rate 2026: model vs AF&PA Q2-2026", B.oprate], ["IP integration: model vs 10-K", B.ip_int], ["Smurfit Westrock integration: model vs implied", B.sw_int]];
    var kk = d3.select("#kpis-bt").selectAll("div.k").data(items); kk.exit().remove(); kk.enter().append("div").attr("class", "k").merge(kk).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; });
    d3.select("#bt-note").html(B.note); }
  function drawBacktestDetail() {
    var t = d3.select("#bt-table"); t.html("<tr><th>Check</th><th class='n'>Model</th><th class='n'>Record</th><th>Source</th></tr>");
    D.facts.reconciliation.forEach(function (r) { t.append("tr").html("<td>" + r[0] + "</td><td class='n'>" + r[1] + "</td><td class='n'>" + r[2] + "</td><td>" + r[3] + "</td>"); });
    var bt = D.backtest.slice().sort(function (a, b) { return a.utilization - b.utilization || a.shadow - b.shadow; }), rank = {}; bt.forEach(function (r, i) { rank[r.mill] = i + 1; });
    var ls = D.local_surplus || {}, lsRank = {}; Object.keys(ls).map(function (k) { return [+k, ls[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (p, i) { lsRank[p[0]] = i + 1; });
    var c = d3.select("#closure-table"); c.html("<tr><th>Mill closed 2025–26</th><th>Owner</th><th class='n'>Capacity</th><th class='n'>LP utilization at 2026 demand</th><th class='n'>Idle rank (1 = idlest of " + bt.length + ")</th><th class='n'>Capacity ÷ demand within 300 mi</th><th class='n'>Surplus rank</th></tr>");
    bt.filter(function (r) { return r.closed_2025_26; }).forEach(function (r) { c.append("tr").html("<td>" + r.name + ", " + r.st + "</td><td>" + r.owner + "</td><td class='n'>" + kt(r.cap) + "</td><td class='n'>" + fmtP(r.utilization) + "</td><td class='n'>" + rank[r.mill] + "</td><td class='n'>" + (ls[r.mill] ? ls[r.mill].toFixed(2) : "—") + "</td><td class='n'>" + (lsRank[r.mill] || "—") + "</td>"); });
    c.append("tr").html("<td colspan='7' style='color:var(--ink-3)'>Mills the LP would idle first instead (lowest utilization at 2026 demand on the 2024 footprint):</td>");
    bt.slice(0, 8).forEach(function (r) { c.append("tr").html("<td>" + r.name + ", " + r.st + "</td><td>" + r.owner + "</td><td class='n'>" + kt(r.cap) + "</td><td class='n'>" + fmtP(r.utilization) + "</td><td class='n'>" + rank[r.mill] + "</td><td class='n'>" + (ls[r.mill] ? ls[r.mill].toFixed(2) : "—") + "</td><td class='n'>" + (lsRank[r.mill] || "—") + "</td>"); });
    d3.select("#closure-note").html(D.facts.closure_note); d3.select("#errorbars").html(D.facts.errorbars || "");
  }

  /* ---------- method ---------- */
  function renderMethod() { S.clearLayers(); S.drawMills({}); S.setRamp(null);
    var k = base.kpi, items = [["mills on the map", D.mills.length + " (" + D.facts.n_us_open + " open in the US)"], ["demand points", D.nodes.length], ["LP size, October 2026", k.n_vars.toLocaleString() + " variables × " + k.n_rows.toLocaleString() + " rows"], ["solve time", k.solve_seconds + " s (HiGHS)"], ["scenarios on this page", Object.keys(D.scenarios).length], ["generated", D.generated]];
    var kk = d3.select("#kpis-method").selectAll("div.k").data(items); kk.exit().remove(); kk.enter().append("div").attr("class", "k").merge(kk).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; }); }

  /* ---------- tabs and dispatch ---------- */
  var TITLES = { thru: ["Every piece of the chain, per day", "The same network read as rates: tons a day out of each mill, truckloads and railcars on the road, MSF a day through each market's corrugators, sheets to the sheet plants, bales back to the recycled mills and the docks."],
    corr: ["The middle men: corrugators and sheet feeders", "458 corrugator plants turn the rolls into board and convert most of it; what they do not convert travels as sheets to about 630 sheet plants. Capacity is width times speed times hours times OEE, and the sheet trade is the same flow problem one layer down."],
    flows: ["Where every ton of board goes", "{{n_us_open}} US containerboard mills, {{n_nodes}} box markets, and the min-cost flow between them. Hover anything; pick a scenario on the right."],
    prospects: ["Will you switch?", "For each market, the cheapest mill by delivered freight and the one behind it. The gap is the price of loyalty. Pick an owner and raise its open-market price to see the call sheet."],
    prices: ["What a thousand square feet of board costs, delivered", "Mill prices from the published index, freight from the flow model, diesel from EIA. Mullen or ECT, your numbers."],
    fiber: ["The boxes come back", "Recovered corrugated flows from where it was used to the recycled mills and export docks that want it. Same network, reversed."],
    demand: ["Where the boxes are made", "Census employment sets each state's share of board demand, the EPA plant registry places it within the state, and the plants themselves are on the map by name. Turn on Named plants and search for a company, a city or a state."],
    backtest: ["Does the model match the record?", "Capacity, shipments, integration and operating rates against the filings and the AF&PA survey, and an honest look at the 2025 closures."],
    method: ["How it is built", "One min-cost flow, expanded for ownership and grade; public data in, a JSON out; every assumption on this page."] };
  function setTab(tab) {
    S.tab = tab; d3.selectAll("nav.tabs button").attr("aria-selected", function () { return this.dataset.tab === tab ? "true" : "false"; });
    ["flows", "corr", "thru", "prospects", "prices", "fiber", "demand", "backtest", "method"].forEach(function (t) { document.getElementById("panel-" + t).hidden = t !== tab; document.getElementById("detail-" + t).hidden = t !== tab; });
    document.getElementById("title").textContent = TITLES[tab][0]; document.getElementById("lede").textContent = TITLES[tab][1].replace("{{n_us_open}}", D.facts.n_us_open).replace("{{n_nodes}}", D.nodes.length);
    document.getElementById("legend").hidden = tab === "prices" || tab === "demand" || tab === "corr" || tab === "thru";
    if (tab !== "backtest" && S.scen === "fp2024" && S._autoScen) { S.scen = "fp2026"; S._autoScen = false; }
    if (tab === "backtest") { S._autoScen = S.scen !== "fp2024"; }
    S.render(); try { location.hash = tab; } catch (e) {}
  }
  S.render = function () { if (S.tab === "flows") S.renderFlows(); else if (S.tab === "corr" && S.renderCorr) S.renderCorr(); else if (S.tab === "thru" && S.renderThru) S.renderThru(); else if (S.tab === "prospects") renderProspects(); else if (S.tab === "prices") renderPrices(); else if (S.tab === "fiber") renderFiber(); else if (S.tab === "demand") renderDemand(); else if (S.tab === "backtest") renderBacktest(); else renderMethod(); };
  d3.selectAll("nav.tabs button").on("click", function () { setTab(this.dataset.tab); });
  d3.selectAll(".list").on("click", function (ev) { var tr = ev.target.closest("tr[data-node]"); if (!tr) return; var n = D.nodes[+tr.dataset.node]; document.getElementById("mapcard").scrollIntoView({ behavior: "smooth", block: "center" }); L.nodes.selectAll("rect").filter(function (d) { return d === n; }).each(function () { var r = this.getBoundingClientRect(); S.showTip({ clientX: r.left + r.width / 2, clientY: r.top }, "<b>" + n.name + "</b>"); }); });
  var themeBtn = document.getElementById("theme"); if (themeBtn) themeBtn.addEventListener("click", function () { var root = document.documentElement, dark = window.matchMedia("(prefers-color-scheme: dark)").matches, cur = root.getAttribute("data-theme") || (dark ? "dark" : "light"), next = cur === "dark" ? "light" : "dark"; root.setAttribute("data-theme", next); try { localStorage.setItem("theme", next); } catch (e) {} });
  try { var saved = localStorage.getItem("theme"); if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved); } catch (e) {}
  new MutationObserver(function () { S.render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { S.render(); });
  /* boot */
  S.renderLegend(); S.drawFlowsDetail(); drawProspectsDetail(); drawPricesDetail(); drawFiberDetail(); drawDemandDetail(); drawNamedList(); drawBacktestDetail();
  var h = (location.hash || "").replace("#", ""); setTab(TITLES[h] ? h : "flows");
})();
