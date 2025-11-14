// ZOOM interaction for map
function initializeZoom(svg, group, initialTransform) {
  const zoom = d3.zoom()
    .scaleExtent([1, 8]) //Min and Max level for zoom
    .on("zoom", (event) => {
      group.attr("transform", event.transform);
      group.attr("stroke-width", 1 / event.transform.k);
    });

  svg.call(zoom);

  //Reset button
  const resetBtn = document.getElementById("resetZoom");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
        svg.transition().duration(650)
        .call (zoom.transform, initialTransform);
    })
  }
}

// Filter Interaction 
function createFilters(csvData, onFilterChange) {
  const filterContainer = d3.select("#filters");

  // Helper function
  const createDropdown = (id, labelText, options) => {
    const div = filterContainer.append("div").attr("class", "filter-group");
    div.append("label").attr("for", id).text(labelText + ": ");
    const select = div.append("select").attr("id", id);
    select.selectAll("option")
      .data(options)
      .join("option")
      .attr("value", d => d)
      .text(d => d);
    return select;
  };

  
  const uniqueYears = Array.from(new Set(csvData.map(d => d.YEAR)));
  uniqueYears.sort((a, b) => Number(b) - Number(a)); // đổi thành ascending nếu muốn
  const years = ["All", ...uniqueYears];
  const metrics = ["All", ...new Set(csvData.map(d => d.METRIC))];
  const methods = ["All", ...Array.from(new Set(csvData.map(d => d.DETECTION_METHOD)))
    .filter(m => m !== "Other")
    .sort()];
  const ageGroups = Array.from(new Set(csvData.map(d => d.AGE_GROUP)))
        .filter(age => age && age.toLowerCase() !== "all ages")
        .sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
  const ages = ["All", ...ageGroups];
  const jurisdictions = ["All", ...new Set(csvData.map(d => d.JURISDICTION_FULL))];
  const penalties = ["All Penalties", "Fines", "Charges", "Arrests"];

  // Create Dropdown
  const yearSelect = createDropdown("yearFilter", "Year", years);
  const penaltySelect = createDropdown("penaltyFilter", "Penalty Type", penalties);
  const metricSelect = createDropdown("metricFilter", "Violation Type", metrics);
  const methodSelect = createDropdown("methodFilter", "Detection Method", methods);
  const ageSelect = createDropdown("ageFilter", "Age Group", ages);
  const jurisdictionSelect = createDropdown("jurisdictionFilter", "Jurisdiction", jurisdictions);

  const handleFilterChange = () => {
    const filters = {
      year: yearSelect.property("value"),
      penalty: penaltySelect.property("value"),
      metric: metricSelect.property("value"),
      method: methodSelect.property("value"),
      age: ageSelect.property("value"),
      jurisdiction: jurisdictionSelect.property("value")
    };

    // Filter data
    let filtered = csvData;
    if (filters.year !== "All") filtered = filtered.filter(d => d.YEAR == filters.year);
    if (filters.metric !== "All") filtered = filtered.filter(d => d.METRIC === filters.metric);
    if (filters.method !== "All") filtered = filtered.filter(d => d.DETECTION_METHOD === filters.method);
    if (filters.age !== "All") filtered = filtered.filter(d => d.AGE_GROUP === filters.age);
    if (filters.jurisdiction !== "All") filtered = filtered.filter(d => d.JURISDICTION_FULL === filters.jurisdiction);

    
    onFilterChange(filtered, filters);
  };

  d3.selectAll("#filters select").on("change", handleFilterChange);
}

function initializeTooltip(g, chartType = "map", selectedKey = "penaltiesCount") {

  let tooltip = d3.select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 8px")
      .style("border-radius", "4px")
      .style("font-size", "13px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.15)")
      .style("visibility", "hidden");
  }

  // Choose element to be suitable with different chart types
  let elements;
  if (chartType === "map") elements = g.selectAll("path");
  else if (chartType === "line") elements = g.selectAll("circle");
  else if (chartType === "bar") elements = g.selectAll("rect");

  // Assign event to tooltip
  elements
    .on("mouseover", (event, d) => {
      let html = "";

      if (chartType === "map") {
        const data = d.properties.data;
        html = `
          <strong>${d.properties.STATE_NAME}</strong><br>
          ${selectedKey === "penaltiesCount" ? "All Penalties" : selectedKey.charAt(0).toUpperCase() + selectedKey.slice(1)}:
          ${data[selectedKey]?.toLocaleString() || 0}
        `;
      } 
      else if (chartType === "line") {
        let label =
          selectedKey === "total"
            ? "All Penalties"
            : selectedKey.charAt(0).toUpperCase() + selectedKey.slice(1);

        const value =
          selectedKey === "total"
            ? d.total
            : d[selectedKey] ?? 0;

        html = `
          <strong>Year:</strong> ${d.YEAR}<br>
          <strong>${label}:</strong> ${value.toLocaleString()}
        `;
      } 
      else if (chartType === "bar") {
        html = `
          <strong>${d.state}</strong><br>
          Fines: ${d.fines.toFixed(1)}<br>
          Charges: ${d.charges.toFixed(1)}<br>
          Arrests: ${d.arrests.toFixed(1)}<br>
          <strong>Total:</strong> ${d.total.toFixed(1)}
        `;
      }


      tooltip
        .style("visibility", "visible")
        .style("z-index", "9999")
        .style("opacity", "1")
        .style("display", "block")
        .html(html);

      d3.select(event.currentTarget)
        .attr("stroke", "#333")
        .attr("stroke-width", 2);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("top", `${event.pageY - 40}px`)
        .style("left", `${event.pageX + 10}px`);     
    })
    .on("mouseout", (event) => {
      tooltip.style("visibility", "hidden");
      d3.select(event.currentTarget)
        .attr("stroke-width", 0.5);
    });
}

d3.csv("data/Penalties_process.csv").then(data => { //CHANGES Andrew - START
  data.forEach(d => {
    d.YEAR = +d.YEAR;
    d.FINES = +d.FINES;
    d.CHARGES = +d.CHARGES;
    d.ARRESTS = +d.ARRESTS;
  });

  const metrics = Array.from(new Set(data.map(d => d.METRIC))).sort();
  const methods = Array.from(new Set(data.map(d => d.DETECTION_METHOD))).sort();
  const ages = Array.from(new Set(data.map(d => d.AGE_GROUP))).sort();

  const metricSelect = d3.select("#metricSelect");
  const methodSelect = d3.select("#methodSelect");
  const ageSelect = d3.select("#ageSelect");

  metricSelect.append("option").text("All").attr("value", "");
  metrics.forEach(m => metricSelect.append("option").text(m).attr("value", m));

  methodSelect.append("option").text("All").attr("value", "");
  methods.forEach(m => methodSelect.append("option").text(m).attr("value", m));

  ageSelect.append("option").text("All").attr("value", "");
  ages.forEach(a => ageSelect.append("option").text(a).attr("value", a));

  const filters = { metric: null, method: null, age: null };

  function update() {
    renderLineChart(data, filters);
    renderHistogram(data, filters);
  }

  metricSelect.on("change", e => { filters.metric = e.target.value || null; update(); });
  methodSelect.on("change", e => { filters.method = e.target.value || null; update(); });
  ageSelect.on("change", e => { filters.age = e.target.value || null; update(); });

  update();
}); //CHANGES ANDREW - END





