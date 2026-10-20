/* The Paper Network dashboard, part 6: the ticker, shareable links, and the first-load draw-in.
   The ticker scrolls the live and modeled numbers along the bottom; every item jumps to the tab and scenario it came from.
   Links: #tab/scenario (e.g. #flows/ko31 = Flows with Mansfield knocked out) are read on load and written on every render. */
(function () {
  var D = window.PN_DATA, S = window.PN; if (!D || !S || !S.setTab) return;
  var P = D.prices || {}, F = P.fred || {}, fp = D.scenarios.fp2026, k = fp.kpi, mills = D.mills;
  function last(series) { var pts = series && (series.points || series); return pts && pts.length ? pts[pts.length - 1] : null; }
  function prev(series) { var pts = series && (series.points || series); return pts && pts.length > 1 ? pts[pts.length - 2] : null; }
  function arrow(a, b) { if (!a || !b) return ""; var d = a[1] - b[1]; return d > 0 ? " ▲" : d < 0 ? " ▼" : " ="; }
  function musd(v) { return "$" + (Math.abs(v) >= 1e9 ? (v / 1e9).toFixed(2) + "B" : Math.round(v / 1e6) + "M"); }
  function kt(t) { return Math.round(t / 1000) + " kt"; }
  function mon(s) { var m = { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" }; var p = String(s || "").split("-"); return p.length > 1 ? m[p[1]] + " " + p[0] : s; }

  // --- links: read #tab/scenario once, write it on every render
  function setScenario(key) {
    if (!D.scenarios[key]) return;
    S.scen = key; var isKo = /^ko/.test(key), isMonth = /^[mo]\d\d$/.test(key);
    d3.select("#ko").property("value", isKo ? key : ""); d3.select("#month").property("value", isMonth ? key : "");
    d3.selectAll("#scen button").attr("aria-pressed", function () { return !isKo && !isMonth && this.dataset.scen === key ? "true" : "false"; });
  }
  var render0 = S.render;
  S.render = function () { render0(); try { history.replaceState(null, "", "#" + S.tab + (S.scen && S.scen !== "fp2026" ? "/" + S.scen : "")); } catch (e) {} };
  (function readHash() { var parts = decodeURIComponent(location.hash || "").replace("#", "").split("/"); if (parts[1] && D.scenarios[parts[1]]) { setScenario(parts[1]); S.render(); } })();
  function jump(tab, scen, after) { if (scen) setScenario(scen); else if (S.scen !== "fp2026" && S.scen !== "fp2024") setScenario("fp2026"); S.setTab(tab); if (after) try { after(); } catch (e) {} window.scrollTo({ top: 0, behavior: "smooth" }); }

  // --- the items: live inputs first, then what the model says, then what changed
  var items = [];
  var dl = P.diesel_latest, gw = F.GASDESW; if (dl && dl.US) items.push({ t: "Diesel " + "$" + Number(dl.US).toFixed(2) + "/gal US" + (dl["West Coast"] ? " · West Coast $" + Number(dl["West Coast"]).toFixed(2) : "") + arrow(last(gw), prev(gw)) + " (EIA, " + dl.date + ")", tab: "prices", live: true });
  var le = last(P.liner_east); if (le) items.push({ t: "42-lb kraft liner, East $" + le[1].toLocaleString() + "/t" + arrow(le, prev(P.liner_east)) + " (" + mon(le[0]) + ")", tab: "prices", live: true });
  var rl = last(P.recycled_liner); if (rl) items.push({ t: "Recycled liner $" + rl[1].toLocaleString() + "/t" + arrow(rl, prev(P.recycled_liner)) + " (" + mon(rl[0]) + ")", tab: "prices", live: true });
  var oc = last(P.occ_national); if (oc) items.push({ t: "OCC, national $" + oc[1] + "/t" + arrow(oc, prev(P.occ_national)) + " (" + mon(oc[0]) + ")", tab: "fiber", live: true });
  var bp = last(F.PCU322211322211); if (bp) items.push({ t: "Corrugated box PPI " + bp[1].toFixed(1) + arrow(bp, prev(F.PCU322211322211)) + " (FRED, " + mon(bp[0]) + ")", tab: "prices", live: true });
  var ip = last(F.IPG322S); if (ip) items.push({ t: "Paper industrial production " + ip[1].toFixed(1) + arrow(ip, prev(F.IPG322S)) + " (FRED, " + mon(ip[0]) + ")", tab: "prices", live: true });
  items.push({ t: "Network freight bill " + musd(k.freight_usd) + "/yr · " + Math.round(k.avg_haul_miles) + " mi average haul · " + Math.round(k.rail_share * 100) + "% rail (" + fp.label + ")", tab: "flows" });
  if (D.diesel && D.diesel.live) items.push({ t: "At today's diesel the bill is " + musd((D.diesel["6.2"] || {}).freight_usd || k.freight_usd) + " and rail takes " + Math.round(((D.diesel["6.2"] || {}).rail_share || k.rail_share) * 100) + "%", tab: "prices" });
  D.knockouts.slice(0, 3).forEach(function (x) { items.push({ t: "If " + x.name + " (" + x.owner + ") goes down: +" + musd(x.d_total) + "/yr" + (x.unmet ? ", " + kt(x.unmet) + " unserved" : ""), tab: "flows", scen: "ko" + x.mill }); });
  var L = D.prospects && D.prospects.L; if (L) { var gaps = L.filter(Boolean).map(function (p) { return p.gap; }).sort(function (a, b) { return a - b; }); var within5 = Math.round(100 * gaps.filter(function (g) { return g < 5; }).length / gaps.length), med = gaps[Math.floor(gaps.length / 2)]; items.push({ t: within5 + "% of markets have a second mill within $5/t · median gap $" + med.toFixed(1) + "/t", tab: "prospects" }); }
  Object.keys(D.price_shocks || {}).forEach(function (o) { var s = D.price_shocks[o]; if (s.base_market_tons > 50000) items.push({ t: o + " +$70/t alone: " + kt(s.base_market_tons - s.market_tons_after) + " move, " + s.calls.length + " accounts", tab: "prospects", after: function () { var sel = document.getElementById("shock"); if (sel) { for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text.indexOf(o) >= 0) { sel.value = sel.options[i].value; sel.dispatchEvent(new Event("change")); break; } } } }); });
  (function () { var open = mills.filter(function (m) { return m.status === "open" && m.country === "US"; }), w = open.filter(function (m) { return m.lon < -105; }), e = open.filter(function (m) { return m.lon >= -105; }), cw = function (a) { var c = 0, s = 0; a.forEach(function (m) { c += m.cap; s += fp.shadow[m.id] * m.cap; }); return c ? s / c : 0; }; items.push({ t: "A ton of West Coast capacity is worth $" + Math.round(cw(w)) + " to the network, East of the Rockies $" + Math.round(cw(e)), tab: "flows" }); })();
  var co = D.calendar_opt; if (co) items.push({ t: "Maintenance calendar: " + musd(co.random_actual_annual_penalty) + "/yr staggered → " + musd(co.opt_actual_annual_penalty) + " priced by the duals", tab: "flows", scen: "o01" });
  if (D.corr && D.corr.kpi) items.push({ t: "Corrugators " + Math.round(D.corr.kpi.national_utilization * 100) + "% loaded nationally · " + D.corr.kpi.markets_without_corrugator + " of " + D.nodes.length + " markets buy sheets", tab: "corr" });
  if (D.occ && D.occ.kpi) items.push({ t: "OCC: " + (D.occ.kpi.occ_supply / 1e6).toFixed(1) + " Mt collected · " + (D.occ.kpi.occ_to_mills / 1e6).toFixed(1) + " Mt to mills · " + (D.occ.kpi.occ_exported / 1e6).toFixed(1) + " Mt exported", tab: "fiber" });
  mills.filter(function (m) { return m.status === "closed" && (m.closed_year || 0) >= 2025; }).sort(function (a, b) { return b.cap_2024 - a.cap_2024; }).forEach(function (m) { items.push({ t: "Closed " + m.closed_year + ": " + m.name + ", " + m.st + " (" + m.owner_2024 + ", " + kt(m.cap_2024) + ")", tab: "backtest", event: true }); });
  var pl = D.plant_layer && D.plant_layer.sources; if (pl) { var v = pl.verified; items.push({ t: (D.plants ? D.plants.length.toLocaleString() : "1,605") + " EPA box-plant sites on the map" + (v ? " · " + v.checked + " checked by Claude, " + ((v.plant_types || {}).corrugator || 0) + " corrugators confirmed" : ""), tab: "demand" }); }
  items.push({ t: "Model run " + D.generated + " · diesel refreshes Mondays · the model re-solves on every data change", tab: "method" });

  // --- the strip
  var bar = document.createElement("div"); bar.className = "ticker"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Ticker: live inputs and model results");
  var tag = document.createElement("span"); tag.className = "tag"; tag.textContent = "TAPE"; bar.appendChild(tag);
  var view = document.createElement("div"); view.className = "view"; var track = document.createElement("div"); track.className = "track"; view.appendChild(track); bar.appendChild(view);
  function fill(dst) { items.forEach(function (it) { var b = document.createElement("button"); b.type = "button"; b.className = "it" + (it.live ? " live" : "") + (it.event ? " ev" : ""); b.textContent = it.t; b.onclick = function () { jump(it.tab, it.scen, it.after); }; dst.appendChild(b); var sep = document.createElement("span"); sep.className = "sep"; sep.textContent = "◆"; sep.setAttribute("aria-hidden", "true"); dst.appendChild(sep); }); }
  fill(track);
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) { fill(track); track.classList.add("roll"); requestAnimationFrame(function () { track.style.animationDuration = Math.max(40, Math.round(track.scrollWidth / 2 / 60)) + "s"; }); } else view.classList.add("static");
  document.body.appendChild(bar); document.body.classList.add("has-ticker");

  // --- first-load draw-in of the flows
  if (!reduce) { var arcs = document.querySelectorAll("#map .arc"); arcs.forEach(function (a, i) { a.style.setProperty("--i", i); a.classList.add("intro"); }); setTimeout(function () { arcs.forEach(function (a) { a.classList.remove("intro"); }); }, 2600); }
})();
