// ======================================================
// ZOOM INTERACTION FOR MAP
// Handles pan + zoom + reset zoom button
// ======================================================
function initializeZoom(svg, group, initialTransform) {
  const zoom = d3.zoom()
    .scaleExtent([1, 8]) // NOTE: Set allowed zoom range (min 1x, max 8x)
    .on("zoom", (event) => {
      group.attr("transform", event.transform); // NOTE: Move and scale map shapes
      group.attr("stroke-width", 1 / event.transform.k); // NOTE: Adjust border width when zooming
    });

  svg.call(zoom); // NOTE: Enable zoom behaviour on SVG element

  // NOTE: Optional "Reset Zoom" button
  const resetBtn = document.getElementById("resetZoom");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      svg.transition().duration(650)
        .call(zoom.transform, initialTransform); // NOTE: Smoothly reset to starting position
    })
  }
}


// ======================================================
// FILTER BLOCK FOR PAGE 1 (MAP + LINE 1 + BAR CHART)
// Creates dropdown filters + triggers real-time updates
// ======================================================
function createFilters(csvData, onFilterChange) {
  const filterContainer = d3.select("#filters");

  // NOTE: Helper creates <label> + <select> block
  const createDropdown = (id, labelText, options) => {
    const div = filterContainer.append("div").attr("class", "filter-group");
    div.append("label").attr("for", id).text(labelText + ": ");
    const select = div.append("select").attr("id", id);

    // NOTE: Populate <select> with <option> items
    select.selectAll("option")
      .data(options)
      .join("option")
      .attr("value", d => d)
      .text(d => d);

    return select;
  };

  // NOTE: Extract unique dropdown choices from dataset
  const uniqueYears = Array.from(new Set(csvData.map(d => d.YEAR))).sort((a, b) => Number(b) - Number(a));
  const years = ["All", ...uniqueYears];

  const metrics = ["All", ...new Set(csvData.map(d => d.METRIC))];

  // NOTE: Remove "Other" from detection methods (not relevant)
  const methods = ["All",
    ...Array.from(new Set(csvData.map(d => d.DETECTION_METHOD)))
      .filter(m => m !== "Other")
      .sort()
  ];

  // NOTE: Clean + sort age groups numerically where possible
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

  // NOTE: Create the actual dropdowns
  const yearSelect = createDropdown("yearFilter", "Year", years);
  const penaltySelect = createDropdown("penaltyFilter", "Penalty Type", penalties);
  const metricSelect = createDropdown("metricFilter", "Violation Type", metrics);
  const methodSelect = createDropdown("methodFilter", "Detection Method", methods);
  const ageSelect = createDropdown("ageFilter", "Age Group", ages);
  const jurisdictionSelect = createDropdown("jurisdictionFilter", "Jurisdiction", jurisdictions);

  // NOTE: When any filter changes, compute new filtered dataset
  const handleFilterChange = () => {
    const filters = {
      year: yearSelect.property("value"),
      penalty: penaltySelect.property("value"),
      metric: metricSelect.property("value"),
      method: methodSelect.property("value"),
      age: ageSelect.property("value"),
      jurisdiction: jurisdictionSelect.property("value")
    };

    // NOTE: Apply all filters sequentially
    let filtered = csvData;
    if (filters.year !== "All") filtered = filtered.filter(d => d.YEAR == filters.year);
    if (filters.metric !== "All") filtered = filtered.filter(d => d.METRIC === filters.metric);
    if (filters.method !== "All") filtered = filtered.filter(d => d.DETECTION_METHOD === filters.method);
    if (filters.age !== "All") filtered = filtered.filter(d => d.AGE_GROUP === filters.age);
    if (filters.jurisdiction !== "All") filtered = filtered.filter(d => d.JURISDICTION_FULL === filters.jurisdiction);

    // NOTE: Callback to update map/line/bar charts
    onFilterChange(filtered, filters);
  };

  // NOTE: Bind filter change event to all dropdowns
  d3.selectAll("#filters select").on("change", handleFilterChange);
}


// ======================================================
// SHARED TOOLTIP FUNCTION (MAP + BAR CHARTS)
// Automatically adapts tooltip content based on chart type
// ======================================================
function initializeTooltip(g, chartType = "map", selectedKey = "penaltiesCount") {

  // NOTE: Create global tooltip container once
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

  // NOTE: Label cleaner
  const formatLabel = (key) => {
    if (!key) return "";
    if (key === "penaltiesCount") return "All Penalties";
    if (key === "total") return "Total Penalties";
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const label = formatLabel(selectedKey);

  // NOTE: Select correct graphic elements depending on chart type
  let elements;
  if (chartType === "map") elements = g.selectAll("path");
  else if (chartType === "bar") elements = g.selectAll("rect");

  // NOTE: Tooltip interactions
  elements
    .on("mouseover", (event, d) => {
      let html = "";

      if (chartType === "map") {
        const data = d.properties.data;
        html = `
          <strong>${d.properties.STATE_NAME}</strong><br>
          <strong>${label}:</strong> ${data[selectedKey]?.toLocaleString() || 0}
        `;
      }

      else if (chartType === "bar") {
        html = `
          <strong>${d.state}</strong><br>
          <strong>Fines:</strong> ${d.fines}<br>
          <strong>Charges:</strong> ${d.charges}<br>
          <strong>Arrests:</strong> ${d.arrests}<br>
          <strong>Total:</strong> ${d.total}
        `;
      }

      tooltip
        .style("visibility", "visible")
        .style("z-index", "9999")
        .style("opacity", "1")
        .html(html);

      // NOTE: highlight hovered shape
      d3.select(event.currentTarget)
        .attr("stroke", "#333")
        .attr("stroke-width", 2);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("top", `${event.pageY - 60}px`)
        .style("left", `${event.pageX - 150}px`);
    })
    .on("mouseout", (event) => {
      tooltip.style("visibility", "hidden");
      d3.select(event.currentTarget)
        .attr("stroke-width", 0.5);
    });
}


// ======================================================
// LINE 1 TOOLTIP (NATIONAL TRENDS PAGE)
// Uses hover line + tracking dot + dynamic tooltip
// ======================================================
function initializeLine1Tooltip(g, yearlyData, xScale, yScale, innerWidth, innerHeight, selectedKey) {

  // NOTE: Create tooltip container if missing
  let tooltip = d3.select(".tooltip-line1");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip-line1")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "8px 10px")
      .style("border-radius", "6px")
      .style("font-size", "13px")
      .style("visibility", "hidden")
      .style("opacity", 0)
      .style("pointer-events", "none")
      .style("z-index", "9999");
  }

  // NOTE: Remove previous guideline/dot overlays
  g.selectAll(".line1-hover-line, .line1-overlay, .hover-dot").remove();

  // NOTE: Vertical guideline that follows mouse
  const hoverLine = g.append("line")
    .attr("class", "line1-hover-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#555")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 3")
    .style("opacity", 0);

  // NOTE: Dot marking the exact value on the line
  const hoverDot = g.append("circle")
    .attr("class", "hover-dot")
    .attr("r", 6)
    .attr("fill", "white")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .style("opacity", 0);

  // NOTE: Mapping field → human-readable label
  const labelMap = {
    total: "Total Penalties",
    fines: "Fines",
    charges: "Charges",
    arrests: "Arrests"
  };
  const label = labelMap[selectedKey] || "Value";

  // NOTE: Transparent overlay capturing mouse movement
  const overlay = g.append("rect")
    .attr("class", "line1-overlay")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .style("pointer-events", "all");

  overlay
    .on("mousemove", function (event) {

      const [mx] = d3.pointer(event, this);
      const xValue = xScale.invert(mx); // NOTE: convert pixel → year (float)

      // NOTE: Find closest YEAR integer
      let closest = null;
      let minDist = Infinity;

      yearlyData.forEach(d => {
        const dist = Math.abs(d.YEAR - xValue);
        if (dist < minDist) {
          minDist = dist;
          closest = d;
        }
      });

      if (!closest) return;

      const year = closest.YEAR;
      const value = closest[selectedKey];

      // NOTE: Move guideline
      const xPos = xScale(year);
      hoverLine
        .style("opacity", 1)
        .attr("x1", xPos)
        .attr("x2", xPos);

      // NOTE: Move dot to correct Y position
      hoverDot
        .style("opacity", 1)
        .attr("cx", xPos)
        .attr("cy", yScale(value));

      // NOTE: Tooltip content
      tooltip.html(`
        <strong>Year:</strong> ${year}<br>
        <strong>${label}:</strong> ${value.toLocaleString()}
      `);

      // Smart positioning so tooltip doesn't go offscreen
      const tooltipWidth = 170;
      const pageWidth = window.innerWidth;
      let leftPos = event.pageX + 16;

      if (leftPos + tooltipWidth > pageWidth - 16) {
        leftPos = event.pageX - tooltipWidth - 16;
      }

      tooltip
        .style("left", `${leftPos}px`)
        .style("top", `${event.pageY - 40}px`)
        .style("visibility", "visible")
        .style("opacity", 1);
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden").style("opacity", 0);
      hoverLine.style("opacity", 0);
      hoverDot.style("opacity", 0);
    });
}


// ======================================================
// TOOLTIP FOR LINE-2 (MULTI-STATE TRENDS PAGE)
// Shows all states’ values at a hovered year
// ======================================================
function initializeLine2Tooltip(g, stateData, xScale, innerWidth, innerHeight) {

  // NOTE: Create tooltip if missing
  let tooltip = d3.select(".tooltip-line2");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip-line2")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 8px")
      .style("border-radius", "4px")
      .style("font-size", "13px")
      .style("visibility", "hidden")
      .style("z-index", "9999");
  }

  // NOTE: Vertical hover guideline
  const hoverLine = g.append("line")
    .attr("class", "line2-hover-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#333")
    .attr("stroke-width", 1.2)
    .style("opacity", 0);

  // NOTE: Transparent mouse capture overlay
  const overlay = g.append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .style("pointer-events", "all");

  overlay
    .on("mousemove", (event) => {
      const [mx] = d3.pointer(event);
      const hoveredYear = Math.round(xScale.invert(mx)); // NOTE: pixel → nearest year

      // NOTE: Move guide line
      hoverLine
        .style("opacity", 1)
        .attr("x1", xScale(hoveredYear))
        .attr("x2", xScale(hoveredYear));

      // NOTE: Build tooltip content with all states
      let html = `<strong>Year: ${hoveredYear}</strong><br><br>`;

      stateData.forEach(s => {
        const found = s.values.find(v => v.YEAR === hoveredYear);
        html += `
                    <span style="color:${s.color}; font-weight:bold">${s.state}</span>:
                    ${found ? found.total.toLocaleString() : "0"}<br>
                `;
      });

      tooltip
        .style("visibility", "visible")
        .html(html)
        .style("left", `${event.pageX + 20}px`)
        .style("top", `${event.pageY - 40}px`);
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
      hoverLine.style("opacity", 0);
    });
}


// ======================================================
// HISTOGRAM TOOLTIP (PAGE 2)
// Highlights bin + shows range & count
// ======================================================
function initializeHistogramTooltip(g, xScale, bins, innerWidth, innerHeight) {

  // NOTE: Create tooltip if missing
  let tooltip = d3.select(".tooltip-hist");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip-hist")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 8px")
      .style("border-radius", "4px")
      .style("font-size", "13px")
      .style("visibility", "hidden")
      .style("z-index", "9999");
  }

  // NOTE: Clear old overlays before creating new one
  g.selectAll(".hist-overlay").remove();

  const bars = g.selectAll(".hist-rect");

  // NOTE: Transparent overlay to track pointer
  const overlay = g.append("rect")
    .attr("class", "hist-overlay")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent");

  overlay
    .on("mousemove", (event) => {
      const [mx] = d3.pointer(event);
      const hoveredValue = xScale.invert(mx); // NOTE: pixel → value

      // NOTE: Find the bin that contains this value
      const bin = bins.find(b => hoveredValue >= b.x0 && hoveredValue < b.x1);
      if (!bin) return;

      // NOTE: Reset all colors → highlight active bin only
      bars.attr("fill", "#4682B4");
      const idx = bins.indexOf(bin);
      bars.filter((d, i) => i === idx).attr("fill", "#FFD700");

      // NOTE: Tooltip content
      tooltip
        .style("visibility", "visible")
        .html(`
                    <strong>Range:</strong> ${Math.round(bin.x0)} – ${Math.round(bin.x1)}<br>
                    <strong>Count:</strong> ${bin.length}
                `)
        .style("left", `${event.pageX + 20}px`)
        .style("top", `${event.pageY - 40}px`);
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
      bars.attr("fill", "#4682B4"); // NOTE: reset colors
    });
}


// ======================================================
// FILTERS FOR PAGE 2 (STATE TRENDS + HISTOGRAM)
// ======================================================
function createFilters2(csvData, onFilterChange) {
  const filterContainer = d3.select("#filters2");
  filterContainer.html(""); // NOTE: remove old filters

  // NOTE: Dropdown generator
  const createDropdown = (id, label, options) => {
    const div = filterContainer.append("div").attr("class", "filter-group2");
    div.append("label").attr("for", id).text(label + ": ");
    const select = div.append("select").attr("id", id);

    select.selectAll("option")
      .data(["All", ...options])
      .join("option")
      .attr("value", d => d)
      .text(d => d);

    return select;
  };

  // NOTE: Extract unique filter choices
  const metrics = Array.from(new Set(csvData.map(d => d.METRIC))).sort();
  const methods = Array.from(new Set(csvData.map(d => d.DETECTION_METHOD))).filter(m => m !== "Other").sort();
  const ages = Array.from(new Set(csvData.map(d => d.AGE_GROUP))).filter(a => a && a.toLowerCase() !== "all ages").sort();

  // NOTE: Create filters
  const metricSelect = createDropdown("metricFilter2", "Violation Type", metrics);
  const methodSelect = createDropdown("methodFilter2", "Detection Method", methods);
  const ageSelect = createDropdown("ageFilter2", "Age Group", ages);

  function handleChange() {
    const filters = {
      metric: metricSelect.property("value"),
      method: methodSelect.property("value"),
      age: ageSelect.property("value")
    };

    let filteredPenalties = csvData;
    if (filters.metric !== "All") filteredPenalties = filteredPenalties.filter(d => d.METRIC === filters.metric);
    if (filters.method !== "All") filteredPenalties = filteredPenalties.filter(d => d.DETECTION_METHOD === filters.method);
    if (filters.age !== "All") filteredPenalties = filteredPenalties.filter(d => d.AGE_GROUP === filters.age);

    onFilterChange(filteredPenalties, filters);
  }

  filterContainer.selectAll("select").on("change", handleChange);
}


// ======================================================
// FILTERS FOR FAIRNESS COMPARISON (PAGE 3)
// Handles licences dataset + penalties dataset simultaneously
// ======================================================
function createFilters3(csvData, penaltiesLicences, onFilterChange) {
  const filterContainer = d3.select("#filters3");
  filterContainer.html(""); // NOTE: clear previous filters

  const createDropdown = (id, label, options) => {
    const div = filterContainer.append("div").attr("class", "filter-group3");
    div.append("label").attr("for", id).text(label + ": ");
    const select = div.append("select").attr("id", id);
    select.selectAll("option")
      .data(["All", ...options])
      .join("option")
      .attr("value", d => d)
      .text(d => d);
    return select;
  };

  // NOTE: Licence dataset missing 2008–2009 → exclude them
  const years = Array.from(new Set(csvData.map(d => +d.YEAR)))
    .filter(y => y !== 2008 && y !== 2009)
    .sort((a, b) => a - b);

  const metrics = Array.from(new Set(csvData.map(d => d.METRIC))).sort();
  const methods = Array.from(new Set(csvData.map(d => d.DETECTION_METHOD))).filter(m => m !== "Other").sort();
  const ages = Array.from(new Set(csvData.map(d => d.AGE_GROUP))).filter(a => a && a.toLowerCase() !== "all ages").sort();

  // NOTE: Create dropdowns
  const yearSelect = createDropdown("yearFilter", "Year", years);
  const metricSelect = createDropdown("metricFilter", "Violation Type", metrics);
  const methodSelect = createDropdown("methodFilter", "Detection Method", methods);
  const ageSelect = createDropdown("ageFilter", "Age Group", ages);

  function handleChange() {
    const filters = {
      year: yearSelect.property("value"),
      metric: metricSelect.property("value"),
      method: methodSelect.property("value"),
      age: ageSelect.property("value")
    };

    // NOTE: Filter licences dataset
    let filteredLicences = penaltiesLicences;
    if (filters.year !== "All") filteredLicences = filteredLicences.filter(d => +d.YEAR === +filters.year);
    if (filters.metric !== "All") filteredLicences = filteredLicences.filter(d => d.METRIC === filters.metric);
    if (filters.method !== "All") filteredLicences = filteredLicences.filter(d => d.DETECTION_METHOD === filters.method);
    if (filters.age !== "All") filteredLicences = filteredLicences.filter(d => d.AGE_GROUP === filters.age);

    // NOTE: Filter penalties dataset
    let filteredPenalties = csvData;
    if (filters.year !== "All") filteredPenalties = filteredPenalties.filter(d => +d.YEAR === +filters.year);
    if (filters.metric !== "All") filteredPenalties = filteredPenalties.filter(d => d.METRIC === filters.metric);
    if (filters.method !== "All") filteredPenalties = filteredPenalties.filter(d => d.DETECTION_METHOD === filters.method);
    if (filters.age !== "All") filteredPenalties = filteredPenalties.filter(d => d.AGE_GROUP === filters.age);

    onFilterChange(filteredLicences, filteredPenalties, filters);
  }

  filterContainer.selectAll("select").on("change", handleChange);
}
