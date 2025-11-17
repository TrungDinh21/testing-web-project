// -----------------------------
// BAR CHART 2 (Total Penalties per State)
// Displays absolute penalties (Fines + Charges + Arrests) per state.
// Used in the "Fairness Comparison" page.
// -----------------------------
const drawBar2 = (data) => {

    // Base dimensions and margins for the chart
    const barWidth = 600;
    const barHeight = 400;
    const margin = { top: 40, bottom: 50, left: 100, right: 40 };

    // Inner drawing area (inside margins)
    const innerWidth = barWidth - margin.left - margin.right;
    const innerHeight = barHeight - margin.top - margin.bottom;

    // -----------------------------
    // CREATE THE SVG CONTAINER
    // -----------------------------
    const svg = d3.select("#bar-2")
        .append("svg")
        .attr("viewBox", `0 0 ${barWidth} ${barHeight}`)  // Responsive SVG
        .style("max-width", "100%")
        .style("height", "auto")
        .style("display", "block");

    // Group wrapper containing bars + axes
    const g = svg.append("g")
        .attr("class", "bar-group")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // -----------------------------
    // AGGREGATE RAW PENALTY DATA BY STATE
    // Summing Fines + Charges + Arrests
    // -----------------------------
    const summary = d3.rollups(
        data,
        v => ({
            fines: d3.sum(v, d => d.FINES),
            charges: d3.sum(v, d => d.CHARGES),
            arrests: d3.sum(v, d => d.ARRESTS),
            total: d3.sum(v, d => d.FINES + d.CHARGES + d.ARRESTS)
        }),
        d => d.JURISDICTION_FULL
    ).map(([state, values]) => ({ state, ...values }));

    // -----------------------------
    // SCALES
    // X-axis = state names
    // Y-axis = total penalty counts
    // -----------------------------
    const x = d3.scaleBand()
        .domain(fixedStateOrder.filter(s => summary.some(d => d.state === s)))  // match global state ordering
        .range([0, innerWidth])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(summary, d => d.total)]).nice()
        .range([innerHeight, 0]);

    // Save scales + dimensions to SVG for reuse in updates
    svg.node().__xScale__ = x;
    svg.node().__yScale__ = y;
    svg.node().__margin__ = margin;
    svg.node().__innerWidth__ = innerWidth;
    svg.node().__innerHeight__ = innerHeight;

    // -----------------------------
    // AXES
    // -----------------------------
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
            d3.axisBottom(x)
            .tickFormat(d => stateAbbrevMap[d] || d)  // Use abbreviations (NSW, VIC…) for shorter labels
        );

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
        .text("Penalties Count");

    // -----------------------------
    // DRAW BARS (absolute penalty totals)
    // -----------------------------
    g.selectAll("rect")
        .data(summary)
        .join("rect")
        .attr("x", d => x(d.state))
        .attr("y", d => y(d.total))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d.total))
        .attr("fill", "orange");

    // Attach tooltip logic
    initializeTooltip(g, "bar");
};

// -----------------------------
// UPDATE FUNCTION FOR BAR CHART 2
// Called whenever filters change (year, penalty type, detection method, age group…)
// -----------------------------
function updateBar2(filteredData, filters) {

    // Select the chart group inside SVG
    const g = d3.select("#bar-2 svg .bar-group");
    if (g.empty()) return;   // If chart not drawn yet → do nothing

    // Get the parent SVG to retrieve stored scales
    const svg = d3.select("#bar-2 svg").node();
    const x = svg.__xScale__;
    const margin = svg.__margin__;
    const innerHeight = svg.__innerHeight__;

    // -----------------------------
    // RE-AGGREGATE DATA BASED ON ACTIVE FILTERS
    // -----------------------------
    const summary = d3.rollups(
        filteredData,
        v => ({
            fines: d3.sum(v, d => d.FINES),
            charges: d3.sum(v, d => d.CHARGES),
            arrests: d3.sum(v, d => d.ARRESTS),
            total: d3.sum(v, d => d.FINES + d.CHARGES + d.ARRESTS)
        }),
        d => d.JURISDICTION_FULL
    ).map(([state, values]) => ({ state, ...values }));

    // -----------------------------
    // NEW Y SCALE BASED ON FILTER RESULTS
    // -----------------------------
    const newY = d3.scaleLinear()
        .domain([0, d3.max(summary, d => d.total)]).nice()
        .range([innerHeight, 0]);

    // Smoothly animate Y-axis update
    g.select(".y-axis")
        .transition()
        .duration(700)
        .call(d3.axisLeft(newY));

    // -----------------------------
    // ENTER / UPDATE / EXIT for Bars
    // -----------------------------
    const bars = g.selectAll("rect")
        .data(summary, d => d.state);

    bars.join(

        // ENTER SELECTION (new bars)
        enter => enter.append("rect")
            .attr("x", d => x(d.state))
            .attr("width", x.bandwidth())
            .attr("y", innerHeight)
            .attr("height", 0)
            .attr("fill", "orange")
            .transition().duration(700)
            .attr("y", d => newY(d.total))
            .attr("height", d => innerHeight - newY(d.total)),

        // UPDATE SELECTION (existing bars)
        update => update
            .transition().duration(700)
            .attr("y", d => newY(d.total))
            .attr("height", d => innerHeight - newY(d.total)),

        // EXIT SELECTION (bars removed)
        exit => exit
            .transition().duration(500)
            .attr("height", 0)
            .attr("y", innerHeight)
            .remove()
    );

    // Store updated Y-scale
    svg.__yScale__ = newY;

    // Rebind tooltip after redraw
    initializeTooltip(g, "bar");
}
