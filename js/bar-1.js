// GLOBAL constant — used by both Bar1 and Bar2 to ensure consistent ordering
const fixedStateOrder = [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
    "Tasmania",
    "Northern Territory",
    "Australian Capital Territory"
];

// Mapping full jurisdiction names → abbreviations for axis labels
const stateAbbrevMap = {
    "New South Wales": "NSW",
    "Victoria": "VIC",
    "Queensland": "QLD",
    "Western Australia": "WA",
    "South Australia": "SA",
    "Tasmania": "TAS",
    "Northern Territory": "NT",
    "Australian Capital Territory": "ACT"
};

// -----------------------------
// BAR CHART 1  
// Penalties per 10,000 Driver Licences (summed across selected filters)
// -----------------------------
const drawBar1 = (data) => {

    // SVG dimensions and chart margins
    const barWidth = 600;
    const barHeight = 400;
    const margin = { top: 40, bottom: 50, left: 100, right: 40 };

    // Calculate inner drawing dimensions
    const innerWidth = barWidth - margin.left - margin.right;
    const innerHeight = barHeight - margin.top - margin.bottom;

    // --- Create SVG container ---
    const svg = d3.select("#bar-1")
        .append("svg")
        .attr("viewBox", `0 0 ${barWidth} ${barHeight}`) // scalable SVG
        .style("max-width", "100%")
        .style("height", "auto")
        .style("display", "block");

    // Group for bars, axes, labels
    const g = svg.append("g")
        .attr("class", "bar-group")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // --- Aggregate data by State ---
    // Summing fines/charges/arrests per 10k licences
    const summary = d3.rollups(
        data,
        v => ({
            fines: d3.sum(v, d => d["FINES PER 10000 LICENCES"]),
            charges: d3.sum(v, d => d["CHARGES PER 10000 LICENCES"]),
            arrests: d3.sum(v, d => d["ARRESTS PER 10000 LICENCES"]),
            total: d3.sum(v, d =>
                d["FINES PER 10000 LICENCES"] +
                d["CHARGES PER 10000 LICENCES"] +
                d["ARRESTS PER 10000 LICENCES"]
            )
        }),
        d => d.JURISDICTION_FULL
    ).map(([state, values]) => ({ state, ...values }));


    // --- X-scale: States (sorted by fixedStateOrder) ---
    const x = d3.scaleBand()
        .domain(fixedStateOrder.filter(s => summary.some(d => d.state === s)))
        .range([0, innerWidth])
        .padding(0.2);

    // --- Y-scale: Total penalties per 10k licences ---
    const y = d3.scaleLinear()
        .domain([0, d3.max(summary, d => d.total)])
        .nice()
        .range([innerHeight, 0]);

    // Store scales inside the SVG for later updates
    svg.node().__xScale__ = x;
    svg.node().__yScale__ = y;
    svg.node().__margin__ = margin;
    svg.node().__innerWidth__ = innerWidth;
    svg.node().__innerHeight__ = innerHeight;

    // -----------------------------
    // AXES RENDERING
    // -----------------------------

    // X-axis with state abbreviations
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x)
            .tickFormat(d => stateAbbrevMap[d] || d)
        );

    // Y-axis
    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // X-axis label
    g.append("text")
        .attr("class", "x-label")
        .attr("text-anchor", "middle")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("fill", "#333")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("State");

    // Y-axis label
    g.append("text")
        .attr("class", "y-label")
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90)`)                 
        .attr("x", -innerHeight / 2)                     
        .attr("y", -margin.left + 20)                     
        .attr("fill", "#333")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Count per 10,000 driver licences");

    // -----------------------------
    // DRAW BARS
    // -----------------------------
    g.selectAll("rect")
        .data(summary)
        .join("rect")
        .attr("x", d => x(d.state))
        .attr("y", d => y(d.total))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d.total))
        .attr("fill", "steelblue");

    // Initialize tooltip functionality
    initializeTooltip(g, "bar");
};

// -----------------------------
// UPDATE FUNCTION for Bar1
// Called when filters (year, type, detection, age) change
// -----------------------------
function updateBar1(filteredData, filters) {

    // Select existing group (where bars and axes exist)
    const g = d3.select("#bar-1 svg .bar-group");
    if (g.empty()) return; // if chart not drawn yet: exit

    const svg = d3.select("#bar-1 svg").node();

    // Retrieve saved scales & dimensions
    const x = svg.__xScale__;
    const y = svg.__yScale__;
    const margin = svg.__margin__;
    const innerHeight = svg.__innerHeight__;

    // --- Re-aggregate data based on new filters ---
    const summary = d3.rollups(
        filteredData,
        v => ({
            fines: d3.sum(v, d => d["FINES PER 10000 LICENCES"]),
            charges: d3.sum(v, d => d["CHARGES PER 10000 LICENCES"]),
            arrests: d3.sum(v, d => d["ARRESTS PER 10000 LICENCES"]),
            total: d3.sum(v, d =>
                d["FINES PER 10000 LICENCES"] +
                d["CHARGES PER 10000 LICENCES"] +
                d["ARRESTS PER 10000 LICENCES"]
            )
        }),
        d => d.JURISDICTION_FULL
    ).map(([state, values]) => ({ state, ...values }));

    // --- Recompute Y-scale based on new values ---
    const newY = d3.scaleLinear()
        .domain([0, d3.max(summary, d => d.total)])
        .nice()
        .range([innerHeight, 0]);

    // Smooth axis transition
    g.select(".y-axis")
        .transition()
        .duration(700)
        .call(d3.axisLeft(newY));

    // -----------------------------
    // UPDATE BARS (enter / update / exit)
    // -----------------------------
    const bars = g.selectAll("rect")
        .data(summary, d => d.state);

    bars.join(

        // ENTER SELECTION
        enter => enter.append("rect")
            .attr("x", d => x(d.state))
            .attr("width", x.bandwidth())
            .attr("y", innerHeight)
            .attr("height", 0)
            .attr("fill", "steelblue")
            .transition().duration(700)
            .attr("y", d => newY(d.total))
            .attr("height", d => innerHeight - newY(d.total)),

        // UPDATE SELECTION
        update => update
            .transition().duration(700)
            .attr("y", d => newY(d.total))
            .attr("height", d => innerHeight - newY(d.total)),

        // EXIT SELECTION
        exit => exit
            .transition().duration(500)
            .attr("height", 0)
            .attr("y", innerHeight)
            .remove()
    );

    // Save the updated Y-scale for future updates
    svg.__yScale__ = newY;

    // Rebind tooltip after update
    initializeTooltip(g, "bar");
}
