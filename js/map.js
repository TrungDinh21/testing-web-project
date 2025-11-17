// ======================================================================
// DRAW MAP OF AUSTRALIA (GEOJSON + PENALTIES)
// This function runs once when the page loads.
// It renders:
//   - Choropleth map (by total penalties or selected penalty type)
//   - Legend (dynamic, updates on filter change)
//   - Zoom + pan interactions
//   - Tooltip on hover
// ======================================================================
const drawMap = (geoData, penalties) => {

  // ---------------------------
  // CHART LAYOUT CONFIGURATION
  // ---------------------------
  const mapWidth = 900;
  const mapHeight = Math.min(window.innerHeight * 0.7, 450);  // responsive height
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const innerWidth = mapWidth - margin.left - margin.right;
  const innerHeight = mapHeight - margin.top - margin.bottom;

  // ---------------------------
  // CREATE RESPONSIVE SVG
  // ---------------------------
  const svg = d3.select("#map")
    .append("svg")
    .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("display", "block")
    .style("border", "1px solid #ccc");

  // Main group wrapper for map shapes
  const g = svg.append("g")
    .attr("class", "map-group")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ---------------------------
  // MERCATOR PROJECTION (AUSTRALIA)
  // ---------------------------
  const projection = d3.geoMercator()
    .center([134, -28])                 // centre of Australia
    .scale(mapWidth * 0.65)             // zoom level
    .translate([innerWidth / 2, innerHeight / 2]);  // centre in view

  const path = d3.geoPath().projection(projection);

  // ======================================================================
  // DATA AGGREGATION — compute penalties by jurisdiction
  // ======================================================================
  const aggregated = d3.rollups(
    penalties,
    v => {
      const fines = d3.sum(v, d => d.FINES);
      const charges = d3.sum(v, d => d.CHARGES);
      const arrests = d3.sum(v, d => d.ARRESTS);
      const penaltiesCount = fines + charges + arrests; // combined metric
      return { fines, charges, arrests, penaltiesCount };
    },
    d => d.JURISDICTION_FULL
  );

  // ======================================================================
  // MERGE RESULTS INTO GEOJSON FEATURES
  // Ensures each state polygon contains its penalty data
  // ======================================================================
  geoData.features.forEach(f => {
    const match = aggregated.find(([stateName]) => stateName === f.properties.STATE_NAME);
    f.properties.data = match
      ? match[1]
      : { fines: 0, charges: 0, arrests: 0, penaltiesCount: 0 };  // default
  });

  // Max value used for choropleth domain
  const maxValue = d3.max(aggregated, d => d[1].penaltiesCount);

  // ======================================================================
  // COLOR SCALE (SEQUENTIAL BLUE)
  // ======================================================================
  const colorScale = d3.scaleSequential()
    .domain([0, maxValue])
    .interpolator(d3.interpolateBlues);

  // ======================================================================
  // LEGEND (GRADIENT SCALE)
  // ======================================================================

  const legendWidth = 200;
  const legendHeight = 10;
  const legendX = innerWidth - legendWidth;
  const legendY = innerHeight + 12;

  // Ensure <defs> exists only once
  const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");

  // Gradient ID for reuse during updates
  const gradientId = "map-legend-gradient";

  // Gradient stops
  defs.append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%")
    .selectAll("stop")
    .data([0, 0.25, 0.5, 0.75, 1])
    .enter()
    .append("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => d3.interpolateBlues(d));

  // Legend container
  const legendG = g.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  // Gradient colour bar
  legendG.append("rect")
    .attr("class", "legend-rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", `url(#${gradientId})`)
    .attr("stroke", "#ccc");

  // Labels: min and max
  legendG.append("text")
    .attr("class", "legend-min")
    .attr("x", 0)
    .attr("y", legendHeight + 14)
    .attr("fill", "#333")
    .style("font-size", "11px")
    .text(0);

  legendG.append("text")
    .attr("class", "legend-max")
    .attr("x", legendWidth)
    .attr("y", legendHeight + 14)
    .attr("text-anchor", "end")
    .attr("fill", "#333")
    .style("font-size", "11px")
    .text(d3.format(".2s")(maxValue));

  // Legend title
  legendG.append("text")
    .attr("class", "legend-title")
    .attr("x", legendWidth / 2)
    .attr("y", -6)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Range values");

  // ======================================================================
  // DRAW STATE SHAPES
  // ======================================================================
  g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => colorScale(d.properties.data.penaltiesCount))
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5);

  // ======================================================================
  // RESPONSIVE HEIGHT HANDLING
  // ======================================================================
  window.addEventListener("resize", () => {
    const newHeight = Math.min(window.innerHeight * 0.7, 450);
    svg.attr("viewBox", `0 0 ${mapWidth} ${newHeight}`);
  });

  // ======================================================================
  // ENABLE ZOOM + TOOLTIP
  // ======================================================================
  const initialTransform = d3.zoomIdentity
    .translate(margin.left, margin.top)
    .scale(1);

  initializeZoom(svg, g, initialTransform);

  let selectedKey = "penaltiesCount";  // default
  initializeTooltip(g, "map", selectedKey);
};



// ======================================================================
// UPDATE MAP WHEN FILTERS CHANGE
// Triggered when the user selects new filters (metric, penalty type, etc.)
// ======================================================================
function updateMap(geoData, filteredPenalties, filters) {

  const g = d3.select("#map svg .map-group");

  // ---------------------------
  // RE-AGGREGATE USING FILTERED DATA
  // ---------------------------
  const aggregated = d3.rollups(
    filteredPenalties,
    v => {
      const fines = d3.sum(v, d => d.FINES);
      const charges = d3.sum(v, d => d.CHARGES);
      const arrests = d3.sum(v, d => d.ARRESTS);
      const penaltiesCount = fines + charges + arrests;
      return { fines, charges, arrests, penaltiesCount };
    },
    d => d.JURISDICTION_FULL
  );

  // Attach updated values back into GeoJSON
  geoData.features.forEach(f => {
    const match = aggregated.find(([stateName]) => stateName === f.properties.STATE_NAME);
    f.properties.data = match
      ? match[1]
      : { fines: 0, charges: 0, arrests: 0, penaltiesCount: 0 };
  });

  // ---------------------------
  // DETERMINE SELECTED PENALTY KEY
  // ---------------------------
  let selectedKey = "penaltiesCount";
  if (filters.penalty === "Fines") selectedKey = "fines";
  else if (filters.penalty === "Charges") selectedKey = "charges";
  else if (filters.penalty === "Arrests") selectedKey = "arrests";

  // ---------------------------
  // UPDATE COLOR SCALE
  // ---------------------------
  const maxValue = d3.max(geoData.features, d => d.properties.data[selectedKey]);

  const colorScale = d3.scaleSequential()
    .domain([0, maxValue])
    .interpolator(d3.interpolateBlues);

  // Update map colouring
  d3.select("#map svg g")
    .selectAll("path")
    .transition()
    .duration(600)
    .attr("fill", d => colorScale(d.properties.data[selectedKey] || 0));

  // ======================================================================
  // UPDATE LEGEND (GRADIENT + LABELS)
  // ======================================================================
  const svg = d3.select("#map svg");

  // Remove old gradient and rebuild it
  svg.select("#map-legend-gradient").remove();

  const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");

  defs.append("linearGradient")
    .attr("id", "map-legend-gradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%")
    .selectAll("stop")
    .data([0, 0.25, 0.5, 0.75, 1])
    .enter()
    .append("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => d3.interpolateBlues(d));

  // Apply to legend rectangle
  g.select(".legend-rect").attr("fill", "url(#map-legend-gradient)");

  // Update min and max labels
  const formattedMax = d3.format(".2s")(maxValue || 0);
  g.select(".legend-min").text(0);
  g.select(".legend-max").text(formattedMax);

  // ---------------------------
  // REBIND TOOLTIP TO USE NEW SELECTED METRIC
  // ---------------------------
  initializeTooltip(g, "map", selectedKey);
}
