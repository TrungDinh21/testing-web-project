// ---------------------------------------------------
// LINE CHART 2 — MULTI-STATE TREND LINE (2008–2024)
// Compares total penalties across ALL states over time.
// Includes:
//   • smooth curves
//   • legend
//   • hover vertical guideline tooltip
//   • dynamic transitions on filter updates
// ---------------------------------------------------

const drawLine2 = (penalties) => {

  // ---------------------------------------------------
  // CHART DIMENSIONS + RESPONSIVE INNER AREA
  // ---------------------------------------------------
  const width = 900;
  const height = 600;
  const margin = { top: 40, bottom: 50, left: 100, right: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // ---------------------------------------------------
  // CREATE RESPONSIVE SVG USING viewBox
  // ---------------------------------------------------
  const svg = d3.select("#line-2")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("display", "block");

  const g = svg.append("g")
    .attr("class", "line-group2")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // ---------------------------------------------------
  // PREPARE DATA: Group → State → Year
  // Produces structure:
  // [
  //   { state: "Victoria", values: [ {YEAR, total}, ... ] },
  //   ...
  // ]
  // ---------------------------------------------------
  const stateData = d3.rollups(
    penalties,
    v => ({ total: d3.sum(v, d => d.FINES + d.CHARGES + d.ARRESTS) }),
    d => d.JURISDICTION_FULL,
    d => d.YEAR
  ).map(([state, arr]) => ({
    state,
    values: arr.map(([YEAR, obj]) => ({
      YEAR: +YEAR,
      total: obj.total
    })).sort((a, b) => a.YEAR - b.YEAR) // keep chronological order
  }));

  // Flatten for scale domains
  const allYears = stateData.flatMap(s => s.values.map(v => v.YEAR));
  const allTotals = stateData.flatMap(s => s.values.map(v => v.total));

  // ---------------------------------------------------
  // EXTRACT SCALES
  // X = linear time scale
  // Y = total penalties scale
  // Color = categorical (each state → unique color)
  // ---------------------------------------------------
  const x = d3.scaleLinear()
    .domain(d3.extent(allYears))
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(allTotals)]).nice()
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal()
    .domain(stateData.map(s => s.state))
    .range(d3.schemeTableau10); // good readability + color blind friendly

  // ---------------------------------------------------
  // Save for update()
  // ---------------------------------------------------
  const svgNode = svg.node();
  svgNode.__xScale__ = x;
  svgNode.__yScale__ = y;
  svgNode.__color__ = color;
  svgNode.__margin__ = margin;
  svgNode.__innerWidth__ = innerWidth;
  svgNode.__innerHeight__ = innerHeight;

  // ---------------------------------------------------
  // DRAW AXES
  // ---------------------------------------------------
  g.append("g")
    .attr("class", "x-axis2")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d"))); // format years without commas

  g.append("g")
    .attr("class", "y-axis2")
    .call(d3.axisLeft(y));

  // Axis labels
  g.append("text")
    .attr("class", "line2-xlabel")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Year");

  g.append("text")
    .attr("class", "line2-ylabel")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Penalty Count");

  // ---------------------------------------------------
  // LINE GENERATOR
  // curveMonotoneX = smooth curve without overshoot
  // ---------------------------------------------------
  const line = d3.line()
    .x(d => x(d.YEAR))
    .y(d => y(d.total))
    .curve(d3.curveMonotoneX);

  // ---------------------------------------------------
  // DRAW INITIAL MULTI-STATE LINES
  // ---------------------------------------------------
  g.selectAll(".state-line2")
    .data(stateData)
    .join("path")
    .attr("class", "state-line2")
    .attr("fill", "none")
    .attr("stroke", d => color(d.state))
    .attr("stroke-width", 2)
    .attr("d", d => line(d.values));

  // ---------------------------------------------------
  // DRAW LEGEND
  // Placed at the top, automatic multi-column layout
  // ---------------------------------------------------
  const legend = svg.append("g")
    .attr("transform", `translate(150, 5)`);

  const columns = 4;
  const itemWidth = 130;
  const itemHeight = 25;

  const legendItem = legend.selectAll(".legend-item")
    .data(stateData)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      return `translate(${col * itemWidth}, ${row * itemHeight})`;
    });

  legendItem.append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", d => color(d.state));

  legendItem.append("text")
    .attr("x", 22)
    .attr("y", 12)
    .attr("font-size", "12px")
    .text(d => d.state);

  // ---------------------------------------------------
  // ENABLE TOOLTIP (vertical hover line)
  // ---------------------------------------------------
  const tooltipStateData = stateData.map(s => ({
    state: s.state,
    values: s.values,
    color: color(s.state)
  }));

  initializeLine2Tooltip(g, tooltipStateData, x, innerWidth, innerHeight);
};


// ========================================================================
// UPDATE FUNCTION — redraws after filters change
// ========================================================================
function updateLine2(filteredPenalties) {

  const svg = d3.select("#line-2 svg").node();
  if (!svg) return;

  const g = d3.select("#line-2 svg .line-group2");

  // Retrieve saved properties
  const x = svg.__xScale__;
  const color = svg.__color__;
  const innerWidth = svg.__innerWidth__;
  const innerHeight = svg.__innerHeight__;

  // ---------------------------------------------------
  // RE-AGGREGATE FILTERED DATA
  // ---------------------------------------------------
  const stateData = d3.rollups(
    filteredPenalties,
    v => ({ total: d3.sum(v, d => d.FINES + d.CHARGES + d.ARRESTS) }),
    d => d.JURISDICTION_FULL,
    d => d.YEAR
  ).map(([state, arr]) => ({
    state,
    values: arr.map(([YEAR, obj]) => ({
      YEAR: +YEAR,
      total: obj.total
    })).sort((a, b) => a.YEAR - b.YEAR)
  }));

  // Compute updated Y domain
  const allTotals = stateData.flatMap(s => s.values.map(v => v.total));

  const y = d3.scaleLinear()
    .domain([0, d3.max(allTotals)]).nice()
    .range([innerHeight, 0]);

  // ---------------------------------------------------
  // UPDATE Y-AXIS WITH TRANSITION
  // ---------------------------------------------------
  g.select(".y-axis2")
    .transition()
    .duration(700)
    .call(d3.axisLeft(y));

  // Updated line generator (y-scale changed)
  const line = d3.line()
    .x(d => x(d.YEAR))
    .y(d => y(d.total))
    .curve(d3.curveMonotoneX);

  // ---------------------------------------------------
  // UPDATE STATE LINES
  // ENTER / UPDATE / EXIT pattern
  // ---------------------------------------------------
  const lines = g.selectAll(".state-line2")
    .data(stateData, d => d.state);

  lines.join(
    enter =>
      enter.append("path")
        .attr("class", "state-line2")
        .attr("fill", "none")
        .attr("stroke", d => color(d.state))
        .attr("stroke-width", 2)
        .attr("d", d => line(d.values)),

    update =>
      update.transition()
        .duration(700)
        .attr("stroke", d => color(d.state))
        .attr("d", d => line(d.values)),

    exit => exit.remove()
  );

  // ---------------------------------------------------
  // UPDATE TOOLTIP DATA AFTER FILTERING
  // ---------------------------------------------------
  const tooltipStateData = stateData.map(s => ({
    state: s.state,
    values: s.values,
    color: color(s.state)
  }));

  initializeLine2Tooltip(g, tooltipStateData, x, innerWidth, innerHeight);
}
