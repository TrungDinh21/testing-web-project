function renderLineChart(data, filters) {
  d3.select("#line-2").html("");
  d3.selectAll(".tooltip").remove();

  const margin = { top: 20, right: 20, bottom: 50, left: 70 },
        width = 900 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#line-2")
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filteredData = data.filter(d =>
    (!filters.metric || d.METRIC === filters.metric) &&
    (!filters.method || d.DETECTION_METHOD === filters.method) &&
    (!filters.age || d.AGE_GROUP === filters.age)
  );

  if (filteredData.length === 0) return;

  const grouped = d3.groups(filteredData, d => d.JURISDICTION);

  const x = d3.scaleLinear()
    .domain(d3.extent(filteredData, d => +d.YEAR))
    .range([0, width]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(filteredData, d => +d.FINES + +d.CHARGES + +d.ARRESTS)])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Year");
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Total Penalties");

  const line = d3.line()
    .x(d => x(+d.YEAR))
    .y(d => y(+d.FINES + +d.CHARGES + +d.ARRESTS))
    .curve(d3.curveMonotoneX);

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  grouped.forEach(([jurisdiction, values]) => {
    svg.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", color(jurisdiction))
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.selectAll(`.dot-${jurisdiction}`)
      .data(values)
      .enter()
      .append("circle")
      .attr("cx", d => x(+d.YEAR))
      .attr("cy", d => y(+d.FINES + +d.CHARGES + +d.ARRESTS))
      .attr("r", 3)
      .attr("fill", color(jurisdiction))
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(150).style("opacity", 0.9);
        tooltip.html(
          `<strong>${jurisdiction}</strong><br>Year: ${d.YEAR}<br>
           Fines: ${d.FINES}<br>Charges: ${d.CHARGES}<br>Arrests: ${d.ARRESTS}`
        )
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));
  });

  // legend under chart
  const legend = d3.select("#line-2")
    .append("div")
    .attr("class", "legend-container");

  grouped.forEach(([jurisdiction]) => {
    const item = legend.append("div").attr("class", "legend-item");
    item.append("div").attr("class", "legend-color").style("background", color(jurisdiction));
    item.append("span").text(jurisdiction);
  });
}
