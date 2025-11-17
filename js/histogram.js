const drawHistogram = (penalties) => {

  // ----------------------------------------------
  // NOTE: Layout settings (chart size + margins)
  // Defines drawing area for the histogram figure.
  // ----------------------------------------------
  const margin = { top: 40, right: 30, bottom: 50, left: 60 };
  const width = 900 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // ----------------------------------------------
  // NOTE: Create the main SVG container
  // <svg> scales responsively via viewBox
  // Inner <g> is shifted by margins.
  // ----------------------------------------------
  const g = d3.select("#histogram")
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .style("max-width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("class", "hist-group")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ----------------------------------------------
  // NOTE: Compute total penalties per row
  // Uses FINES + CHARGES + ARRESTS
  // Convert to number using + and default to 0.
  // ----------------------------------------------
  const totals = penalties.map(d => (+d.FINES || 0) + (+d.CHARGES || 0) + (+d.ARRESTS || 0));
  totals.sort(d3.ascending); // keep values sorted for binning consistency

  // ----------------------------------------------
  // NOTE: Create histogram generator
  // d3.bin() splits numeric values into equal-sized bins
  // 10 bins chosen for readability
  // ----------------------------------------------
  const binGen = d3.bin().domain(d3.extent(totals)).thresholds(10);
  const bins = binGen(totals);

  // ----------------------------------------------
  // NOTE: Create X and Y scales
  // X: represents penalty ranges (bin intervals)
  // Y: counts how many rows fall in each bin
  // ----------------------------------------------
  const Xscale = d3.scaleLinear()
    .domain([bins[0].x0, bins[bins.length - 1].x1]) // full bin span
    .range([0, width])
    .nice();

  const Yscale = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)]) // max bin frequency
    .range([height, 0])
    .nice();

  // ----------------------------------------------
  // NOTE: Draw axes
  // Bottom = penalty range
  // Left = count of rows per range
  // ----------------------------------------------
  g.append("g")
    .attr("class", "x-axis-hist")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(Xscale));

  g.append("g")
    .attr("class", "y-axis-hist")
    .call(d3.axisLeft(Yscale));

  // ----------------------------------------------
  // NOTE: Draw histogram rectangles (one rect per bin)
  // width = bin width
  // height = count of items in bin
  // ----------------------------------------------
  g.selectAll("rect")
    .data(bins)
    .join("rect")
    .attr("class", "hist-rect")
    .attr("x", d => Xscale(d.x0))
    .attr("y", d => Yscale(d.length))
    .attr("width", d => Math.max(0, Xscale(d.x1) - Xscale(d.x0) - 1)) // small gap between bars
    .attr("height", d => height - Yscale(d.length))
    .attr("fill", "#4682B4")
    .attr("stroke", "black");

  // ----------------------------------------------
  // NOTE: Save scales + dimensions onto the SVG element
  // Allows updateHistogram() to reuse them later
  // ----------------------------------------------
  const node = d3.select("#histogram svg").node();
  node.__xScale__ = Xscale;
  node.__yScale__ = Yscale;
  node.__margin__ = margin;
  node.__innerWidth__ = width;
  node.__innerHeight__ = height;

  // ----------------------------------------------
  // NOTE: Attach tooltip handler for interactive hover
  // ----------------------------------------------
  initializeHistogramTooltip(g, Xscale, bins, width, height);
};

function updateHistogram(filteredPenalties) {

  // ----------------------------------------------
  // NOTE: Retrieve existing SVG + previously stored scales
  // Exit early if chart not drawn yet
  // ----------------------------------------------
  const svg = d3.select("#histogram svg").node();
  if (!svg) return;

  const g = d3.select("#histogram svg .hist-group");
  const innerHeight = svg.__innerHeight__;
  const innerWidth = svg.__innerWidth__;

  // ----------------------------------------------
  // NOTE: Recompute totals using filtered dataset
  // ----------------------------------------------
  const totals = filteredPenalties
    .map(d => (+d.FINES || 0) + (+d.CHARGES || 0) + (+d.ARRESTS || 0))
    .sort(d3.ascending);

  // ----------------------------------------------
  // NOTE: Ensure histogram has a valid numeric range
  // Prevents errors when all values are identical
  // ----------------------------------------------
  let extent = d3.extent(totals);
  if (extent[0] === extent[1]) extent = [extent[0] - 1, extent[0] + 1];

  // ----------------------------------------------
  // NOTE: Updated X-scale after filtering
  // ----------------------------------------------
  const Xscale = d3.scaleLinear()
    .domain(extent)
    .range([0, innerWidth])
    .nice();
  svg.__xScale__ = Xscale;

  // Smooth X-axis transition
  g.select(".x-axis-hist")
    .transition().duration(600)
    .call(d3.axisBottom(Xscale));

  // ----------------------------------------------
  // NOTE: Recalculate histogram bins for new data
  // ----------------------------------------------
  const binGen = d3.bin().domain(extent).thresholds(10);
  const bins = binGen(totals);

  // ----------------------------------------------
  // NOTE: Updated Y-scale based on new bin frequencies
  // ----------------------------------------------
  const newY = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .range([innerHeight, 0])
    .nice();

  // Smooth Y-axis transition
  g.select(".y-axis-hist")
    .transition().duration(600)
    .call(d3.axisLeft(newY));

  // ----------------------------------------------
  // NOTE: Redraw histogram bars (enter / update / exit)
  // ----------------------------------------------
  const rects = g.selectAll(".hist-rect").data(bins);

  rects.join(

    // ENTER — new bars
    enter => enter.append("rect")
      .attr("class", "hist-rect")
      .attr("x", d => Xscale(d.x0))
      .attr("y", innerHeight)
      .attr("width", d => Math.max(0, Xscale(d.x1) - Xscale(d.x0) - 1))
      .attr("height", 0)
      .attr("fill", "#4682B4")
      .attr("stroke", "black")
      .transition().duration(600)
      .attr("y", d => newY(d.length))
      .attr("height", d => innerHeight - newY(d.length)),

    // UPDATE — existing bars transition smoothly
    update => update.transition().duration(600)
      .attr("x", d => Xscale(d.x0))
      .attr("y", d => newY(d.length))
      .attr("height", d => innerHeight - newY(d.length))
      .attr("width", d => Math.max(0, Xscale(d.x1) - Xscale(d.x0) - 1)),

    // EXIT — remove bars not needed
    exit => exit.transition().duration(500)
      .attr("height", 0)
      .attr("y", innerHeight)
      .remove()
  );

  // ----------------------------------------------
  // NOTE: Rebind tooltip because bins, positions
  // and scales changed after the update.
  // ----------------------------------------------
  initializeHistogramTooltip(g, Xscale, bins, innerWidth, innerHeight);
}
