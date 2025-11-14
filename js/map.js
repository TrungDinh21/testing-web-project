const drawMap = (geoData, penalties) => {
  const mapWidth = 900;
  const mapHeight = Math.min(window.innerHeight * 0.7, 450); 
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const innerWidth = mapWidth - margin.left - margin.right;
  const innerHeight = mapHeight - margin.top - margin.bottom;

  const svg = d3.select("#map")
    .append("svg")
    .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("display", "block")
    .style("border", "1px solid #ccc");

  const g = svg.append("g")
  .attr("class", "map-group")
  .attr("transform", `translate(${margin.left},${margin.top})`);


  const projection = d3.geoMercator()
    .center([134, -28])
    .scale(mapWidth * 0.65)
    .translate([innerWidth / 2, innerHeight / 2]);

  const path = d3.geoPath().projection(projection);

  // --- Aggregate penalties ---
  const aggregated = d3.rollups(
    penalties,
    v => {
      const fines = d3.sum(v, d => d.FINES);
      const charges = d3.sum(v, d => d.CHARGES);
      const arrests = d3.sum(v, d => d.ARRESTS);
      const penaltiesCount = fines + charges + arrests;
      return { fines, charges, arrests, penaltiesCount };
    },
    d => d.JURISDICTION_FULL
  );

  // --- Merge aggregated data with geojson ---
  geoData.features.forEach(f => {
    const match = aggregated.find(([stateName]) => stateName === f.properties.STATE_NAME);
    f.properties.data = match
      ? match[1]
      : { fines: 0, charges: 0, arrests: 0, penaltiesCount: 0 };
  });

  const maxValue = d3.max(aggregated, d => d[1].penaltiesCount);

  // --- Color scale ---
  const colorScale = d3.scaleSequential()
    .domain([0, maxValue])
    .interpolator(d3.interpolateBlues);

  // --- Legend (gradient) ---
  // legend dimensions
  const legendWidth = 200;
  const legendHeight = 10;
  const legendX = innerWidth - legendWidth; // right-aligned inside g
  const legendY = innerHeight + 12; // just below map paths

  // ensure defs exists
  const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");

  // create gradient (id used for rect fill)
  const gradientId = "map-legend-gradient";
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

  // legend group
  const legendG = g.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  // gradient rect
  legendG.append("rect")
    .attr("class", "legend-rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", `url(#${gradientId})`)
    .attr("stroke", "#ccc");

  // min / max labels
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

  // title
  legendG.append("text")
    .attr("class", "legend-title")
    .attr("x", legendWidth / 2)
    .attr("y", -6)
    .attr("text-anchor", "middle")
    .attr("fill", "#333")
    .style("font-size", "12px")
    .text("Range values");

  // --- Draw states ---
  g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => colorScale(d.properties.data.penaltiesCount))
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5);

// --- Responsive when resize ---
  window.addEventListener("resize", () => {
    const newHeight = Math.min(window.innerHeight * 0.7, 450);
    svg.attr("viewBox", `0 0 ${mapWidth} ${newHeight}`);
  });

  const initialTransform = d3.zoomIdentity
  .translate(margin.left, margin.top)
  .scale(1);

   initializeZoom(svg, g, initialTransform);
   let selectedKey = "penaltiesCount";
   initializeTooltip(g, "map", selectedKey);


};

function updateMap(geoData, filteredPenalties, filters) {
  // select the same group created in drawMap
  const g = d3.select("#map svg .map-group");
  // --- Aggregate ---
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

  // --- Merge into geojson ---
  geoData.features.forEach(f => {
    const match = aggregated.find(([stateName]) => stateName === f.properties.STATE_NAME);
    f.properties.data = match
      ? match[1]
      : { fines: 0, charges: 0, arrests: 0, penaltiesCount: 0 };
  });

  // --- Define which penalty to choose ---
  let selectedKey = "penaltiesCount";
  if (filters.penalty === "Fines") selectedKey = "fines";
  else if (filters.penalty === "Charges") selectedKey = "charges";
  else if (filters.penalty === "Arrests") selectedKey = "arrests";

  // --- Update color scale ---
  const maxValue = d3.max(geoData.features, d => d.properties.data[selectedKey]);
  const colorScale = d3.scaleSequential()
    .domain([0, maxValue])
    .interpolator(d3.interpolateBlues);

  // --- Update color map ---
  d3.select("#map svg g")
    .selectAll("path")
    .transition()
    .duration(600)
    .attr("fill", d => colorScale(d.properties.data[selectedKey] || 0));

    // --- Update legend gradient + labels ---
  const svg = d3.select("#map svg");
  // recreate gradient stops (remove previous gradient then append new)
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

  // update rect fill to new gradient id
  g.select(".legend-rect").attr("fill", `url(#map-legend-gradient)`);

  // update min/max labels
  const formattedMax = d3.format(".2s")(maxValue || 0);
  g.select(".legend-min").text(0);
  g.select(".legend-max").text(formattedMax);

  // --- Update tooltip ---
  initializeTooltip(g, "map", selectedKey);
}
