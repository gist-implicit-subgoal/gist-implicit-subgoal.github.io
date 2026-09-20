/* ===================================================================
   GIST project page: charts, rollout comparisons and small interactions
   =================================================================== */

/* ---------- data (from the paper, Tables I–IV) ---------- */
const SERIES = {
  gist: { name: "GIST (ours)", color: "var(--s1)" },
  noaux: { name: "No auxiliary loss", color: "var(--s2)" },
  reg: { name: "Regression auxiliary loss", color: "var(--s3)" },
  hier: { name: "Standard hierarchical", color: "var(--s4)" },
  uhier: { name: "Uncertainty-aware hierarchical", color: "var(--s5)" },
  dp: { name: "Diffusion Policy (best variant)", color: "var(--s3)" },
};

const SIM = {
  groups: ["Kitchen D1", "Coffee Prep. D1", "Hammer Cleanup D1", "Push-T", "Average"],
  series: [
    { ...SERIES.gist,  values: [60.7, 68.0, 50.0, 62.0, 60.2] },
    { ...SERIES.noaux, values: [49.3, 43.3, 47.3, 58.0, 49.5] },
    { ...SERIES.reg,   values: [58.7, 50.0, 54.0, 56.0, 54.7] },
    { ...SERIES.hier,  values: [54.0, 38.7, 47.3, 40.0, 45.0] },
    { ...SERIES.uhier, values: [58.0, 52.0, 49.0, 58.0, 54.3] },
  ],
};

const REAL_FULL = {
  groups: ["Pushing", "Sweeping", "Pouring", "Average"],
  series: [
    { ...SERIES.gist,  values: [65, 70, 40, 58.3] },
    { ...SERIES.noaux, values: [35, 30, 10, 25.0] },
  ],
};

const REAL_PART = {
  groups: ["Sweeping", "Pouring", "Average"],
  series: [
    { ...SERIES.gist,  values: [70, 52.5, 61.3] },
    { ...SERIES.noaux, values: [46, 35, 40.5] },
  ],
};

const EXTRACT = [
  { name: "AWE greedy (th = 0.35)", value: 60.2 },
  { name: "AWE dynamic programming (th = 0.05)", value: 59.5 },
  { name: "Bayesian velocity changepoints", value: 58.7 },
  { name: "Fixed interval, K = 20", value: 57.7 },
  { name: "VLM (Qwen3.6)", value: 57.4 },
  { name: "Gripper + orientation heuristic*", value: 54.0 },
];
const EXTRACT_TABLE = {
  cols: ["Kitchen D1", "Coffee Prep. D1", "Hammer Cleanup D1", "MimicGen Avg.", "Push-T", "Avg."],
  rows: [
    ["Mixed gripper and orientation heuristic", 46.0, 58.7, 57.3, 54.0, null, 54.0],
    ["Fixed interval, K=20", 58.0, 52.0, 59.3, 56.4, 61.3, 57.7],
    ["Qwen3.6", 56.2, 60.7, 54.0, 57.0, 58.7, 57.4],
    ["Bayesian velocity changepoints", 62.7, 62.0, 54.0, 59.6, 56.0, 58.7],
    ["AWE greedy, th = 0.35", 60.7, 68.0, 50.0, 59.6, 62.0, 60.2],
    ["AWE dynamic programming, th = 0.05", 65.3, 56.7, 58.0, 60.0, 58.0, 59.5],
  ],
};

const DP = {
  groups: ["Hammer Cleanup D1", "Kitchen D1", "Coffee Prep. D1", "Mug Cleanup D1", "Square D2", "Average"],
  series: [
    { ...SERIES.gist,  values: [64.0, 69.7, 75.3, 56.7, 43.3, 61.8] },
    { ...SERIES.noaux, values: [58.3, 64.7, 61.3, 50.0, 32.7, 53.4] },
    { ...SERIES.dp,    values: [60.0, 85.0, 62.0, 59.0, 19.0, 56.8] },
  ],
};
const DP_TABLE = {
  cols: ["Hammer Cleanup D1", "Kitchen D1", "Coffee Prep. D1", "Mug Cleanup D1", "Square D2", "MimicGen Avg.", "Push-T coverage"],
  rows: [
    ["DP-C, relative", 54.0, 64.0, 53.0, 39.0, 13.0, 44.6, null],
    ["DP-T, absolute", 60.0, 75.0, 51.0, 43.0, 11.0, 48.0, null],
    ["DP-C, absolute", 59.0, 85.0, 62.0, 59.0, 19.0, 56.8, 91.0],
    ["No auxiliary loss", 58.3, 64.7, 61.3, 50.0, 32.7, 53.4, null],
    ["GIST (ours)", 64.0, 69.7, 75.3, 56.7, 43.3, 61.8, 95.4],
  ],
};

/* ---------- tiny SVG helpers ---------- */
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, children = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const c of children) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
}
function html(tag, attrs = {}, inner = "") {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  n.innerHTML = inner;
  return n;
}
const fmt = (v) => (v == null ? "–" : Number.isInteger(v) ? String(v) : v.toFixed(1));

/* tooltip */
const tip = document.getElementById("chart-tip");
function showTip(e, text) {
  tip.innerHTML = text;
  tip.classList.add("show");
  moveTip(e);
}
function moveTip(e) {
  const pad = 14;
  let x = e.clientX + pad, y = e.clientY + pad;
  const r = tip.getBoundingClientRect();
  if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
  if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
  tip.style.transform = `translate(${x}px, ${y}px)`;
}
function hideTip() { tip.classList.remove("show"); }

/* card scaffold: head, legend, viz, table, foot, toggle */
function chartCard(root, { title, sub, legend, foot }) {
  root.innerHTML = "";
  const head = html("div", { class: "chart-head" });
  const t = html("div");
  t.appendChild(html("h3", {}, title));
  if (sub) t.appendChild(html("p", { class: "sub" }, sub));
  head.appendChild(t);
  const toggle = html("button", { class: "toggle", type: "button", "aria-pressed": "false" }, "Table");
  toggle.addEventListener("click", () => {
    const table = root.getAttribute("data-view") === "table";
    root.setAttribute("data-view", table ? "chart" : "table");
    toggle.textContent = table ? "Table" : "Chart";
    toggle.setAttribute("aria-pressed", String(!table));
  });
  head.appendChild(toggle);
  root.appendChild(head);
  if (legend && legend.length > 1) {
    const lg = html("div", { class: "legend", "aria-label": "Legend" });
    for (const s of legend) {
      const item = html("span");
      item.appendChild(html("i", { style: `background:${s.color}` }));
      item.appendChild(document.createTextNode(s.name));
      lg.appendChild(item);
    }
    root.appendChild(lg);
  }
  const viz = html("div", { class: "viz" });
  root.appendChild(viz);
  const tw = html("div", { class: "table-wrap" });
  root.appendChild(tw);
  if (foot) root.appendChild(html("p", { class: "foot" }, foot));
  return { viz, tw };
}

function dataTable(tw, cols, rows, { oursRow, higherBetter = true } = {}) {
  const table = html("table");
  const thead = html("thead");
  const hr = html("tr");
  hr.appendChild(html("th", {}, "Method"));
  cols.forEach((c) => hr.appendChild(html("th", {}, c)));
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = html("tbody");
  const best = cols.map((_, j) => {
    const vals = rows.map((r) => r[j + 1]).filter((v) => v != null);
    return vals.length ? (higherBetter ? Math.max(...vals) : Math.min(...vals)) : null;
  });
  rows.forEach((r) => {
    const tr = html("tr", { class: r[0] === oursRow ? "ours" : "" });
    tr.appendChild(html("td", {}, r[0]));
    r.slice(1).forEach((v, j) => tr.appendChild(html("td", { class: v != null && v === best[j] ? "best" : "" }, fmt(v))));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tw.appendChild(table);
}

/* Bar length encodes the value, so the axis keeps its zero baseline. The
   resolution to read small differences comes from fitting the top of the scale
   to the data and from a taller plot, never from cutting the baseline off. */
function niceScale(series, headroom = 1.06, maxTicks = 9) {
  const vals = series.flatMap((s) => s.values).filter((v) => v != null);
  const target = Math.max(...vals) * headroom;
  for (const step of [5, 10, 20, 25, 50]) {
    const top = Math.ceil(target / step) * step;
    if (top / step <= maxTicks) return { yMax: top, step };
  }
  return { yMax: 100, step: 20 };
}

/* ---------- grouped column chart ---------- */
function groupedColumns(root, cfg) {
  const { title, sub, groups, series, unit = "%", foot, labelMode = "all", tableCols, tableRows, oursRow, refLine } = cfg;
  const scale = cfg.yMax ? { yMax: cfg.yMax, step: 20 } : niceScale(series);
  const yMax = scale.yMax;
  const { viz, tw } = chartCard(root, { title, sub, legend: series, foot });

  const W = cfg.width || 900, H = cfg.height || 300;
  const m = { t: 18, r: 12, b: 52, l: 34 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const svg = el("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": title });

  // gridlines every step, numbered every other one so the grid stays quiet
  const ticks = [];
  for (let v = 0; v <= yMax + 1e-9; v += scale.step) ticks.push(Math.round(v));
  const y = (v) => m.t + ih - (v / yMax) * ih;
  for (const v of ticks) {
    svg.appendChild(el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: v === 0 ? "var(--axis)" : "var(--grid)", "stroke-width": 1, "shape-rendering": "crispEdges" }));
    const labelled = v === 0 || v === yMax || (v / scale.step) % 2 === 0;
    if (labelled) svg.appendChild(el("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)", style: "font-variant-numeric: tabular-nums" }, [String(v)]));
  }

  const gW = iw / groups.length;
  const n = series.length;
  const gap = 2;                                  // 2px surface gap between neighbours
  const barW = Math.min(24, (gW * 0.78 - gap * (n - 1)) / n);
  const clusterW = barW * n + gap * (n - 1);

  groups.forEach((g, gi) => {
    const x0 = m.l + gi * gW + (gW - clusterW) / 2;
    // group label
    // group label, wrapped onto two lines when the band is narrow
    const lbl = el("text", { x: m.l + gi * gW + gW / 2, y: H - m.b + 20, "text-anchor": "middle", "font-size": 12, fill: "var(--text-2)", "font-weight": g === "Average" ? 600 : 400 });
    const words = g.split(" ");
    if (words.length > 1 && g.length * 6.6 > gW - 8) {
      const cut = Math.floor(words.length / 2);
      const l1 = words.slice(0, cut).join(" "), l2 = words.slice(cut).join(" ");
      lbl.appendChild(el("tspan", { x: m.l + gi * gW + gW / 2, dy: 0 }, [l1]));
      lbl.appendChild(el("tspan", { x: m.l + gi * gW + gW / 2, dy: 13 }, [l2]));
    } else lbl.appendChild(document.createTextNode(g));
    svg.appendChild(lbl);
    if (g === "Average") {
      svg.appendChild(el("rect", { x: m.l + gi * gW + 2, y: m.t - 6, width: gW - 4, height: ih + 6, rx: 8, fill: "var(--surface-2)" }));
    }
    series.forEach((s, si) => {
      const v = s.values[gi];
      if (v == null) return;
      const x = x0 + si * (barW + gap);
      const h = Math.max(0, y(0) - y(v));
      const r = Math.min(4, barW / 2);
      // rounded top, square bottom
      const d = `M${x},${y(0)} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`;
      const bar = el("path", { d, fill: s.color, class: "bar" });
      const hit = el("rect", { x: x - gap / 2, y: m.t, width: barW + gap, height: ih, fill: "transparent" });
      const label = `<b>${s.name}</b><br>${g}: <b>${fmt(v)}${unit}</b>`;
      for (const t of [bar, hit]) {
        t.addEventListener("mouseenter", (e) => showTip(e, label));
        t.addEventListener("mousemove", moveTip);
        t.addEventListener("mouseleave", hideTip);
      }
      svg.appendChild(bar);
      svg.appendChild(hit);
      const showLabel = labelMode === "all" || (labelMode === "avg+ours" && (g === "Average" || si === 0));
      if (showLabel && h > 4) {
        svg.appendChild(el("text", { x: x + barW / 2, y: y(v) - 5, "text-anchor": "middle", "font-size": 10.5, "font-weight": si === 0 ? 700 : 500, fill: si === 0 ? "var(--text)" : "var(--text-2)", style: "font-variant-numeric: tabular-nums; pointer-events:none" }, [fmt(v)]));
      }
    });
  });
  // re-append Average shading below bars: move it to first
  const shade = svg.querySelector('rect[rx="8"]');
  if (shade) svg.insertBefore(shade, svg.firstChild);

  // a single reference line makes every bar readable as a distance from it,
  // which is what the comparison is actually about
  if (refLine) {
    const ry = y(refLine.value);
    svg.appendChild(el("line", { x1: m.l, x2: W - m.r, y1: ry, y2: ry, stroke: "var(--accent)", "stroke-width": 1.5, opacity: 0.55, "stroke-dasharray": "5 4", "pointer-events": "none" }));
    const txt = `${refLine.label} ${fmt(refLine.value)}${unit}`;
    const tw2 = txt.length * 5.6 + 12;
    const lx = m.l + 4;   // the left margin is clear at this height
    svg.appendChild(el("rect", { x: lx, y: ry - 17, width: tw2, height: 15, rx: 4, fill: "var(--surface)", stroke: "var(--border)", "pointer-events": "none" }));
    svg.appendChild(el("text", { x: lx + tw2 / 2, y: ry - 6, "text-anchor": "middle", "font-size": 10, "font-weight": 600, fill: "var(--accent-ink)", style: "pointer-events:none; font-variant-numeric: tabular-nums" }, [txt]));
  }

  viz.appendChild(svg);
  dataTable(tw, tableCols || groups, tableRows || series.map((s) => [s.name, ...s.values]), { oursRow: oursRow || series[0].name });
}

/* ---------- horizontal bar chart with reference line ---------- */
function hBars(root, cfg) {
  const { title, sub, items, ref, xMax = 70, xMin = 40, foot, tableCols, tableRows, oursRow, valueLabel = "Average", extra } = cfg;
  const { viz, tw } = chartCard(root, { title, sub, legend: [], foot });
  const W = 520, rowH = 34, m = { t: 14, r: 44, b: 30, l: 220 };
  const H = m.t + items.length * rowH + m.b;
  const iw = W - m.l - m.r;
  const svg = el("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": title });
  const x = (v) => m.l + ((v - xMin) / (xMax - xMin)) * iw;
  const ticks = [];
  for (let v = xMin; v <= xMax; v += 10) ticks.push(v);
  for (const v of ticks) {
    svg.appendChild(el("line", { x1: x(v), x2: x(v), y1: m.t, y2: H - m.b, stroke: "var(--grid)", "stroke-width": 1, "shape-rendering": "crispEdges" }));
    svg.appendChild(el("text", { x: x(v), y: H - m.b + 16, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, [String(v)]));
  }
  svg.appendChild(el("line", { x1: x(xMin), x2: x(xMin), y1: m.t, y2: H - m.b, stroke: "var(--axis)", "stroke-width": 1, "shape-rendering": "crispEdges" }));
  items.forEach((it, i) => {
    const yc = m.t + i * rowH + rowH / 2;
    const barH = 18, r = 4;
    const w = Math.max(0, x(it.value) - x(xMin));
    const d = `M${x(xMin)},${yc - barH / 2} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${barH - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - r)} z`;
    const bar = el("path", { d, fill: it.emph === false ? "var(--axis)" : "var(--s1)" });
    const label = `<b>${it.name}</b><br>${valueLabel}: <b>${fmt(it.value)}%</b>`;
    bar.addEventListener("mouseenter", (e) => showTip(e, label));
    bar.addEventListener("mousemove", moveTip);
    bar.addEventListener("mouseleave", hideTip);
    svg.appendChild(bar);
    svg.appendChild(el("text", { x: m.l - 10, y: yc + 4, "text-anchor": "end", "font-size": 12, fill: "var(--text-2)" }, [it.name]));
    svg.appendChild(el("text", { x: x(it.value) + 6, y: yc + 4, "font-size": 11.5, "font-weight": 600, fill: "var(--text)", style: "font-variant-numeric: tabular-nums" }, [fmt(it.value)]));
  });
  if (ref) {
    svg.appendChild(el("line", { x1: x(ref.value), x2: x(ref.value), y1: m.t - 4, y2: H - m.b, stroke: "var(--s2)", "stroke-width": 2, "stroke-linecap": "round" }));
    svg.appendChild(el("text", { x: x(ref.value) + 6, y: m.t + 2, "font-size": 10.5, "font-weight": 600, fill: "var(--text-2)" }, [`${ref.label} ${fmt(ref.value)}`]));
  }
  viz.appendChild(svg);
  if (extra) {
    viz.appendChild(html("p", { class: "sub", style: "margin:10px 0 2px;font-weight:600;color:var(--text-2)" }, extra.title));
    const holder = html("div");
    viz.appendChild(holder);
    hBarsPlain(holder, extra);
  }
  dataTable(tw, tableCols, tableRows, { oursRow });
}

/* bare horizontal bars (no card) used for the small companion panel */
function hBarsPlain(holder, { items, xMin, xMax }) {
  const W = 520, rowH = 30, m = { t: 6, r: 44, b: 24, l: 220 };
  const H = m.t + items.length * rowH + m.b, iw = W - m.l - m.r;
  const svg = el("svg", { class: "chart", viewBox: `0 0 ${W} ${H}` });
  const x = (v) => m.l + ((v - xMin) / (xMax - xMin)) * iw;
  for (let v = xMin; v <= xMax; v += 5) {
    svg.appendChild(el("line", { x1: x(v), x2: x(v), y1: m.t, y2: H - m.b, stroke: "var(--grid)", "stroke-width": 1, "shape-rendering": "crispEdges" }));
    svg.appendChild(el("text", { x: x(v), y: H - m.b + 14, "text-anchor": "middle", "font-size": 10.5, fill: "var(--muted)" }, [String(v)]));
  }
  svg.appendChild(el("line", { x1: x(xMin), x2: x(xMin), y1: m.t, y2: H - m.b, stroke: "var(--axis)", "stroke-width": 1, "shape-rendering": "crispEdges" }));
  items.forEach((it, i) => {
    const yc = m.t + i * rowH + rowH / 2, barH = 16, r = 4, w = Math.max(0, x(it.value) - x(xMin));
    const d = `M${x(xMin)},${yc - barH / 2} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${barH - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - r)} z`;
    svg.appendChild(el("path", { d, fill: it.emph === false ? "var(--axis)" : "var(--s1)" }));
    svg.appendChild(el("text", { x: m.l - 10, y: yc + 4, "text-anchor": "end", "font-size": 12, fill: "var(--text-2)" }, [it.name]));
    svg.appendChild(el("text", { x: x(it.value) + 6, y: yc + 4, "font-size": 11.5, "font-weight": 600, fill: "var(--text)" }, [fmt(it.value)]));
  });
  holder.appendChild(svg);
}

/* ---------- render charts ---------- */
groupedColumns(document.getElementById("chart-sim"), {
  title: "Simulation: GIST vs. auxiliary-loss ablations and hierarchical baselines",
  sub: "Success rate (%) of the best checkpoint, each rolled out for 150 episodes per task in three blocks of 50 seeds, from 100 demonstrations and 100 epochs on each MimicGen task and 206 demonstrations and 200 epochs on Push-T. The axis runs from zero and stops just above the highest bar, so equal heights mean equal success. Table I.",
  groups: SIM.groups, series: SIM.series, labelMode: "avg+ours", width: 980, height: 470,
  refLine: { value: 60.2, label: "GIST average" },
  foot: "The standard hierarchical baseline is an ArticuBot/GHOST-style high-level model that commits to a single sub-goal. The uncertainty-aware hierarchical baseline is a stronger variant, formulated here, that passes the full mixture to the low-level policy. All sub-goal methods use AWE-greedy extraction (th = 0.35). Replacing the mixture with single sub-goal regression recovers only part of the gain, reaching 54.7% and remaining 5.5 points behind GIST, with the widest gap on Coffee Preparation (68.0 against 50.0). Push-T counts as a success when the block covers more than 0.95 of the target region at some point in the episode.",
});

groupedColumns(document.getElementById("chart-real"), {
  title: "Real world: full-task success",
  sub: "20 novel scene configurations per task. Table II.",
  groups: REAL_FULL.groups, series: REAL_FULL.series, width: 520, height: 340,
  foot: "Averaged over the three tasks, GIST exceeds the identical policy trained without the auxiliary loss by 33.3 points.",
});

groupedColumns(document.getElementById("chart-partial"), {
  title: "Real world: partial-task success",
  sub: "Percentage of consecutive sub-tasks completed, averaged over rollouts. Table II.",
  groups: REAL_PART.groups, series: REAL_PART.series, width: 520, height: 340,
  foot: "Pushing comprises a single sub-task and therefore reports no partial score. Where GIST fails, the failure occurs later in the task.",
});

hBars(document.getElementById("chart-extract"), {
  title: "Robustness to the sub-goal extraction procedure",
  sub: "GIST average success (%) over the four simulation tasks, one extractor per row. Each row retrains the same policy on the same demonstrations and differs only in where the sub-goal boundaries are placed: AWE selects the waypoints that best reconstruct the trajectory, the changepoint detector splits on abrupt changes in end-effector speed, the VLM reads contact sheets of frames and names the ones where a manipulation event completes, the heuristic combines the gripper state with end-effector orientation, and the fixed interval is an uninformative control that cuts every 20 steps. Table III.",
  items: EXTRACT, ref: { value: 49.5, label: "No auxiliary loss" }, xMin: 40, xMax: 70,
  foot: "*The heuristic is not applicable to Push-T, so its average is taken over the three MimicGen tasks. Five of the procedures span only 2.8 points, and every one remains well above the policy trained without sub-goal supervision.",
  tableCols: EXTRACT_TABLE.cols, tableRows: EXTRACT_TABLE.rows, oursRow: "AWE greedy, th = 0.35",
});

hBars(document.getElementById("chart-dp"), {
  title: "Comparison with Diffusion Policy",
  sub: "Average success (%) over five MimicGen tasks (Hammer Cleanup, Kitchen, Coffee Prep., Mug Cleanup, Square D2); 200 demonstrations, 250 epochs. Table IV.",
  items: [
    { name: "GIST (ours)", value: 61.8 },
    { name: "No auxiliary loss", value: 53.4, emph: false },
    { name: "DP-C, absolute", value: 56.8, emph: false },
    { name: "DP-T, absolute", value: 48.0, emph: false },
    { name: "DP-C, relative", value: 44.6, emph: false },
  ],
  xMin: 30, xMax: 70, valueLabel: "MimicGen average",
  extra: { title: "Push-T target-area coverage (%)", items: [{ name: "GIST (ours)", value: 95.4 }, { name: "DP-C, absolute", value: 91.0, emph: false }], xMin: 80, xMax: 100 },
  foot: "On the MimicGen average, GIST exceeds the strongest Diffusion Policy variant by 5.0 points and the same policy without the auxiliary loss by 8.4 points. The largest per-task margin is on Square D2 (43.3 against 19.0). This comparison trains for longer on more demonstrations than the simulation chart above, so its per-task values are higher and the two are not directly comparable. Per-task values are given in the table.",
  tableCols: DP_TABLE.cols, tableRows: DP_TABLE.rows, oursRow: "GIST (ours)",
});

/* ---------- rollout comparisons ----------
   Five rollouts per task. Both clips in a column are played at one speed so
   that the two conditions remain directly comparable. The selection is mixed
   by design: it retains the rollouts in which the ablation succeeds, and a
   GIST failure that advances substantially, rather than favourable cases
   alone. Outcome is carried by the badge on each clip; aggregate success
   rates are reported in the Results section. */
// Rollout order is deliberately mixed rather than grouped by outcome. Each
// entry is one column and carries both rows, so reordering the array moves a
// GIST clip and its ablation counterpart together; the _N in the filenames is
// just an identifier and no longer tracks display position.
const TASKS = [
  {
    id: "pour", scenes: { w: 2006, h: 612, n: 20 }, name: "Pouring", goal: "Grasp the jar, transport it over the bowl and pour the coffee beans.",
    pairs: [
      { speed: 8,
        ours: { src: "pour_gist_3", ep: 5, ok: true },
        base: { src: "pour_noaux_3", ep: 5, ok: false } },
      { speed: 8,
        ours: { src: "pour_gist_7", ep: 16, ok: false },
        base: { src: "pour_noaux_7", ep: 16, ok: false } },
      { speed: 8,
        ours: { src: "pour_gist_1", ep: 1, ok: true },
        base: { src: "pour_noaux_1", ep: 1, ok: true } },
      { speed: 8,
        ours: { src: "pour_gist_5", ep: 17, ok: true },
        base: { src: "pour_noaux_5", ep: 17, ok: false } },
      { speed: 8,
        ours: { src: "pour_gist_8", ep: 10, ok: false },
        base: { src: "pour_noaux_8", ep: 10, ok: false } },
      { speed: 8,
        ours: { src: "pour_gist_2", ep: 11, ok: true },
        base: { src: "pour_noaux_2", ep: 12, ok: true } },
      { speed: 8,
        ours: { src: "pour_gist_6", ep: 21, ok: true },
        base: { src: "pour_noaux_6", ep: 15, ok: false } },
      { speed: 8,
        ours: { src: "pour_gist_4", ep: 9, ok: true },
        base: { src: "pour_noaux_4", ep: 9, ok: false } },
    ],
  },
  {
    id: "sweep", scenes: { w: 2006, h: 612, n: 20 }, name: "Sweeping", goal: "Sweep the tissues into the dustpan with the brush.",
    pairs: [
      { speed: 8,
        ours: { src: "sweep_gist_5", ep: 16, ok: true },
        base: { src: "sweep_noaux_5", ep: 18, ok: false } },
      { speed: 8,
        ours: { src: "sweep_gist_2", ep: 2, ok: true },
        base: { src: "sweep_noaux_2", ep: 9, ok: true } },
      { speed: 8,
        ours: { src: "sweep_gist_8", ep: 9, ok: false },
        base: { src: "sweep_noaux_8", ep: 6, ok: false } },
      { speed: 8,
        ours: { src: "sweep_gist_4", ep: 8, ok: true },
        base: { src: "sweep_noaux_4", ep: 15, ok: false } },
      { speed: 8,
        ours: { src: "sweep_gist_1", ep: 0, ok: true },
        base: { src: "sweep_noaux_1", ep: 4, ok: true } },
      { speed: 8,
        ours: { src: "sweep_gist_7", ep: 13, ok: false },
        base: { src: "sweep_noaux_7", ep: 16, ok: false } },
      { speed: 8,
        ours: { src: "sweep_gist_3", ep: 5, ok: true },
        base: { src: "sweep_noaux_3", ep: 7, ok: false } },
      { speed: 8,
        ours: { src: "sweep_gist_6", ep: 19, ok: true },
        base: { src: "sweep_noaux_6", ep: 10, ok: false } },
    ],
  },
  {
    id: "push", scenes: { w: 2006, h: 612, n: 20 }, name: "Pushing", goal: "Displace the block to the target region without grasping it.",
    pairs: [
      { speed: 8,
        ours: { src: "push_gist_4", ep: 10, ok: true },
        base: { src: "push_noaux_4", ep: 1, ok: false } },
      { speed: 8,
        ours: { src: "push_gist_1", ep: 2, ok: true },
        base: { src: "push_noaux_1", ep: 0, ok: true } },
      { speed: 8,
        ours: { src: "push_gist_7", ep: 13, ok: false },
        base: { src: "push_noaux_7", ep: 14, ok: false } },
      { speed: 8,
        ours: { src: "push_gist_6", ep: 16, ok: true },
        base: { src: "push_noaux_6", ep: 12, ok: false } },
      { speed: 8,
        ours: { src: "push_gist_2", ep: 4, ok: true },
        base: { src: "push_noaux_2", ep: 2, ok: true } },
      { speed: 8,
        ours: { src: "push_gist_8", ep: 0, ok: false },
        base: { src: "push_noaux_8", ep: 19, ok: false } },
      { speed: 8,
        ours: { src: "push_gist_5", ep: 12, ok: true },
        base: { src: "push_noaux_5", ep: 3, ok: false } },
      { speed: 8,
        ours: { src: "push_gist_3", ep: 9, ok: true },
        base: { src: "push_noaux_3", ep: 8, ok: true } },
    ],
  },
];

const SCROLL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>';
const ICON_FAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

function vsCell(who, item, ours, speed) {
  const cell = html("div", { class: `vs${ours ? " ours" : " base"}` });
  const v = html("video", { muted: "", loop: "", playsinline: "", preload: "metadata",
    poster: `assets/video/${item.src}.jpg`, "aria-label": `${who} rollout` });
  v.muted = true;
  v.appendChild(html("source", { src: `assets/video/${item.src}.mp4`, type: "video/mp4" }));
  cell.appendChild(v);
  const meta = html("div", { class: "meta" });
  meta.innerHTML = `<span class="speed">${speed}\u00d7</span>
    <span class="badge ${item.ok ? "ok" : "fail"}">${item.ok ? ICON_OK : ICON_FAIL}${item.ok ? "Success" : "Failure"}</span>`;
  cell.appendChild(meta);
  return cell;
}

const panels = document.getElementById("video-panels");
TASKS.forEach((t, i) => {
  const p = html("div", { class: "panel", id: `panel-${t.id}`, role: "tabpanel", "aria-labelledby": `tab-${t.id}` });
  if (i > 0) p.hidden = true;

  // One column per rollout, two fixed rows: the policy with the auxiliary loss
  // above, the ablation below, so the two conditions stay vertically aligned
  // while the set of rollouts scrolls horizontally.
  const scroller = html("div", { class: "vs-hscroll", tabindex: "0", role: "group",
    "aria-label": `${t.name}: ${t.pairs.length} rollouts, scroll horizontally` });
  const track = html("div", { class: "vs-track" });

  track.appendChild(html("div", { class: "vs-lab ours" },
    '<span class="swatch"></span>GIST<small>with auxiliary loss</small>'));
  track.appendChild(html("div", { class: "vs-lab base" },
    '<span class="swatch"></span>Ablation<small>no auxiliary loss</small>'));

  t.pairs.forEach((pr) => {
    track.appendChild(vsCell("GIST (ours)", pr.ours, true, pr.speed));
    track.appendChild(vsCell("No auxiliary loss", pr.base, false, pr.speed));
  });

  scroller.appendChild(track);
  p.appendChild(scroller);
  p.appendChild(html("p", { class: "scroll-hint" },
    `${SCROLL_ICON}${t.pairs.length} rollouts per task. Scroll the strip horizontally to view the remainder.`));

  // Every opening frame of the evaluation overlaid, so that the spread of
  // starting arrangements each policy was asked to handle is visible rather
  // than asserted.
  const fig = html("figure", { class: "scenes" });
  fig.innerHTML =
    `<picture>
       <source srcset="assets/img/scenes_${t.id}.webp" type="image/webp">
       <img src="assets/img/scenes_${t.id}.jpg" width="${t.scenes.w}" height="${t.scenes.h}" loading="lazy" decoding="async"
            alt="The first frames of the ${t.scenes.n} ${t.name.toLowerCase()} evaluation scenes, overlaid into one view.">
     </picture>
     <figcaption><strong>Starting arrangements.</strong> First frames of the ${t.scenes.n} evaluation scenes.</figcaption>`;
  p.appendChild(fig);

  panels.appendChild(p);
});

const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
function selectTab(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute("aria-controls"));
    panel.hidden = !on;
    panel.querySelectorAll("video").forEach((v) => {
      if (on) { v.currentTime = 0; vidObs.unobserve(v); vidObs.observe(v); } else v.pause();
    });
  });
}
tabs.forEach((t) => {
  t.addEventListener("click", () => selectTab(t));
  t.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(t);
    if (e.key === "ArrowRight") selectTab(tabs[(i + 1) % tabs.length]);
    if (e.key === "ArrowLeft") selectTab(tabs[(i - 1 + tabs.length) % tabs.length]);
    tabs.find((x) => x.getAttribute("aria-selected") === "true").focus();
  });
});
document.getElementById("restart-all").addEventListener("click", () => {
  document.querySelectorAll(".panel:not([hidden]) video").forEach((v) => { v.currentTime = 0; v.play().catch(() => {}); });
});

// play each rollout video only while it is on screen (saves bandwidth with 18 clips)
const vidObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => { const v = en.target; if (en.isIntersecting && !v.closest(".panel").hidden) v.play().catch(() => {}); else v.pause(); });
}, { threshold: 0.25 });
document.querySelectorAll(".vs video").forEach((v) => vidObs.observe(v));

/* ---------- reveal on scroll ---------- */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revealObs.unobserve(en.target); } });
}, { threshold: 0.08 });
document.querySelectorAll(".reveal").forEach((n) => revealObs.observe(n));
setTimeout(() => document.querySelectorAll(".reveal").forEach((n) => n.classList.add("in")), 2500);

/* ---------- bibtex ---------- */
function copyBibtex() {
  const code = document.getElementById("bibtex-code").innerText;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.querySelector(".copy-btn span");
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = original), 1500);
  });
}
