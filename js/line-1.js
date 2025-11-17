// ======================================================
// LINE 1 — NATIONAL TREND LINE (NO ZOOM, NO BRUSH)
// This module builds the national-level time-series chart
// with smooth transitions, area shading, peaks detection,
// and an intelligent tooltip system.
// ======================================================

const drawLine1 = (penalties) => {

  // -----------------------------
  // CHART DIMENSIONS + INNER AREA
  // -----------------------------
  const width = 900;
  const height = 600;
  const margin = { top: 40, bottom: 50, left: 80, right: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // -----------------------------
  // CREATE SVG
  // viewBox enables responsive scaling
  // -----------------------------
  const svg = d3.select("#line-1")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("max-width", "100%")
    .style("height", "auto");

  const g = svg.append("g")
    .attr("class", "line-group")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // -----------------------------
  // AGGREGATE YEARLY TOTALS
  // rollups → sum fines/charges/arrests by YEAR
  // -----------------------------
  const yearlyData = d3.rollups(
    penalties,
    v => ({
      fines: d3.sum(v, d => d.FINES),
      charges: d3.sum(v, d => d.CHARGES),
      arrests: d3.sum(v, d => d.ARRESTS),
      total: d3.sum(v, d => d.FINES + d.CHARGES + d.ARRESTS)
    }),
    d => d.YEAR
  )
  .map(([YEAR, obj]) => ({ YEAR: +YEAR, ...obj }))
  .sort((a, b) => a.YEAR - b.YEAR);

  // -----------------------------
  // SCALES
  // X: linear years (2008–2024)
  // Y: based on TOTAL penalties
  // -----------------------------
  const x = d3.scaleLinear()
    .domain(d3.extent(yearlyData, d => d.YEAR))
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(yearlyData, d => d.total)])
    .range([innerHeight, 0])
    .nice();

  // -----------------------------
  // SAVE INTERNAL VARIABLES
  // (Used by update() + render())
  // -----------------------------
  const node = svg.node();
  node.__xScale__ = x;
  node.__yScale__ = y;
  node.__line1Data__ = yearlyData;
  node.__line1SelectedKey__ = "total";   // default displayed metric
  node.__innerWidth__ = innerWidth;
  node.__innerHeight__ = innerHeight;

  // -----------------------------
  // DRAW AXES
  // -----------------------------
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d"))); // remove comma formatting for years

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y));

  // X label
  g.append("text")
    .attr("class", "x-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Year");

  // Y label
  g.append("text")
    .attr("class", "y-label")
    .attr("transform", `translate(${-margin.left + 80}, -15)`)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Penalty Counts");

  // -----------------------------
  // CHART LAYERS
  // Separate groups keep visuals tidy:
  //   • area under line
  //   • line path
  //   • data points
  //   • peak markers
  // -----------------------------
  g.append("path").attr("class", "line-area").attr("fill", "rgba(70,130,180,0.15)");
  g.append("path").attr("class", "line-path").attr("fill", "none").attr("stroke", "steelblue").attr("stroke-width", 2);
  g.append("g").attr("class", "line-points-group");
  g.append("g").attr("class", "line-peaks-group");

  // FIRST RENDER
  renderLine1(d3.select("#line-1 svg"));
};


// ======================================================
// UPDATE FUNCTION
// Called whenever filters change.
// Re-aggregates → updates axis → redraws line.
// ======================================================
function updateLine1(filteredData, filters) {
  const svgSel = d3.select("#line-1 svg");
  if (svgSel.empty()) return;

  const svg = svgSel.node();
  const innerHeight = svg.__innerHeight__;
  const x = svg.__xScale__;

  // -----------------------------
  // RE-AGGREGATE BASED ON FILTERS
  // -----------------------------
  let yearlyData = d3.rollups(
    filteredData,
    v => ({
      fines: d3.sum(v, d => d.FINES),
      charges: d3.sum(v, d => d.CHARGES),
      arrests: d3.sum(v, d => d.ARRESTS),
      total: d3.sum(v, d => d.FINES + d.CHARGES + d.ARRESTS)
    }),
    d => d.YEAR
  )
  .map(([YEAR, obj]) => ({ YEAR: +YEAR, ...obj }))
  .sort((a, b) => a.YEAR - b.YEAR);

  // -----------------------------
  // DETERMINE WHICH METRIC TO DISPLAY
  // -----------------------------
  let selectedKey = "total";
  if (filters.penalty === "Fines") selectedKey = "fines";
  if (filters.penalty === "Charges") selectedKey = "charges";
  if (filters.penalty === "Arrests") selectedKey = "arrests";

  // Remove years where this metric = 0 (helps avoid flat lines)
  yearlyData = yearlyData.filter(d => d[selectedKey] > 0);

  if (!yearlyData.length) return;

  // -----------------------------
  // UPDATE Y SCALE
  // -----------------------------
  const y = d3.scaleLinear()
    .domain([0, d3.max(yearlyData, d => d[selectedKey])])
    .range([innerHeight, 0])
    .nice();

  // Store updated states
  svg.__yScale__ = y;
  svg.__line1Data__ = yearlyData;
  svg.__line1SelectedKey__ = selectedKey;

  const g = svgSel.select(".line-group");

  // Smooth axis transitions
  g.select(".y-axis").transition().duration(600).call(d3.axisLeft(y));
  g.select(".x-axis").transition().duration(600).call(d3.axisBottom(x).tickFormat(d3.format("d")));

  // Re-render with new data
  renderLine1(svgSel);
}


// ======================================================
// MAIN RENDER FUNCTION
// Handles:
//   • line transition
//   • area transition
//   • moving points
//   • peaks detection
//   • tooltip binding
// ======================================================
function renderLine1(svgSel) {
    const svg = svgSel.node();
    const g = svgSel.select(".line-group");

    const x = svg.__xScale__;
    const y = svg.__yScale__;
    const data = svg.__line1Data__;
    const key = svg.__line1SelectedKey__;
    const innerHeight = svg.__innerHeight__;
    const innerWidth  = svg.__innerWidth__;

    if (!data.length) return;

    // -----------------------------
    // LINE + AREA GENERATORS
    // curveMonotoneX = smooth curve without wiggles
    // -----------------------------
    const lineGen = d3.line()
        .x(d => x(d.YEAR))
        .y(d => y(d[key]))
        .curve(d3.curveMonotoneX);

    const areaGen = d3.area()
        .x(d => x(d.YEAR))
        .y0(innerHeight)
        .y1(d => y(d[key]))
        .curve(d3.curveMonotoneX);

    // -----------------------------
    // SMOOTH AREA TRANSITION
    // -----------------------------
    g.select(".line-area")
        .datum(data)
        .transition()
        .duration(700)
        .attr("d", areaGen);

    // -----------------------------
    // SMOOTH LINE TRANSITION
    // -----------------------------
    g.select(".line-path")
        .datum(data)
        .transition()
        .duration(700)
        .attr("d", lineGen);

    // -----------------------------
    // DATA POINTS (ENTER / UPDATE / EXIT)
    // -----------------------------
    const pg = g.select(".line-points-group");

    const pts = pg.selectAll(".line-point")
        .data(data, d => d.YEAR); // year = key

    pts.join(
        enter => enter.append("circle")
            .attr("class", "line-point")
            .attr("r", 0)
            .attr("fill", "steelblue")
            .attr("cx", d => x(d.YEAR))
            .attr("cy", d => y(d[key]))
            .transition()
            .duration(500)
            .attr("r", 4),

        update => update
            .transition()
            .duration(700)
            .attr("cx", d => x(d.YEAR))
            .attr("cy", d => y(d[key])),

        exit => exit
            .transition()
            .duration(400)
            .attr("r", 0)
            .remove()
    );

    // -----------------------------
    // DETECT + DRAW PEAKS (max/min)
    // -----------------------------
    updateLine1PeaksAndAnimations(g, data, x, y, key);

    // -----------------------------
    // REBIND TOOLTIP (depends on data + scales)
    // -----------------------------
    initializeLine1Tooltip(g, data, x, y, innerWidth, innerHeight, key);
}


// ======================================================
// PEAK ANNOTATION (MAX + MIN POINTS)
// Adds labelled color-coded markers.
// ======================================================
function updateLine1PeaksAndAnimations(g, data, x, y, key) {

    const peaks = g.select(".line-peaks-group");
    peaks.selectAll("*").remove(); // reset

    // Nothing to annotate if only 1 year available
    if (!data.length || data.length <= 1) return;

    const maxPoint = d3.greatest(data, d => d[key]);
    const minPoint = d3.least(data, d => d[key]);

    // -----------------------------
    // MAXIMUM POINT (RED)
    // -----------------------------
    const maxDot = peaks.append("circle")
        .attr("class", "peak-max-dot")
        .attr("r", 0)
        .attr("cx", x(maxPoint.YEAR))
        .attr("cy", y(maxPoint[key]))
        .attr("fill", "#e74c3c")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    maxDot.transition()
        .duration(500)
        .attr("r", 6);

    const maxLabel = peaks.append("text")
        .attr("class", "peak-max-label")
        .attr("x", x(maxPoint.YEAR) + 8)
        .attr("y", y(maxPoint[key]) - 10)
        .style("fill", "#e74c3c")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("opacity", 0)
        .text(`Peak`);

    maxLabel.transition()
        .delay(180)
        .duration(500)
        .style("opacity", 1);

    // -----------------------------
    // MINIMUM POINT (GREEN)
    // -----------------------------
    const minDot = peaks.append("circle")
        .attr("class", "peak-min-dot")
        .attr("r", 0)
        .attr("cx", x(minPoint.YEAR))
        .attr("cy", y(minPoint[key]))
        .attr("fill", "#2ecc71")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    minDot.transition()
        .duration(500)
        .attr("r", 6);

    const minLabel = peaks.append("text")
        .attr("class", "peak-min-label")
        .attr("x", x(minPoint.YEAR) - 10)
        .attr("y", y(minPoint[key]) + 18)
        .style("fill", "#2ecc71")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("opacity", 0)
        .text(`Lowest`);

    minLabel.transition()
        .delay(180)
        .duration(500)
        .style("opacity", 1);
}
