// -----------------------------
// LINE CHART (Total Penalties per Year)
// -----------------------------
const drawLine1 = (penalties) => {
  const linewidth = 900;
  const lineheight = 600;
  const margin = { top: 40, bottom: 50, left: 60, right: 40 };
  const innerWidth = linewidth - margin.left - margin.right;
  const innerHeight = lineheight - margin.top - margin.bottom;

  // --- SVG container ---
  const svg = d3.select("#line-1")
    .append("svg")
    .attr("viewBox", `0 0 ${linewidth} ${lineheight}`)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("display", "block");

  const g = svg.append("g")
    .attr("class", "line-group")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // --- Aggregate data ---
  const yearlyData = d3.rollups(
    penalties,
    v => ({
      fines: d3.sum(v, d => d.FINES),
      charges: d3.sum(v, d => d.CHARGES),
      arrests: d3.sum(v, d => d.ARRESTS),
      total: d3.sum(v, d => d.FINES + d.CHARGES + d.ARRESTS)
    }),
    d => d.YEAR
  ).map(([year, values]) => ({ YEAR: +year, ...values }))
   .sort((a, b) => a.YEAR - b.YEAR);

  // --- Scales ---
  const x = d3.scaleLinear()
    .domain(d3.extent(yearlyData, d => d.YEAR))
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(yearlyData, d => d.total)]).nice()
    .range([innerHeight, 0]);

  // Save scale for later updates
  svg.node().__xScale__ = x;
  svg.node().__yScale__ = y;
  svg.node().__margin__ = margin;
  svg.node().__innerWidth__ = innerWidth;
  svg.node().__innerHeight__ = innerHeight;

  // --- Axes ---
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y));

  g.append("text")
   .attr("class", "x-label")
   .attr("text-anchor", "middle")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + margin.bottom - 10) 
    .attr("fill", "#333")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Year");

  g.append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${ -margin.left + 80 }, -15)`)
    .attr("fill", "#333")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Number of penalties");

  // --- Line generator ---
  const line = d3.line()
    .x(d => x(d.YEAR))
    .y(d => y(d.total))
    .curve(d3.curveMonotoneX);

  // --- Draw line ---
  g.append("path")
    .datum(yearlyData)
    .attr("class", "line-path")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  // --- Points ---
  g.selectAll("circle")
    .data(yearlyData)
    .join("circle")
    .attr("r", 4)
    .attr("fill", "steelblue")
    .attr("cx", d => x(d.YEAR))
    .attr("cy", d => y(d.total));

  // Tooltip
  initializeTooltip(g, "line", "total");
};



// -----------------------------
// UPDATE FUNCTION (fixed scale + skip 0-values)
// -----------------------------
function updateLine1(filteredData, filters) {
  const g = d3.select("#line-1 svg .line-group");
  if (g.empty()) return;

  const svg = d3.select("#line-1 svg").node();
  const x = svg.__xScale__;
  const y = svg.__yScale__;
  const margin = svg.__margin__;
  const innerWidth = svg.__innerWidth__;
  const innerHeight = svg.__innerHeight__;

  // --- Aggregate filtered data ---
  let yearlyData = d3.rollups(
    filteredData,
    v => ({
      fines: d3.sum(v, d => d.FINES),
      charges: d3.sum(v, d => d.CHARGES),
      arrests: d3.sum(v, d => d.ARRESTS),
      total: d3.sum(v, d => d.FINES + d.CHARGES + d.ARRESTS)
    }),
    d => d.YEAR
  ).map(([year, values]) => ({ YEAR: +year, ...values }))
   .sort((a, b) => a.YEAR - b.YEAR);

  // --- Determine key ---
  let selectedKey = "total";
  if (filters.penalty === "Fines") selectedKey = "fines";
  else if (filters.penalty === "Charges") selectedKey = "charges";
  else if (filters.penalty === "Arrests") selectedKey = "arrests";

  // --- Filter out zero values ---
  yearlyData = yearlyData.filter(d => d[selectedKey] > 0);

  // --- Update line generator ---
  const line = d3.line()
    .x(d => x(d.YEAR))
    .y(d => y(d[selectedKey]))
    .curve(d3.curveMonotoneX);

  // --- Update line path ---
  const path = g.select(".line-path")
    .datum(yearlyData);

  path.transition()
    .duration(700)
    .attr("d", line)
    .attr("stroke", "steelblue");

  // --- Update circles ---
  const circles = g.selectAll("circle")
    .data(yearlyData, d => d.YEAR);

  circles.join(
    enter => enter.append("circle")
      .attr("r", 4)
      .attr("fill", "steelblue")
      .attr("cx", d => x(d.YEAR))
      .attr("cy", d => y(d[selectedKey])),
    update => update
      .transition().duration(700)
      .attr("cx", d => x(d.YEAR))
      .attr("cy", d => y(d[selectedKey])),
    exit => exit.remove()
  );

  // Rebind tooltip
  initializeTooltip(g, "line", selectedKey);
}
