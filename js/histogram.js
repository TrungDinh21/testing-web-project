function renderHistogram(data, filters) {
  d3.select("#histogram").html("");
  d3.selectAll(".tooltip").remove();

  const margin = { top: 20, right: 20, bottom: 50, left: 60 },
        width = 900 - margin.left - margin.right,
        height = 350 - margin.top - margin.bottom;

  const svg = d3.select("#histogram")
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

  const totals = filteredData.map(d => +d.FINES + +d.CHARGES + +d.ARRESTS);

  const x = d3.scaleLinear().domain([0, d3.max(totals)]).nice().range([0, width]);
  const bins = d3.bin().domain(x.domain()).thresholds(10)(totals);
  const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).nice().range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Total Penalties");
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Count");

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  svg.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0) + 1)
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("height", d => height - y(d.length))
    .attr("fill", "#0077b6")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(150).style("opacity", 0.9);
      tooltip.html(`Count: ${d.length}`)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));
}
