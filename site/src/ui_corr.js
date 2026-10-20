/* The Paper Network dashboard, part 3: the corrugator tier (middle men). */
(function () {
  var S = window.PN, D = S.D, C = D.corr, byId = S.byId, kt = S.kt, musd = S.musd, fmtP = S.fmtP, fmtT = S.fmtT, L = S.layers;
  if (!C) return;
  var base = D.scenarios.fp2026, N = C.nodes, tpm = C.tons_per_mmsf;
  var mmsf = function (t) { return (t / tpm / 1000).toFixed(t / tpm >= 950 ? 2 : 1) + (t / tpm >= 950 ? " BSF" : " BSF"); };
  var bsf = function (t) { return (t / tpm / 1000).toFixed(1) + " BSF"; }, mm = function (t) { return Math.round(t / tpm).toLocaleString() + " MMSF"; };
  S.cl = { util: true, sheets: true, value: false }; S.cw = "98";
  var inflow = {}, outflow = {}; C.flows.forEach(function (f) { (inflow[f[1]] = inflow[f[1]] || []).push(f); (outflow[f[0]] = outflow[f[0]] || []).push(f); });
  function renderCorr() {
    S.clearLayers();
    var utilScale = S.seq([0.5, 1.0]), valScale = S.seq([0, d3.quantile(N.map(function (n) { return n.sheet_value; }).filter(function (v) { return v > 0; }).sort(d3.ascending), 0.95) || 1]);
    var fl = S.cl.sheets ? C.flows.filter(function (f) { return f[2] >= 3000; }) : [];
    var as = L.arcs.selectAll("path").data(fl, function (f) { return f[0] + "|" + f[1]; }); as.exit().remove();
    as.enter().append("path").merge(as).attr("class", "arc occ").attr("d", function (f) { return S.arcPath(D.nodes[f[0]], D.nodes[f[1]]); }).style("stroke-width", function (f) { return S.wArc(f[2] * 2); });
    var ns = L.nodes.selectAll("rect").data(D.nodes, function (n) { return n.id; }); ns.exit().remove();
    ns.enter().append("rect").attr("class", "node").merge(ns).classed("ramp", true)
      .attr("width", function (n) { var c = N[n.i]; return c.has_corrugator ? Math.max(3, Math.sqrt((c.corr_capacity + c.feeder_capacity) / 1e6) * 7) : 3; }).attr("height", function (n) { var c = N[n.i]; return c.has_corrugator ? Math.max(3, Math.sqrt((c.corr_capacity + c.feeder_capacity) / 1e6) * 7) : 3; })
      .attr("x", function (n) { var c = N[n.i], s = c.has_corrugator ? Math.max(3, Math.sqrt((c.corr_capacity + c.feeder_capacity) / 1e6) * 7) : 3; return n.x - s / 2; }).attr("y", function (n) { var c = N[n.i], s = c.has_corrugator ? Math.max(3, Math.sqrt((c.corr_capacity + c.feeder_capacity) / 1e6) * 7) : 3; return n.y - s / 2; })
      .attr("rx", function (n) { return N[n.i].has_corrugator ? 0 : 1.5; })
      .style("fill", function (n) { var c = N[n.i]; if (!c.has_corrugator) return S.cl.value ? valScale(c.sheet_value) : "none"; return S.cl.value ? valScale(c.sheet_value) : (S.cl.util ? utilScale(c.utilization) : "var(--ink-3)"); })
      .style("stroke", function (n) { return N[n.i].has_corrugator ? "var(--bg)" : "var(--ink-2)"; }).style("stroke-width", function (n) { return N[n.i].has_corrugator ? 0.4 : 0.8; }).style("opacity", 0.95)
      .on("mousemove", function (ev, n) { var c = N[n.i], inn = (inflow[n.i] || []).slice().sort(function (a, b) { return b[2] - a[2]; }), out = (outflow[n.i] || []).slice().sort(function (a, b) { return b[2] - a[2]; });
        S.showTip(ev, "<b>" + n.name + "</b><br>" + (c.has_corrugator ? c.corrugators.toFixed(1) + " corrugator plants expected" + (c.feeders > 0.05 ? " + " + c.feeders.toFixed(1) + " sheet feeders" : "") + " · " + c.sheet_plants.toFixed(0) + " sheet plants<br>capacity " + mm(c.corr_capacity + c.feeder_capacity) + ", " + fmtP(c.utilization) + " loaded<br>converts " + mm(c.own_conversion) + " itself, sells " + mm(c.sheets_sold) + " of sheets" + (c.hours_value > 0.5 ? "<br>one more MMSF of corrugator capacity is worth $" + Math.round(c.hours_value * tpm).toLocaleString() + " a year here" : "") : "no corrugator pencils out at " + kt(base.node_demand[n.i]) + " of local board; " + c.sheet_plants.toFixed(1) + " sheet plants buy in") +
          "<br>sheet demand " + mm(c.sheet_demand) + " · marginal sheet costs $" + (c.sheet_value / tpm).toFixed(2) + "/MSF of freight" + (inn.length ? "<br>sheets from: " + inn.slice(0, 3).map(function (f) { return D.nodes[f[0]].name + " " + mm(f[2]); }).join(", ") : "") + (out.length ? "<br>sheets to: " + out.slice(0, 3).map(function (f) { return D.nodes[f[1]].name + " " + mm(f[2]); }).join(", ") : "")); }).on("mouseleave", S.hideTip);
    S.drawMills({ dim: function () { return true; } });
    S.setRamp(S.cl.value ? "markets: freight in the marginal sheet, $0 → $" + (valScale.domain()[1] / tpm).toFixed(1) + "/MSF" : S.cl.util ? "markets with corrugators: load on corrugator capacity, 50% → 100% (hollow squares: no corrugator)" : null);
    var k = C.kpi, items = [["corrugator plants · sheet feeders · sheet plants", C.params.corrugator_plants + " · " + C.params.sheet_feeders + " · " + C.params.sheet_plants], ["fleet capacity at " + C.params.oee * 100 + "% OEE", bsf(k.corrugator_capacity + k.feeder_capacity) + " (" + C.avg_corrugator_mmsf.toLocaleString() + " MMSF avg)"],
      ["board to run through them", bsf(k.board_total) + " for " + k.shipped_bsf.toFixed(0) + " BSF of boxes (FBA 2024: 381)"], ["fleet load", fmtP(k.national_utilization)], ["sheet trade", bsf(k.sheets_shipped) + " · avg haul " + Math.round(k.avg_sheet_haul) + " mi"], ["markets with no corrugator", k.markets_without_corrugator + " of " + D.nodes.length], ["sheet freight bill", musd(k.sheet_freight_usd) + "/yr"]];
    var kk = d3.select("#kpis-corr").selectAll("div.k").data(items); kk.exit().remove(); kk.enter().append("div").attr("class", "k").merge(kk).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; });
    var order = d3.range(D.nodes.length).filter(function (i) { return N[i].hours_value > 0.5 || N[i].sheet_demand > 20000; }).sort(function (a, b) { return N[b].hours_value - N[a].hours_value || N[b].sheet_demand - N[a].sheet_demand; }).slice(0, 40);
    d3.select("#corr-rank").html("<table><tr><th>Market</th><th class='n'>Load</th><th class='n'>$/MMSF-yr of hours</th><th class='n'>Sheets bought</th></tr>" + order.map(function (i) { var c = N[i]; return "<tr data-node='" + i + "' class='" + (c.hours_value * tpm > 20000 ? "hot" : "") + "'><td>" + D.nodes[i].name + (c.has_corrugator ? "" : " <span class='pill'>no corrugator</span>") + "</td><td class='n'>" + (c.has_corrugator ? fmtP(c.utilization) : "—") + "</td><td class='n'>$" + Math.round(c.hours_value * tpm).toLocaleString() + "</td><td class='n'>" + mm(c.sheet_demand) + "</td></tr>"; }).join("") + "</table>");
  }
  d3.selectAll("button[data-clayer]").on("click", function () { var k = this.dataset.clayer; S.cl[k] = !S.cl[k]; if (k === "value" && S.cl.value) S.cl.util = false; if (k === "util" && S.cl.util) S.cl.value = false; d3.selectAll("button[data-clayer]").attr("aria-pressed", function () { return S.cl[this.dataset.clayer] ? "true" : "false"; }); S.render(); });
  /* ---------- calculator ---------- */
  var SPEC = { liner: 70, medium: 26 * 1.43, extra: 3 };
  function calc() {
    var w = +S.cw, fpm = +document.getElementById("c-fpm").value || 0, hours = +document.getElementById("c-hours").value || 0, oee = (+document.getElementById("c-oee").value || 0) / 100, trim = (+document.getElementById("c-trim").value || 0) / 100;
    var conv = +document.getElementById("c-conv").value || 0, sheet = +document.getElementById("c-sheet").value || 0;
    var gross = w / 12 * fpm * 60 * hours * oee / 1e6, net = gross * (1 - trim), lb = SPEC.liner + SPEC.medium + SPEC.extra, tons = gross * lb / 2;
    var paper = (SPEC.liner * S.pLiner + SPEC.medium * S.pMedium) / 2000 / (1 - trim), margin = sheet - paper - conv;
    var items = [["board made", gross.toFixed(0) + " MMSF/yr gross · " + net.toFixed(0) + " net of trim"], ["rolls consumed", kt(tons) + "/yr · " + (tons / 22 / 250).toFixed(1) + " truckloads a day (or " + (tons / 80 / 250).toFixed(1) + " railcars)"], ["outbound as sheets", (net * 1000 / 227 / 250).toFixed(1) + " trailer loads a day at ~227 MSF a load"],
      ["paper cost in a sheet", "$" + paper.toFixed(2) + "/MSF at $" + S.pLiner + " liner, $" + S.pMedium + " medium, " + (trim * 100).toFixed(0) + "% trim"], ["margin at $" + sheet + "/MSF sheets", (margin >= 0 ? "$" : "−$") + Math.abs(margin).toFixed(2) + "/MSF · " + musd(margin * net * 1000) + "/yr if all sold as sheets"], ["share of US fleet", fmtP(gross / (C.kpi.corrugator_capacity / tpm / 1000 * 1000) ) + " of the 458-plant capacity"]];
    var kk = d3.select("#kpis-calc").selectAll("div.k").data(items); kk.exit().remove(); kk.enter().append("div").attr("class", "k").merge(kk).classed("warn", function (d) { return d[0].indexOf("margin") === 0 && margin < 0; }).html(function (d) { return "<span>" + d[0] + "</span><b>" + d[1] + "</b>"; });
    d3.select("#calc-note").text("Design speeds run 1,000–1,500 fpm; a fleet average of 800–1,000 fpm running and 50–60% OEE is the usual planning number (FEFCO calls 85% world class). The mill prices come from the Prices tab's inputs. Conversion cost and sheet price are yours to set: the published index does not cover sheets.");
    var t = d3.select("#width-table"); t.html("<tr><th>Width</th><th class='n'>MMSF/yr</th><th class='n'>Board tons/yr</th><th class='n'>Rolls/day</th></tr>");
    [87, 98, 110].forEach(function (wi) { var g = wi / 12 * fpm * 60 * hours * oee / 1e6, tn = g * lb / 2; t.append("tr").html("<td>" + wi + " in" + (wi === w ? " <span class='pill model'>selected</span>" : "") + "</td><td class='n'>" + g.toFixed(0) + "</td><td class='n'>" + kt(tn) + "</td><td class='n'>" + (tn / 22 / 250).toFixed(1) + "</td>"); });
  }
  d3.selectAll("button[data-cw]").on("click", function () { S.cw = this.dataset.cw; d3.selectAll("button[data-cw]").attr("aria-pressed", function () { return this.dataset.cw === S.cw ? "true" : "false"; }); calc(); });
  ["c-fpm", "c-hours", "c-oee", "c-trim", "c-conv", "c-sheet", "p-liner", "p-medium"].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("input", calc); });
  function drawCorrDetail() {
    calc();
    var t = d3.select("#sheet-table"); t.html("<tr><th>Market</th><th class='n'>Sheet plants</th><th class='n'>Sheets bought</th><th>From</th><th class='n'>Avg haul</th><th class='n'>Freight in the marginal sheet</th></tr>");
    var rows = d3.range(D.nodes.length).filter(function (i) { return N[i].sheet_demand > 0; }).sort(function (a, b) { return N[b].sheet_demand - N[a].sheet_demand; }).slice(0, 30);
    rows.forEach(function (i) { var c = N[i], inn = (inflow[i] || []).slice().sort(function (a, b) { return b[2] - a[2]; }), haul = inn.length ? inn.reduce(function (s, f) { var a = D.nodes[f[0]], b = D.nodes[i]; return s + f[2] * Math.hypot(a.x - b.x, a.y - b.y) * 2.6; }, 0) / inn.reduce(function (s, f) { return s + f[2]; }, 0) : 0;
      t.append("tr").html("<td>" + D.nodes[i].name + (c.has_corrugator ? "" : " <span class='pill'>no corrugator</span>") + "</td><td class='n'>" + c.sheet_plants.toFixed(0) + "</td><td class='n'>" + mm(c.sheet_demand) + "</td><td>" + inn.slice(0, 3).map(function (f) { return D.nodes[f[0]].name; }).join(", ") + "</td><td class='n'>" + Math.round(haul) + " mi</td><td class='n'>$" + (c.sheet_value / tpm).toFixed(2) + "/MSF</td>"); });
    d3.select("#corr-note").html(D.facts.corr_note);
  }
  S.renderCorr = renderCorr; S.drawCorrDetail = drawCorrDetail;
  drawCorrDetail();
})();
