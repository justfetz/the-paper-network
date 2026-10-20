/* The Paper Network dashboard, part 1: data access, shared map, flows tab. Needs d3 v7 and window.PN_DATA / window.PN_BASEMAP. */
(function () {
  var D = window.PN_DATA, BM = window.PN_BASEMAP;
  var fmtT = d3.format(",.0f"), fmtP = d3.format(".0%"), fmt1 = d3.format(".1f");
  var kt = function (v) { return v >= 950000 ? (v / 1e6).toFixed(2) + " Mt" : Math.round(v / 1e3) + " kt"; };
  var musd = function (v) { return "$" + (Math.abs(v) / 1e6).toFixed(Math.abs(v) < 1e7 ? 1 : 0) + "M"; };
  var css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
  var proj = d3.geoConicEqualArea().parallels([29.5, 45.5]).rotate([96, 0]).center([-0.6, 38.7]).scale(1300).translate([487.5, 305]);
  D.mills.forEach(function (m) { var p = proj([m.lon, m.lat]); m.x = p[0]; m.y = p[1]; });
  D.nodes.forEach(function (n, i) { var p = proj([n.lon, n.lat]); n.x = p[0]; n.y = p[1]; n.i = i; });
  D.ports.forEach(function (p) { var q = proj([p.lon, p.lat]); p.x = q[0]; p.y = q[1]; });
  D.occ.ports.forEach(function (p) { var q = proj([p.lon, p.lat]); p.x = q[0]; p.y = q[1]; });
  var OWNERS = D.owner_order, byId = {}; D.mills.forEach(function (m) { byId[m.id] = m; });
  function ownerVar(o) { var i = OWNERS.indexOf(o); return i >= 0 && i < 8 ? "var(--s" + (i + 1) + ")" : "var(--other)"; }
  var GRADE = { kraft_linerboard: "kraft liner", recycled_linerboard: "recycled liner", white_top_linerboard: "white-top liner", semichem_medium: "semichem medium", recycled_medium: "recycled medium" };
  function grades(g) { return String(g || "").split(/[;|]/).filter(Boolean).map(function (x) { return GRADE[x] || x; }).join(", "); }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---------- state ---------- */
  var S = window.PN = { tab: "flows", scen: "fp2026", flows: true, market: true, exports: false, demand: true, millColor: "owner", nodeColor: "none", isolate: null, minflow: 2000,
    grade: "L", shock: "", spec: "ect32", pLiner: +document.getElementById("p-liner").value, pMedium: +document.getElementById("p-medium").value, diesel: "3.75", hike: 70,
    fiberFlows: true, fiberValue: true, dlayer: "demand", cal: "m" };
  S.D = D; S.byId = byId; S.ownerVar = ownerVar; S.kt = kt; S.musd = musd; S.css = css; S.grades = grades; S.MONTHS = MONTHS; S.fmtT = fmtT; S.fmtP = fmtP; S.fmt1 = fmt1;
  function scen() { return D.scenarios[S.scen]; }
  function arcsOf(key) {
    var s = D.scenarios[key]; if (!s.delta_of) return s.arcs;
    var map = new Map(D.scenarios[s.delta_of].arcs.map(function (a) { return [a[0] + "|" + a[1] + "|" + a[3], a]; }));
    s.arcs.forEach(function (a) { var k = a[0] + "|" + a[1] + "|" + a[3]; if (a[2] === 0) map.delete(k); else map.set(k, a); });
    return Array.from(map.values());
  }
  function ownerIn(m) { return S.scen === "fp2024" ? m.owner_2024 : m.owner; }
  function capIn(m) { return S.scen === "fp2024" ? m.cap_2024 : m.cap; }
  var cache = {};
  function derived(key) {
    if (cache[key]) return cache[key];
    var s = D.scenarios[key], arcs = arcsOf(key), byMill = {}, byNode = {};
    arcs.forEach(function (a) { (byMill[a[0]] = byMill[a[0]] || []).push(a); (byNode[a[1]] = byNode[a[1]] || []).push(a); });
    var byPort = {}; s.exports.forEach(function (e) { (byPort[e[1]] = byPort[e[1]] || []).push(e); });
    var active = {}; s.active.forEach(function (g) { active[g] = true; });
    return (cache[key] = { arcs: arcs, byMill: byMill, byNode: byNode, byPort: byPort, active: active });
  }
  S.scen_ = scen; S.derived = derived; S.ownerIn = ownerIn; S.capIn = capIn;

  /* ---------- map scaffold ---------- */
  var W = 975, H = 610, root = d3.select("#map");
  var svg = root.append("svg").attr("viewBox", "0 0 " + W + " " + H).attr("role", "img").attr("aria-label", "Map of US containerboard mills, demand and modeled flows");
  var gBase = svg.append("g"), gArcs = svg.append("g"), gExp = svg.append("g"), gNodes = svg.append("g"), gPorts = svg.append("g"), gMills = svg.append("g"), gLab = svg.append("g");
  gBase.append("path").attr("d", BM.nation).attr("class", "nation"); gBase.append("path").attr("d", BM.mesh).attr("class", "mesh");
  var tip = d3.select("#mapcard").append("div").attr("class", "tip").style("display", "none");
  function showTip(ev, html) {
    var box = document.getElementById("mapcard").getBoundingClientRect(), x = ev.clientX - box.left, y = ev.clientY - box.top;
    tip.html(html).style("display", "block"); var tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    tip.style("left", Math.max(4, Math.min(box.width - tw - 4, x + 14)) + "px").style("top", (y - th - 12 < 4 ? y + 16 : y - th - 12) + "px");
  }
  function hideTip() { tip.style("display", "none"); }
  S.showTip = showTip; S.hideTip = hideTip; S.layers = { arcs: gArcs, exp: gExp, nodes: gNodes, ports: gPorts, mills: gMills, lab: gLab };
  function arcPath(a, b) { var dx = b.x - a.x, dy = b.y - a.y, k = 0.16; return "M" + a.x + "," + a.y + "Q" + ((a.x + b.x) / 2 - dy * k) + "," + ((a.y + b.y) / 2 + dx * k) + " " + b.x + "," + b.y; }
  var rMill = function (cap) { return Math.max(2.4, Math.sqrt(cap / 1e6) * 9); }, sNode = function (t) { return Math.max(1.6, Math.sqrt(t / 1e6) * 7); }, wArc = function (t) { return Math.max(0.35, Math.sqrt(t / 1e6) * 6); };
  S.arcPath = arcPath; S.rMill = rMill; S.sNode = sNode; S.wArc = wArc;
  function seq(domain) { return d3.scaleSequential(d3.interpolateLab(css("--seq-lo"), css("--seq-hi"))).domain(domain); }
  S.seq = seq;
  function setRamp(text) { var r = d3.select("#ramp"); if (!text) { r.attr("hidden", ""); return; } r.attr("hidden", null); d3.select("#ramp-text").text(text); }
  S.setRamp = setRamp;

  /* ---------- generic mill layer (used by every tab) ---------- */
  function drawMills(opts) {
    var s = scen(), dv = derived(S.scen), iso = S.isolate;
    var mills = D.mills.filter(function (m) { return m.country !== "MX" && (dv.active[m.id] || m.status === "closed" || (s.kind === "knockout" && s.mill === m.id)); });
    var off = function (m) { return !dv.active[m.id] || (s.kind === "knockout" && s.mill === m.id); };
    var sel = gMills.selectAll("circle").data(mills, function (m) { return m.id; });
    sel.exit().remove();
    sel.enter().append("circle").attr("class", "mill").merge(sel)
      .attr("cx", function (m) { return m.x; }).attr("cy", function (m) { return m.y; })
      .attr("r", function (m) { return opts && opts.radius ? opts.radius(m) : rMill(capIn(m)); })
      .classed("off", off).classed("dim", function (m) { return (iso && ownerIn(m) !== iso) || (opts && opts.dim && opts.dim(m)); })
      .style("fill", function (m) { if (off(m)) return "none"; return opts && opts.fill ? opts.fill(m) : ownerVar(ownerIn(m)); })
      .style("stroke", function (m) { return off(m) ? "var(--ink-3)" : (opts && opts.stroke ? opts.stroke(m) : ownerVar(ownerIn(m))); })
      .on("mousemove", function (ev, m) { showTip(ev, (opts && opts.tip ? opts.tip(m) : millTip(m, s, dv))); gArcs.selectAll("path").classed("hl", function (a) { return a[0] === m.id; }).classed("fade", function (a) { return a[0] !== m.id; }); })
      .on("mouseleave", function () { hideTip(); gArcs.selectAll("path").classed("hl", false).classed("fade", false); });
    var labs = mills.filter(function (m) { return capIn(m) >= 850000 && dv.active[m.id]; });
    var ls = gLab.selectAll("text").data(labs, function (m) { return m.id; }); ls.exit().remove();
    ls.enter().append("text").merge(ls).attr("x", function (m) { return m.x + rMill(capIn(m)) + 2; }).attr("y", function (m) { return m.y + 3; }).text(function (m) { return m.name; });
  }
  function millTip(m, s, dv) {
    var dests = (dv.byMill[m.id] || []).slice().sort(function (a, b) { return b[2] - a[2]; });
    var exp = s.exports.filter(function (e) { return e[0] === m.id; }).reduce(function (a, e) { return a + e[2]; }, 0);
    var off = !dv.active[m.id] || (s.kind === "knockout" && s.mill === m.id);
    var line = off ? (m.status === "closed" ? "closed " + (m.closed_year || "") : "knocked out in this scenario") : "shipping " + kt(s.shipped[m.id]) + " of " + kt(capIn(m)) + " (" + fmtP(s.util[m.id]) + " loaded) · " + Math.round(capIn(m) / 355) + " t/day";
    return "<b>" + m.name + ", " + m.st + "</b> · " + ownerIn(m) + "<br>" + grades(m.grades) + " · " + kt(capIn(m)) + "/yr<br>" + line +
      (off ? "" : "<br>one more ton of capacity is worth $" + Math.round(s.shadow[m.id]) + "/t to the network" + (exp ? "<br>exports " + kt(exp) : "")) +
      (dests.length ? "<br>" + dests.slice(0, 3).map(function (a) { return "→ " + D.nodes[a[1]].name + " " + kt(a[2]); }).join("<br>") : "") + (m.note ? "<br><i>" + m.note + "</i>" : "");
  }
  S.drawMills = drawMills; S.millTip = millTip;
  function clearLayers() { gArcs.selectAll("*").remove(); gExp.selectAll("*").remove(); gNodes.selectAll("*").remove(); gPorts.selectAll("*").remove(); }
  S.clearLayers = clearLayers;

  /* ---------- flows tab ---------- */
  function renderFlows() {
    var s = scen(), dv = derived(S.scen), iso = S.isolate;
    var shadowScale = seq([0, d3.quantile(s.shadow.filter(function (v) { return v > 0; }).sort(d3.ascending), 0.95) || 1]);
    var mcScale = seq([d3.min(s.node_mc), d3.quantile(s.node_mc.slice().sort(d3.ascending), 0.95)]);
    var arcs = (S.flows || S.market ? dv.arcs : []).filter(function (a) { return a[2] >= S.minflow && ((a[3] === 1 && S.flows) || (a[3] === 0 && S.market)) && (!iso || ownerIn(byId[a[0]]) === iso); }).sort(function (a, b) { return b[2] - a[2]; });
    var as = gArcs.selectAll("path").data(arcs, function (a) { return a[0] + "|" + a[1] + "|" + a[3]; }); as.exit().remove();
    as.enter().append("path").merge(as).attr("d", function (a) { return arcPath(byId[a[0]], D.nodes[a[1]]); }).attr("class", function (a) { return a[3] ? "arc own" : "arc mkt"; })
      .style("stroke", function (a) { return a[3] ? ownerVar(ownerIn(byId[a[0]])) : null; }).style("stroke-width", function (a) { return wArc(a[2]); });
    var ex = S.exports ? s.exports.filter(function (e) { return !iso || ownerIn(byId[e[0]]) === iso; }) : [];
    var es = gExp.selectAll("path").data(ex, function (e) { return e[0] + "|" + e[1]; }); es.exit().remove();
    es.enter().append("path").merge(es).attr("class", "arc exp").attr("d", function (e) { return arcPath(byId[e[0]], D.ports[e[1]]); }).style("stroke", function (e) { return ownerVar(ownerIn(byId[e[0]])); }).style("stroke-width", function (e) { return wArc(e[2]); });
    var ps = gPorts.selectAll("path").data(S.exports ? D.ports : [], function (p) { return p.name; }); ps.exit().remove();
    ps.enter().append("path").attr("class", "port").merge(ps)
      .attr("d", function (p) { var t = (dv.byPort[D.ports.indexOf(p)] || []).reduce(function (a, e) { return a + e[2]; }, 0), r = Math.max(3, Math.sqrt(t / 1e6) * 9); return "M" + p.x + "," + (p.y - r) + "L" + (p.x + r) + "," + (p.y + r) + "L" + (p.x - r) + "," + (p.y + r) + "Z"; })
      .on("mousemove", function (ev, p) { var i = D.ports.indexOf(p), list = (dv.byPort[i] || []).slice().sort(function (a, b) { return b[2] - a[2]; }), t = list.reduce(function (a, e) { return a + e[2]; }, 0); showTip(ev, "<b>" + p.name + "</b><br>export gateway · " + fmtP(p.share) + " of US export tons<br>" + kt(t) + " through here<br>" + list.slice(0, 3).map(function (e) { return byId[e[0]].name + " " + kt(e[2]); }).join("<br>")); })
      .on("mouseleave", hideTip);
    var ns = gNodes.selectAll("rect").data(S.demand ? D.nodes : [], function (n) { return n.id; }); ns.exit().remove();
    ns.enter().append("rect").attr("class", "node").merge(ns)
      .attr("x", function (n) { return n.x - sNode(s.node_demand[n.i]) / 2; }).attr("y", function (n) { return n.y - sNode(s.node_demand[n.i]) / 2; }).attr("width", function (n) { return sNode(s.node_demand[n.i]); }).attr("height", function (n) { return sNode(s.node_demand[n.i]); })
      .classed("ramp", S.nodeColor === "mc").style("fill", function (n) { return S.nodeColor === "mc" ? mcScale(s.node_mc[n.i]) : null; })
      .on("mousemove", function (ev, n) { var list = (dv.byNode[n.i] || []).slice().sort(function (a, b) { return b[2] - a[2]; }); showTip(ev, "<b>" + n.name + "</b><br>" + fmtT(n.pop) + " people in the catchment<br>" + kt(s.node_demand[n.i]) + " of board a year ≈ " + (s.node_demand[n.i] / 53500).toFixed(1) + " corrugator-equivalents<br>delivered marginal cost $" + Math.round(s.node_mc[n.i]) + "/t<br>" + list.slice(0, 4).map(function (a) { var m = byId[a[0]]; return m.name + ", " + m.st + " (" + ownerIn(m) + (a[3] ? ", own" : ", market") + ") " + kt(a[2]); }).join("<br>")); })
      .on("mouseleave", hideTip);
    drawMills({ fill: S.millColor === "shadow" ? function (m) { return shadowScale(s.shadow[m.id]); } : null, stroke: S.millColor === "shadow" ? function () { return "var(--bg)"; } : null });
    setRamp(S.millColor === "shadow" ? "mills: value of one more ton, $0 → $" + Math.round(shadowScale.domain()[1]) + "/t" : S.nodeColor === "mc" ? "demand: delivered marginal cost, $" + Math.round(mcScale.domain()[0]) + " → $" + Math.round(mcScale.domain()[1]) + "/t" : null);
    renderKpis();
  }
  function renderKpis() {
    var s = scen(), k = s.kpi, b = D.scenarios.fp2026.kpi, isBase = S.scen === "fp2026" || S.scen === "fp2024";
    var delta = function (v, bv, f, unit) { if (isBase) return ""; var d = v - bv; return "<span class='d'> " + (d >= 0 ? "+" : "−") + f(Math.abs(d)) + unit + " vs Oct 2026</span>"; };
    var items = [["scenario", s.label], ["board shipped", kt(k.tons_shipped_domestic) + delta(k.tons_shipped_domestic, b.tons_shipped_domestic, kt, "")], ["exported", kt(k.tons_exported)],
      ["average haul", Math.round(k.avg_haul_miles) + " mi" + delta(k.avg_haul_miles, b.avg_haul_miles, function (v) { return Math.round(v); }, " mi")], ["by rail", fmtP(k.rail_share)],
      ["freight", "$" + fmt1(k.avg_freight_per_ton) + "/t · " + musd(k.freight_usd) + delta(k.freight_usd, b.freight_usd, musd, "")],
      ["bought outside own system", kt(k.owner_purchased_from_market_tons)], ["unmet demand", k.unmet_tons > 0 ? kt(k.unmet_tons) : "none"]];
    if (s.kind === "month") items.push(["outage cost this month", musd(s.outage_penalty_usd) + " · " + s.mills_down.length + " mills down, " + kt(s.tons_offline) + " offline"]);
    var sel = d3.select("#kpis").selectAll("div.k").data(items); sel.exit().remove();
    sel.enter().append("div").attr("class", "k").merge(sel).classed("warn", function (d) { return d[0] === "unmet demand" && d[1] !== "none"; }).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; });
  }
  S.renderFlows = renderFlows;
  function renderLegend() {
    var caps = {}; D.mills.forEach(function (m) { if (m.country !== "MX" && m.status === "open") caps[m.owner] = (caps[m.owner] || 0) + m.cap; });
    var rows = OWNERS.slice(0, 8).map(function (o) { return { o: o, cap: caps[o] || 0 }; }); rows.push({ o: "Other", cap: OWNERS.slice(8).reduce(function (a, o) { return a + (caps[o] || 0); }, 0) });
    var sel = d3.select("#legend").selectAll("button").data(rows);
    sel.enter().append("button").attr("type", "button").merge(sel).attr("aria-pressed", function (d) { return S.isolate === d.o ? "true" : "false"; })
      .html(function (d) { return "<i style='background:" + (d.o === "Other" ? "var(--other)" : ownerVar(d.o)) + "'></i>" + d.o + " <span>" + kt(d.cap) + "</span>"; })
      .on("click", function (ev, d) { S.isolate = S.isolate === d.o ? null : (d.o === "Other" ? null : d.o); renderLegend(); S.render(); });
  }
  S.renderLegend = renderLegend;

  /* ---------- flows controls ---------- */
  function setScen(key) { S.scen = key; d3.selectAll("#scen button").attr("aria-pressed", function () { return this.dataset.scen === key ? "true" : "false"; }); S.render(); }
  S.setScen = setScen;
  d3.selectAll("#scen button").on("click", function () { d3.select("#month").property("value", ""); d3.select("#ko").property("value", ""); setScen(this.dataset.scen); });
  var monthSel = d3.select("#month");
  ["m", "o"].forEach(function (pfx) {
    var og = monthSel.append("optgroup").attr("label", pfx === "m" ? "Staggered calendar (as drawn)" : "Dual-priced assignment");
    og.selectAll("option").data(d3.range(1, 13)).enter().append("option").attr("value", function (m) { return pfx + (m < 10 ? "0" + m : m); })
      .text(function (m) { var s = D.scenarios[pfx + (m < 10 ? "0" + m : m)]; return MONTHS[m - 1] + " · " + s.mills_down.length + " mills down · " + kt(s.tons_offline) + " offline · " + musd(s.outage_penalty_usd); });
  });
  monthSel.on("change", function () { if (this.value) { d3.select("#ko").property("value", ""); d3.selectAll("#scen button").attr("aria-pressed", "false"); S.scen = this.value; S.render(); } });
  var koSel = d3.select("#ko");
  koSel.selectAll("option.k").data(D.knockouts.slice().sort(function (a, b) { return b.d_total - a.d_total; })).enter().append("option").attr("class", "k").attr("value", function (k) { return "ko" + k.mill; })
    .text(function (k) { return k.name + ", " + k.st + " (" + k.owner + ") · +" + musd(k.d_total) + "/yr" + (k.unmet > 0 ? " · " + kt(k.unmet) + " unmet" : ""); });
  koSel.on("change", function () { if (this.value) { d3.select("#month").property("value", ""); d3.selectAll("#scen button").attr("aria-pressed", "false"); S.scen = this.value; S.render(); } });
  d3.selectAll("#layers button").on("click", function () {
    var k = this.dataset.layer;
    if (k === "flows" || k === "market" || k === "exports" || k === "demand") S[k] = !S[k];
    if (k === "shadow") S.millColor = S.millColor === "shadow" ? "owner" : "shadow";
    if (k === "mc") S.nodeColor = S.nodeColor === "mc" ? "none" : "mc";
    d3.selectAll("#layers button").attr("aria-pressed", function () { var q = this.dataset.layer; return (q === "shadow" ? S.millColor === "shadow" : q === "mc" ? S.nodeColor === "mc" : S[q]) ? "true" : "false"; });
    S.render();
  });
  d3.select("#minflow").on("input", function () { S.minflow = +this.value; d3.select("#minflow-v").text(kt(S.minflow)); S.render(); });

  /* ---------- flows detail charts ---------- */
  function chartFrame(id, w, h, m) { var host = d3.select(id); host.selectAll("svg").remove(); var s = host.append("svg").attr("viewBox", "0 0 " + w + " " + h); return s.append("g").attr("transform", "translate(" + m.l + "," + m.t + ")"); }
  function showTipAt(id, ev, html) { var box = d3.select(id); var t = box.select(".tip"); if (t.empty()) t = box.append("div").attr("class", "tip"); var r = box.node().getBoundingClientRect(); t.html(html).style("display", "block").style("left", Math.max(0, Math.min(r.width - 200, ev.clientX - r.left + 12)) + "px").style("top", (ev.clientY - r.top - 44) + "px"); }
  function hideTipAt(id) { d3.select(id).select(".tip").style("display", "none"); }
  S.chartFrame = chartFrame; S.showTipAt = showTipAt; S.hideTipAt = hideTipAt;
  function drawHaul() {
    var rows = D.scenarios.fp2026.haul, w = 640, h = 220, m = { l: 44, r: 12, t: 12, b: 34 }, iw = w - m.l - m.r, ih = h - m.t - m.b, g = chartFrame("#haul", w, h, m);
    var x = d3.scaleBand().domain(rows.map(function (r) { return r[0]; })).range([0, iw]).padding(0.28), y = d3.scaleLinear().domain([0, d3.max(rows, function (r) { return r[1] + r[2]; }) * 1.08]).nice().range([ih, 0]);
    g.append("g").attr("class", "grid-ax").call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat(function (v) { return (v / 1e6).toFixed(0) + " Mt"; }));
    g.append("g").attr("class", "axis").attr("transform", "translate(0," + ih + ")").call(d3.axisBottom(x).tickSize(0));
    g.append("text").attr("class", "axlab").attr("x", iw / 2).attr("y", ih + 30).attr("text-anchor", "middle").text("road miles, mill to box plant");
    var b = g.selectAll("g.b").data(rows).enter().append("g").attr("class", "b");
    b.append("rect").attr("class", "truck").attr("x", function (r) { return x(r[0]); }).attr("width", x.bandwidth()).attr("y", function (r) { return y(r[1]); }).attr("height", function (r) { return Math.max(0, ih - y(r[1])); }).attr("rx", 2);
    b.append("rect").attr("class", "rail").attr("x", function (r) { return x(r[0]); }).attr("width", x.bandwidth()).attr("y", function (r) { return y(r[1] + r[2]); }).attr("height", function (r) { return Math.max(0, y(r[1]) - y(r[1] + r[2]) - (r[2] > 0 ? 2 : 0)); }).attr("rx", 2);
    b.append("text").attr("class", "val").attr("x", function (r) { return x(r[0]) + x.bandwidth() / 2; }).attr("y", function (r) { return y(r[1] + r[2]) - 5; }).attr("text-anchor", "middle").text(function (r) { return ((r[1] + r[2]) / 1e6).toFixed(1); });
    b.on("mousemove", function (ev, r) { showTipAt("#haul", ev, "<b>" + r[0] + " miles</b><br>truck " + kt(r[1]) + "<br>rail " + kt(r[2])); }).on("mouseleave", function () { hideTipAt("#haul"); });
  }
  function drawIntegration() {
    var integ = D.scenarios.fp2026.integration, rep = D.reported_integration || {};
    var rows = Object.keys(integ).map(function (o) { var v = integ[o], tot = v.total + v.exports; return { o: o, tot: tot, own: tot ? v.internal / tot : 0, mkt: v.market, exp: v.exports, buy: v.bought_from_market }; }).filter(function (r) { return r.tot > 0; }).sort(function (a, b) { return b.tot - a.tot; });
    var t = d3.select("#integ"); t.html("<tr><th>Owner</th><th class='n'>Shipped</th><th class='n'>To own plants</th><th class='n'>Sold</th><th class='n'>Exported</th><th class='n'>Bought outside</th><th>Disclosed</th></tr>");
    rows.forEach(function (r) { t.append("tr").html("<td>" + r.o + "</td><td class='n'>" + kt(r.tot) + "</td><td class='n'>" + fmtP(r.own) + "</td><td class='n'>" + kt(r.mkt) + "</td><td class='n'>" + kt(r.exp) + "</td><td class='n'>" + kt(r.buy) + "</td><td>" + (rep[r.o] || "not disclosed") + "</td>"); });
  }
  function drawMonths() {
    var pfx = S.cal, months = d3.range(1, 13).map(function (m) { var s = D.scenarios[pfx + (m < 10 ? "0" + m : m)]; return { m: m, off: s.tons_offline, down: s.mills_down.length, pen: s.outage_penalty_usd, unmet: s.kpi.unmet_tons - (s.noout ? s.noout.unmet_tons : 0) }; });
    var w = 640, h = 190, m = { l: 48, r: 12, t: 14, b: 26 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
    var x = d3.scaleBand().domain(months.map(function (d) { return d.m; })).range([0, iw]).padding(0.3);
    var g1 = chartFrame("#months-off", w, h, m), y1 = d3.scaleLinear().domain([0, Math.max(1, d3.max(months, function (d) { return d.off; })) * 1.15]).nice().range([ih, 0]);
    g1.append("g").attr("class", "grid-ax").call(d3.axisLeft(y1).ticks(4).tickSize(-iw).tickFormat(function (v) { return (v / 1e3).toFixed(0) + " kt"; }));
    g1.append("g").attr("class", "axis").attr("transform", "translate(0," + ih + ")").call(d3.axisBottom(x).tickSize(0).tickFormat(function (d) { return MONTHS[d - 1][0]; }));
    g1.selectAll("rect").data(months).enter().append("rect").attr("class", "off").attr("x", function (d) { return x(d.m); }).attr("width", x.bandwidth()).attr("y", function (d) { return y1(d.off); }).attr("height", function (d) { return Math.max(0, ih - y1(d.off)); }).attr("rx", 2)
      .on("mousemove", function (ev, d) { showTipAt("#months-off", ev, "<b>" + MONTHS[d.m - 1] + "</b><br>" + d.down + " mills in planned outage<br>" + kt(d.off) + " of capacity offline"); }).on("mouseleave", function () { hideTipAt("#months-off"); });
    g1.selectAll("text.val").data(months).enter().append("text").attr("class", "val").attr("x", function (d) { return x(d.m) + x.bandwidth() / 2; }).attr("y", function (d) { return y1(d.off) - 4; }).attr("text-anchor", "middle").text(function (d) { return d.down || ""; });
    var g2 = chartFrame("#months-cost", w, h, m), y2 = d3.scaleLinear().domain([0, Math.max(1e6, d3.max(months, function (d) { return d.pen; })) * 1.15]).nice().range([ih, 0]);
    g2.append("g").attr("class", "grid-ax").call(d3.axisLeft(y2).ticks(4).tickSize(-iw).tickFormat(function (v) { return "$" + (v / 1e6).toFixed(0) + "M"; }));
    g2.append("g").attr("class", "axis").attr("transform", "translate(0," + ih + ")").call(d3.axisBottom(x).tickSize(0).tickFormat(function (d) { return MONTHS[d - 1][0]; }));
    g2.selectAll("rect").data(months).enter().append("rect").attr("class", pfx === "o" ? "cost opt" : "cost").attr("x", function (d) { return x(d.m); }).attr("width", x.bandwidth()).attr("y", function (d) { return y2(Math.max(0, d.pen)); }).attr("height", function (d) { return Math.max(0, ih - y2(Math.max(0, d.pen))); }).attr("rx", 2)
      .on("mousemove", function (ev, d) { showTipAt("#months-cost", ev, "<b>" + MONTHS[d.m - 1] + "</b><br>outage cost " + musd(d.pen) + " (monthly rate)<br>freight + outside purchases at $150/t + unmet at $400/t" + (d.unmet > 1000 ? "<br>unmet demand " + kt(d.unmet) : "")); }).on("mouseleave", function () { hideTipAt("#months-cost"); })
      .on("click", function (ev, d) { d3.select("#month").property("value", pfx + (d.m < 10 ? "0" + d.m : d.m)); d3.selectAll("#scen button").attr("aria-pressed", "false"); S.scen = pfx + (d.m < 10 ? "0" + d.m : d.m); S.render(); });
    var co = D.calendar_opt; d3.select("#cal-note").text((pfx === "m" ? "Staggered calendar as drawn: " : "Calendar from the assignment problem: ") + musd(pfx === "m" ? co.random_actual_annual_penalty : co.opt_actual_annual_penalty) + " a year of outage cost across the twelve months, against a dual-price estimate of " + musd(pfx === "m" ? co.random_est : co.opt_est) + ". Same " + co.assignments.length + " outages, same durations; only the months moved.");
  }
  d3.selectAll("button[data-cal]").on("click", function () { S.cal = this.dataset.cal; d3.selectAll("button[data-cal]").attr("aria-pressed", function () { return this.dataset.cal === S.cal ? "true" : "false"; }); drawMonths(); });
  function drawKnockouts() {
    var rows = D.knockouts.slice().sort(function (a, b) { return b.d_total - a.d_total; }), w = 900, rowH = 22, m = { l: 200, r: 90, t: 8, b: 26 }, h = m.t + m.b + rows.length * rowH, iw = w - m.l - m.r, g = chartFrame("#ko-chart", w, h, m);
    var x = d3.scaleLinear().domain([0, d3.max(rows, function (r) { return Math.max(0, r.d_total); }) * 1.05]).nice().range([0, iw]), y = d3.scaleBand().domain(rows.map(function (r) { return r.mill; })).range([0, rows.length * rowH]).padding(0.25);
    g.append("g").attr("class", "grid-ax").attr("transform", "translate(0," + rows.length * rowH + ")").call(d3.axisBottom(x).ticks(5).tickSize(-rows.length * rowH).tickFormat(function (v) { return "+$" + (v / 1e6).toFixed(0) + "M"; }));
    var r = g.selectAll("g.r").data(rows).enter().append("g").attr("class", "r").attr("transform", function (d) { return "translate(0," + y(d.mill) + ")"; });
    r.append("rect").attr("x", 0).attr("width", function (d) { return Math.max(0, x(Math.max(0, d.d_total))); }).attr("height", y.bandwidth()).attr("rx", 2).style("fill", function (d) { return ownerVar(d.owner); });
    r.append("text").attr("class", "lab").attr("x", -8).attr("y", y.bandwidth() / 2 + 4).attr("text-anchor", "end").text(function (d) { return d.name + ", " + d.st; });
    r.append("text").attr("class", "val").attr("x", function (d) { return Math.max(0, x(Math.max(0, d.d_total))) + 5; }).attr("y", y.bandwidth() / 2 + 4).text(function (d) { return "+" + musd(d.d_total) + " · " + kt(d.cap) + (d.unmet > 0 ? " · " + kt(d.unmet) + " unmet" : ""); });
    r.on("mousemove", function (ev, d) { showTipAt("#ko-chart", ev, "<b>" + d.name + ", " + d.st + "</b> (" + d.owner + ", " + kt(d.cap) + ")<br>network cost if it vanished: +" + musd(d.d_total) + "/yr<br>freight " + (d.d_freight >= 0 ? "+" : "−") + musd(d.d_freight) + "; owner buys " + kt(d.owner_buys) + " outside<br>average haul " + (d.d_haul >= 0 ? "+" : "") + d.d_haul + " mi" + (d.unmet > 0 ? "<br>" + kt(d.unmet) + " cannot be served" : "")); })
     .on("mouseleave", function () { hideTipAt("#ko-chart"); })
     .on("click", function (ev, d) { d3.select("#ko").property("value", "ko" + d.mill); d3.select("#month").property("value", ""); d3.selectAll("#scen button").attr("aria-pressed", "false"); S.scen = "ko" + d.mill; S.render(); document.getElementById("mapcard").scrollIntoView({ behavior: "smooth", block: "center" }); });
  }
  S.drawFlowsDetail = function () { drawHaul(); drawIntegration(); drawMonths(); drawKnockouts(); };
})();
