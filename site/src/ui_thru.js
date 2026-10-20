/* The Paper Network dashboard, part 4: throughput of every piece, per day. */
(function () {
  var S = window.PN, D = S.D, C = D.corr, O = D.occ, byId = S.byId, kt = S.kt, musd = S.musd, fmtP = S.fmtP, L = S.layers;
  var base = D.scenarios.fp2026, dv = S.derived("fp2026"), K = base.kpi;
  var TRUCK_T = 22, RAIL_T = 80, SHEET_MSF_LOAD = 227, TPM = C ? C.tons_per_mmsf : 55, BOX_T_PER_MMSF = C ? C.params.tons_per_mmsf_shipped : 82, WASTE = C ? C.params.waste : 0.08;
  S.basis = "day"; S.piece = "mills";
  var div = function () { return S.basis === "day" ? 365 : 1; }, unit = function () { return S.basis === "day" ? "/day" : "/yr"; };
  var tons = function (v) { v = v / div(); return S.basis === "day" ? (v >= 10000 ? Math.round(v / 1000).toLocaleString() + " kt" : Math.round(v).toLocaleString() + " t") : kt(v); };
  var msf = function (boardTons) { var m = boardTons / BOX_T_PER_MMSF / div(); return S.basis === "day" ? (m >= 1000 ? (m / 1000).toFixed(2) + " BSF" : Math.round(m).toLocaleString() + " MMSF") : (m / 1000).toFixed(1) + " BSF"; };
  var loads = function (v, per) { return (v / per / div()).toLocaleString(undefined, { maximumFractionDigits: S.basis === "day" ? 1 : 0 }); };
  var milesOf = function (a, b) { var dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180, la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180, h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2); return 2 * 3958.8 * Math.asin(Math.sqrt(h)) * 1.2; };
  var isRail = function (mi) { return 35 + 0.065 * mi < 8 + 0.125 * mi; };
  /* per-mill modal split from the arcs */
  var millTruck = {}, millRail = {}, millInt = {}, millMkt = {};
  dv.arcs.forEach(function (a) { var m = byId[a[0]], mi = milesOf(m, D.nodes[a[1]]); if (isRail(mi)) millRail[a[0]] = (millRail[a[0]] || 0) + a[2]; else millTruck[a[0]] = (millTruck[a[0]] || 0) + a[2]; if (a[3]) millInt[a[0]] = (millInt[a[0]] || 0) + a[2]; else millMkt[a[0]] = (millMkt[a[0]] || 0) + a[2]; });
  var millExp = {}; base.exports.forEach(function (e) { millExp[e[0]] = (millExp[e[0]] || 0) + e[2]; });
  var totInt = d3.sum(Object.values(millInt)), totMkt = d3.sum(Object.values(millMkt)), totExp = K.tons_exported, totTruck = d3.sum(Object.values(millTruck)), totRail = d3.sum(Object.values(millRail));
  var recycledOut = 0, virginOut = 0; D.mills.forEach(function (m) { var t = base.shipped[m.id] || 0, g = String(m.grades).split(/[;|]/).filter(Boolean), r = g.filter(function (x) { return x.indexOf("recycled") >= 0; }).length / Math.max(1, g.length); recycledOut += t * r; virginOut += t * (1 - r); });
  var occIn = {}; if (O) O.flows.forEach(function (f) { var s = O.sinks[f[1]]; if (s[0] === "mill") occIn[s[1]] = (occIn[s[1]] || 0) + f[2]; });

  function renderThru() {
    S.clearLayers();
    var sc = S.seq([0, d3.quantile(base.node_demand.slice().sort(d3.ascending), 0.95)]);
    var ns = L.nodes.selectAll("rect").data(D.nodes, function (n) { return n.id; }); ns.exit().remove();
    ns.enter().append("rect").attr("class", "node ramp").merge(ns).attr("width", function (n) { return S.sNode(base.node_demand[n.i]); }).attr("height", function (n) { return S.sNode(base.node_demand[n.i]); }).attr("x", function (n) { return n.x - S.sNode(base.node_demand[n.i]) / 2; }).attr("y", function (n) { return n.y - S.sNode(base.node_demand[n.i]) / 2; }).style("fill", function (n) { return sc(base.node_demand[n.i]); })
      .on("mousemove", function (ev, n) { var d = base.node_demand[n.i], c = C ? C.nodes[n.i] : null; S.showTip(ev, "<b>" + n.name + "</b><br>board in: " + tons(d) + unit() + " = " + loads(d, TRUCK_T) + " truckloads" + unit() + " of rolls (if all by road)<br>board made: " + msf(d / (1 - WASTE)) + unit() + " through " + (c ? c.corrugators.toFixed(1) + " corrugator plants" : "its corrugators") + "<br>boxes out: " + msf(d) + unit() + (c && c.sheets_sold > 0 ? "<br>sheets sold: " + msf(c.sheets_sold * BOX_T_PER_MMSF / TPM) + unit() : "")); }).on("mouseleave", S.hideTip);
    S.drawMills({ tip: function (m) { var t = base.shipped[m.id] || 0; return "<b>" + m.name + ", " + m.st + "</b> · " + m.owner + "<br>" + (t ? tons(t) + unit() + " of board (" + fmtP(base.util[m.id]) + " of " + kt(m.cap) + ")<br>" + loads(millTruck[m.id] || 0, TRUCK_T) + " truckloads + " + loads(millRail[m.id] || 0, RAIL_T) + " railcars" + unit() + "<br>own system " + tons(millInt[m.id] || 0) + " · market " + tons(millMkt[m.id] || 0) + " · export " + tons(millExp[m.id] || 0) + (occIn[m.id] ? "<br>OCC in: " + tons(occIn[m.id]) + unit() + " = " + loads(occIn[m.id], TRUCK_T) + " bale trucks" : "") : "not running in this scenario"); } });
    S.setRamp("markets: board consumed, 0 → " + tons(sc.domain()[1]) + unit());
    var items = [["board out of US + Canadian mills", tons(K.tons_shipped_domestic + K.tons_exported) + unit()], ["rolls by truck · by rail", loads(totTruck, TRUCK_T) + " loads · " + loads(totRail, RAIL_T) + " railcars" + unit()], ["through the corrugators", msf(K.tons_shipped_domestic / (1 - WASTE)) + unit() + " of board"],
      ["boxes shipped", msf(K.tons_shipped_domestic) + unit()], ["sheets to sheet plants", C ? msf(C.kpi.sheets_shipped * BOX_T_PER_MMSF / TPM) + unit() + " · " + loads(C.kpi.sheets_shipped / TPM * 1000, SHEET_MSF_LOAD) + " trailer loads" : "—"],
      ["exported board", tons(K.tons_exported) + unit()], ["OCC recovered · to mills · exported", O ? tons(O.kpi.occ_supply) + " · " + tons(O.kpi.occ_to_mills) + " · " + tons(O.kpi.occ_exported) + unit() : "—"]];
    var kk = d3.select("#kpis-thru").selectAll("div.k").data(items); kk.exit().remove(); kk.enter().append("div").attr("class", "k").merge(kk).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; });
    renderList();
  }
  function renderList() {
    var rows, head, title;
    if (S.piece === "mills") { title = "Mills, by board out"; head = "<tr><th>Mill</th><th class='n'>Board" + unit() + "</th><th class='n'>Load</th><th class='n'>Trucks</th><th class='n'>Railcars</th><th class='n'>Own · market · export</th></tr>";
      rows = D.mills.filter(function (m) { return base.shipped[m.id] > 0; }).sort(function (a, b) { return base.shipped[b.id] - base.shipped[a.id]; }).map(function (m) { return "<tr><td>" + m.name + ", " + m.st + " <i style='color:var(--ink-3)'>" + m.owner + "</i></td><td class='n'>" + tons(base.shipped[m.id]) + "</td><td class='n'>" + fmtP(base.util[m.id]) + "</td><td class='n'>" + loads(millTruck[m.id] || 0, TRUCK_T) + "</td><td class='n'>" + loads(millRail[m.id] || 0, RAIL_T) + "</td><td class='n'>" + tons(millInt[m.id] || 0) + " · " + tons(millMkt[m.id] || 0) + " · " + tons(millExp[m.id] || 0) + "</td></tr>"; }); }
    else if (S.piece === "markets") { title = "Corrugator markets, by board run"; head = "<tr><th>Market</th><th class='n'>Plants</th><th class='n'>Board made" + unit() + "</th><th class='n'>Rolls in (trucks)</th><th class='n'>Boxes out</th><th class='n'>Sheets out</th><th class='n'>Load</th></tr>";
      rows = d3.range(D.nodes.length).filter(function (i) { return C && C.nodes[i].has_corrugator; }).sort(function (a, b) { return base.node_demand[b] - base.node_demand[a]; }).slice(0, 150).map(function (i) { var c = C.nodes[i], d = base.node_demand[i]; return "<tr data-node='" + i + "'><td>" + D.nodes[i].name + "</td><td class='n'>" + c.corrugators.toFixed(1) + (c.feeders > 0.05 ? " + " + c.feeders.toFixed(1) + " feeders" : "") + "</td><td class='n'>" + msf((d + c.sheets_sold * BOX_T_PER_MMSF / TPM) / (1 - WASTE)) + "</td><td class='n'>" + loads(d + c.sheets_sold * BOX_T_PER_MMSF / TPM, TRUCK_T) + "</td><td class='n'>" + msf(d - c.sheet_demand * BOX_T_PER_MMSF / TPM) + "</td><td class='n'>" + msf(c.sheets_sold * BOX_T_PER_MMSF / TPM) + "</td><td class='n'>" + fmtP(c.utilization) + "</td></tr>"; }); }
    else if (S.piece === "sheets") { title = "Markets buying sheets"; head = "<tr><th>Market</th><th class='n'>Sheet plants</th><th class='n'>Sheets in" + unit() + "</th><th class='n'>Trailer loads</th><th class='n'>Boxes out</th></tr>";
      rows = d3.range(D.nodes.length).filter(function (i) { return C && C.nodes[i].sheet_demand > 0; }).sort(function (a, b) { return C.nodes[b].sheet_demand - C.nodes[a].sheet_demand; }).slice(0, 150).map(function (i) { var c = C.nodes[i], sm = c.sheet_demand / TPM * 1000; return "<tr data-node='" + i + "'><td>" + D.nodes[i].name + (c.has_corrugator ? "" : " <span class='pill'>no corrugator</span>") + "</td><td class='n'>" + c.sheet_plants.toFixed(0) + "</td><td class='n'>" + (S.basis === "day" ? Math.round(sm / 365).toLocaleString() + " MSF" : Math.round(sm / 1000).toLocaleString() + " MMSF") + "</td><td class='n'>" + loads(sm, SHEET_MSF_LOAD) + "</td><td class='n'>" + (S.basis === "day" ? Math.round(sm * (1 - WASTE) / 365).toLocaleString() + " MSF" : Math.round(sm * (1 - WASTE) / 1000).toLocaleString() + " MMSF") + "</td></tr>"; }); }
    else if (S.piece === "docks") { title = "Export docks and OCC docks"; head = "<tr><th>Gateway</th><th class='n'>Board out" + unit() + "</th><th class='n'>OCC out" + unit() + "</th><th class='n'>Containers (20 t)</th></tr>";
      var occPort = {}; if (O) O.flows.forEach(function (f) { var s = O.sinks[f[1]]; if (s[0] === "port") occPort[O.ports[s[1]].name] = (occPort[O.ports[s[1]].name] || 0) + f[2]; });
      var all = {}; D.ports.forEach(function (p, i) { all[p.name] = { b: (dv.byPort[i] || []).reduce(function (a, e) { return a + e[2]; }, 0), o: 0 }; }); Object.keys(occPort).forEach(function (n) { (all[n] = all[n] || { b: 0, o: 0 }).o = occPort[n]; });
      rows = Object.keys(all).sort(function (a, b) { return (all[b].b + all[b].o) - (all[a].b + all[a].o); }).map(function (n) { return "<tr><td>" + n + "</td><td class='n'>" + tons(all[n].b) + "</td><td class='n'>" + tons(all[n].o) + "</td><td class='n'>" + loads(all[n].b + all[n].o, 20) + "</td></tr>"; }); }
    else if (S.piece === "occ") { title = "Recycled mills, fiber in"; head = "<tr><th>Mill</th><th class='n'>OCC in" + unit() + "</th><th class='n'>Bale trucks</th><th class='n'>Board out" + unit() + "</th><th class='n'>Yield</th></tr>";
      rows = Object.keys(occIn).map(function (id) { return byId[+id]; }).sort(function (a, b) { return occIn[b.id] - occIn[a.id]; }).map(function (m) { return "<tr><td>" + m.name + ", " + m.st + " <i style='color:var(--ink-3)'>" + m.owner + "</i></td><td class='n'>" + tons(occIn[m.id]) + "</td><td class='n'>" + loads(occIn[m.id], TRUCK_T) + "</td><td class='n'>" + tons(base.shipped[m.id] || 0) + "</td><td class='n'>" + (occIn[m.id] ? fmtP((base.shipped[m.id] || 0) / occIn[m.id]) : "—") + "</td></tr>"; }); }
    else { title = "Owners, as systems"; head = "<tr><th>Owner</th><th class='n'>Mills</th><th class='n'>Board out" + unit() + "</th><th class='n'>To own plants</th><th class='n'>Sold</th><th class='n'>Exported</th><th class='n'>Trucks · railcars</th></tr>";
      var own = {}; D.mills.forEach(function (m) { var t = base.shipped[m.id] || 0; if (!t) return; var o = own[m.owner] = own[m.owner] || { n: 0, t: 0, i: 0, k: 0, e: 0, tr: 0, ra: 0 }; o.n++; o.t += t; o.i += millInt[m.id] || 0; o.k += millMkt[m.id] || 0; o.e += millExp[m.id] || 0; o.tr += millTruck[m.id] || 0; o.ra += millRail[m.id] || 0; });
      rows = Object.keys(own).sort(function (a, b) { return own[b].t - own[a].t; }).map(function (o) { var v = own[o]; return "<tr><td><i style='display:inline-block;width:9px;height:9px;border-radius:50%;background:" + S.ownerVar(o) + ";margin-right:6px'></i>" + o + "</td><td class='n'>" + v.n + "</td><td class='n'>" + tons(v.t) + "</td><td class='n'>" + tons(v.i) + "</td><td class='n'>" + tons(v.k) + "</td><td class='n'>" + tons(v.e) + "</td><td class='n'>" + loads(v.tr, TRUCK_T) + " · " + loads(v.ra, RAIL_T) + "</td></tr>"; }); }
    d3.select("#thru-h").text(title); d3.select("#thru-list").html("<table>" + head + rows.join("") + "</table>");
  }
  d3.selectAll("button[data-basis]").on("click", function () { S.basis = this.dataset.basis; d3.selectAll("button[data-basis]").attr("aria-pressed", function () { return this.dataset.basis === S.basis ? "true" : "false"; }); S.render(); drawChain(); });
  d3.select("#piece").on("change", function () { S.piece = this.value; renderList(); });

  /* ---------- the chain: a hand-laid sankey in tons of board per day ---------- */
  function drawChain() {
    var dom = K.tons_shipped_domestic, sheets = C ? C.kpi.sheets_shipped * BOX_T_PER_MMSF / TPM : dom * 0.16, boxes = dom * (1 - WASTE), waste = dom * WASTE;
    var occSup = O ? O.kpi.occ_supply : dom * 0.9, occMill = O ? O.kpi.occ_to_mills : occSup * 0.6, occExp = O ? O.kpi.occ_exported : occSup * 0.27, occNone = O ? O.kpi.occ_unplaced : 0, notRec = Math.max(0, dom * 1.03 - occSup);
    var eu = D.enduse.slice(0, 5); var other = 1 - d3.sum(eu, function (e) { return e.share; });
    var cols = [
      { name: "fiber", nodes: [["OCC into recycled mills", occMill], ["Virgin fiber into kraft mills", virginOut]] },
      { name: "mills", nodes: [["Recycled-fiber board", recycledOut], ["Virgin-fiber board", virginOut]] },
      { name: "sold as", nodes: [["To own box plants", totInt], ["Open market", totMkt], ["Export", totExp]] },
      { name: "moved by", nodes: [["Truck", totTruck], ["Rail", totRail], ["To the docks", totExp]] },
      { name: "converted", nodes: [["Corrugator plants' own boxes", dom - sheets], ["Sheets to sheet plants", sheets], ["Exported", totExp]] },
      { name: "boxes used for", nodes: eu.map(function (e) { return [e.name.split(/[,:&]/)[0].replace("Retail", "Retail & e-com").replace("Durables", "Durables"), boxes * e.share]; }).concat([["Other uses", boxes * other], ["Plant waste", waste], ["Exported board", totExp]]) },
      { name: "after use", nodes: [["OCC to recycled mills", occMill], ["OCC exported", occExp], ["Recovered, no taker", occNone], ["Not recovered", notRec], ["Exported board", totExp]] }];
    // links: each column feeds the next proportionally (a flow accounting, not a traced path)
    var links = [];
    function connect(a, b) { var ta = d3.sum(a.nodes, function (n) { return n[1]; }), tb = d3.sum(b.nodes, function (n) { return n[1]; }); a.nodes.forEach(function (x, i) { b.nodes.forEach(function (y, j) { var v = x[1] * (y[1] / tb); if (v > 0) links.push({ a: a, i: i, b: b, j: j, v: v }); }); }); }
    // special-case the export lane so it stays its own band
    for (var c = 0; c < cols.length - 1; c++) {
      var A = cols[c], B = cols[c + 1], aE = A.nodes.findIndex(function (n) { return /export|docks/i.test(n[0]); }), bE = B.nodes.findIndex(function (n) { return /export|docks/i.test(n[0]); });
      if (aE >= 0 && bE >= 0) { links.push({ a: A, i: aE, b: B, j: bE, v: A.nodes[aE][1] });
        var A2 = { nodes: A.nodes.filter(function (n, i) { return i !== aE; }).map(function (n) { return n; }) }, B2 = { nodes: B.nodes.filter(function (n, j) { return j !== bE; }) };
        var tb = d3.sum(B2.nodes, function (n) { return n[1]; }); A.nodes.forEach(function (x, i) { if (i === aE) return; B.nodes.forEach(function (y, j) { if (j === bE) return; var v = x[1] * (y[1] / tb); if (v > 0) links.push({ a: A, i: i, b: B, j: j, v: v }); }); }); }
      else connect(A, B);
    }
    var w = 1200, h = 520, m = { l: 10, r: 170, t: 28, b: 10 }, iw = w - m.l - m.r, ih = h - m.t - m.b, nodeW = 10, gap = 11;
    var host = d3.select("#chain"); host.selectAll("svg").remove(); host.selectAll(".legend").remove();
    var svg = host.append("svg").attr("viewBox", "0 0 " + w + " " + h); var g = svg.append("g").attr("transform", "translate(" + m.l + "," + m.t + ")");
    var maxTot = d3.max(cols, function (c) { return d3.sum(c.nodes, function (n) { return n[1]; }); }), scale = (ih - gap * 9) / maxTot;
    var x = d3.scalePoint().domain(cols.map(function (c, i) { return i; })).range([0, iw - nodeW]);
    cols.forEach(function (c, ci) { var y0 = 0; c.nodes.forEach(function (n) { n.y0 = y0; n.y1 = y0 + n[1] * scale; y0 = n.y1 + gap; }); c.x = x(ci); });
    var out = {}, inn = {};
    links.forEach(function (l) { var ka = cols.indexOf(l.a) + ":" + l.i, kb = cols.indexOf(l.b) + ":" + l.j; var sa = out[ka] || 0, sb = inn[kb] || 0; l.sy = l.a.nodes[l.i].y0 + sa; l.ty = l.b.nodes[l.j].y0 + sb; out[ka] = sa + l.v * scale; inn[kb] = sb + l.v * scale; });
    var color = function (name) { return /occ|recycled|recover/i.test(name) ? "var(--s3)" : /export|dock/i.test(name) ? "var(--s2)" : /sheet/i.test(name) ? "var(--s7)" : /waste|no taker|not recovered/i.test(name) ? "var(--other)" : /rail/i.test(name) ? "var(--s4)" : "var(--s1)"; };
    g.selectAll("path.link").data(links).enter().append("path").attr("class", "link").attr("fill", "none").style("stroke", function (l) { return color(l.b.nodes[l.j][0]); }).style("opacity", 0.32)
      .style("stroke-width", function (l) { return Math.max(0.6, l.v * scale); })
      .attr("d", function (l) { var x0 = l.a.x + nodeW, x1 = l.b.x, y0 = l.sy + l.v * scale / 2, y1 = l.ty + l.v * scale / 2, xm = (x0 + x1) / 2; return "M" + x0 + "," + y0 + "C" + xm + "," + y0 + " " + xm + "," + y1 + " " + x1 + "," + y1; })
      .on("mousemove", function (ev, l) { S.showTipAt("#chain", ev, "<b>" + l.a.nodes[l.i][0] + " → " + l.b.nodes[l.j][0] + "</b><br>" + tons(l.v) + unit() + (/sheet|boxes|corrugator/i.test(l.b.nodes[l.j][0]) ? " ≈ " + msf(l.v) + unit() : "")); }).on("mouseleave", function () { S.hideTipAt("#chain"); });
    cols.forEach(function (c, ci) {
      var gc = g.append("g").attr("transform", "translate(" + c.x + ",0)");
      gc.append("text").attr("class", "axlab").attr("x", 0).attr("y", -12).attr("text-anchor", "start").style("text-transform", "uppercase").style("letter-spacing", ".08em").text(c.name);
      var nodes = gc.selectAll("g.n").data(c.nodes).enter().append("g").attr("class", "n");
      nodes.append("rect").attr("x", 0).attr("y", function (n) { return n.y0; }).attr("width", nodeW).attr("height", function (n) { return Math.max(1, n.y1 - n.y0); }).attr("rx", 2).style("fill", function (n) { return color(n[0]); })
        .on("mousemove", function (ev, n) { S.showTipAt("#chain", ev, "<b>" + n[0] + "</b><br>" + tons(n[1]) + unit() + (/box|sheet|corrugator|waste|used/i.test(n[0]) || c.name === "boxes used for" ? " ≈ " + msf(n[1]) + unit() : "") + (/truck/i.test(n[0]) ? " = " + loads(n[1], TRUCK_T) + " loads" : /rail/i.test(n[0]) ? " = " + loads(n[1], RAIL_T) + " railcars" : "")); }).on("mouseleave", function () { S.hideTipAt("#chain"); });
      nodes.append("text").attr("class", "lab").attr("x", nodeW + 6).attr("y", function (n) { return (n.y0 + n.y1) / 2 + 3.5; }).attr("text-anchor", "start").style("font-size", "10px")
        .text(function (n) { return (n.y1 - n.y0 >= 8 ? n[0] + " " + tons(n[1]) : ""); });
    });
    d3.select("#chain-note").html("Reading left to right: fiber into the mills, board out by fiber type, who it is sold to, how it moves, what the corrugators do with it, what the boxes carry, and what comes back. Bands between columns are a flow accounting (each column's split applied to the previous one), not traced paths; the export lane is kept separate. Per " + (S.basis === "day" ? "calendar day (annual tons ÷ 365)" : "year") + ". Mills: " + tons(K.tons_shipped_domestic + K.tons_exported) + unit() + "; corrugators: " + msf(dom / (1 - WASTE)) + unit() + " of board for " + msf(dom) + unit() + " of boxes; recovered: " + tons(occSup) + unit() + ".");
    var lt = d3.select("#loads-table"); lt.html("<tr><th>What moves</th><th class='n'>Tons" + unit() + "</th><th class='n'>Unit</th><th class='n'>Loads" + unit() + "</th><th>Note</th></tr>");
    [["Rolls, mill to box plant, by truck", totTruck, TRUCK_T + " t flatbed/van", loads(totTruck, TRUCK_T), "lanes under ~450 road miles"], ["Rolls by rail", totRail, RAIL_T + " t boxcar", loads(totRail, RAIL_T), "Gulf and Southeast to the Midwest and the West"], ["Rolls to the export docks", totExp, "20 t container", loads(totExp, 20), "Laredo, Houston, New Orleans, Savannah lead"],
     ["Sheets, corrugator to sheet plant", sheets, SHEET_MSF_LOAD + " MSF trailer (12–14 t)", loads(sheets / BOX_T_PER_MMSF * 1000, SHEET_MSF_LOAD), "cube-limited; ~20 mi average in the model"], ["Boxes to customers", boxes, "~" + SHEET_MSF_LOAD + " MSF trailer", loads(boxes / BOX_T_PER_MMSF * 1000, SHEET_MSF_LOAD), "the one leg this model does not route"],
     ["OCC bales to recycled mills", occMill, TRUCK_T + " t van", loads(occMill, TRUCK_T), "~190 mi average"], ["OCC bales to the docks", occExp, "20 t container", loads(occExp, 20), "Los Angeles/Long Beach first"]].forEach(function (r) { lt.append("tr").html("<td>" + r[0] + "</td><td class='n'>" + tons(r[1]) + "</td><td class='n'>" + r[2] + "</td><td class='n'>" + r[3] + "</td><td>" + r[4] + "</td>"); });
    var ct = d3.select("#conv-table"); ct.html("<tr><th>Conversion</th><th class='n'>Value</th></tr>");
    [["Board shipped as boxes", BOX_T_PER_MMSF + " t per MMSF (FBA: 34.0 Mt / 416 BSF, 2021)"], ["Combined board, 32 ECT 35-26-35", TPM + " t per MMSF (110 lb/MSF)"], ["Corrugator trim and waste", Math.round(WASTE * 100) + "%"], ["Truckload of rolls", TRUCK_T + " short tons"], ["Boxcar of rolls", RAIL_T + " short tons"], ["Trailer of sheets or boxes", SHEET_MSF_LOAD + " MSF (12–14 t)"], ["Export container", "20 t"], ["Day", "calendar day; multiply by 365/250 for a 5-day working week"]].forEach(function (r) { ct.append("tr").html("<td>" + r[0] + "</td><td class='n'>" + r[1] + "</td>"); });
  }
  S.renderThru = renderThru; S.drawChain = drawChain;
  drawChain();
})();
