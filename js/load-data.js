  // ---------------------------
  // Convert state abbreviations to full names
  // ---------------------------
  const stateNameMap = {
    "NSW": "New South Wales",
    "VIC": "Victoria",
    "QLD": "Queensland",
    "WA": "Western Australia",
    "SA": "South Australia",
    "TAS": "Tasmania",
    "NT": "Northern Territory",
    "ACT": "Australian Capital Territory"
  };

// Load 3 datasets: GeoJSON + 2 CSVs
Promise.all([
  d3.json("data/australian-states.min.geojson"),
  d3.csv("data/Penalties_per_10,000_licences_processed.csv"),
  d3.csv("data/Penalties_process.csv")
])
.then(([geoData, penaltiesLicences, penalties]) => {
  console.log("All data loaded successfully!");

  penaltiesLicences.forEach(d => {
    d.LICENCES = +d.LICENCES || 0;
    d.YEAR = +d.YEAR || 0;
    d["Sum(FINES)"] = +d["Sum(FINES)"] || 0;
    d["Sum(ARRESTS)"] = +d["Sum(ARRESTS)"] || 0;
    d["Sum(CHARGES)"] = +d["Sum(CHARGES)"] || 0;
    d["FINES PER 10000 LICENCES"] = +d["FINES PER 10000 LICENCES"] || 0;
    d["ARRESTS PER 10000 LICENCES"] = +d["ARRESTS PER 10000 LICENCES"] || 0;
    d["CHARGES PER 10000 LICENCES"] = +d["CHARGES PER 10000 LICENCES"] || 0;
    d.METRIC = d.METRIC?.trim();
    d.JURISDICTION = d.JURISDICTION?.trim();
  });

  penalties.forEach(d => {
    d.YEAR = +d.YEAR || 0;
    d.FINES = +d.FINES || 0;
    d.CHARGES = +d.CHARGES || 0;
    d.ARRESTS = +d.ARRESTS || 0;
    d.METRIC = d.METRIC?.trim();
    d.DETECTION_METHOD = d.DETECTION_METHOD?.trim();
    d.AGE_GROUP = d.AGE_GROUP?.trim();
    d.JURISDICTION = d.JURISDICTION?.trim();
  });


  // Add full state names to datasets
  penaltiesLicences.forEach(d => {
    if (stateNameMap[d.JURISDICTION]) {
      d.JURISDICTION_FULL = stateNameMap[d.JURISDICTION];
    } else {
      d.JURISDICTION_FULL = d.JURISDICTION;
    }
  });

  penalties.forEach(d => {
    if (stateNameMap[d.JURISDICTION]) {
      d.JURISDICTION_FULL = stateNameMap[d.JURISDICTION];
    } else {
      d.JURISDICTION_FULL = d.JURISDICTION;
    }
  });

  // ---------------------------
  // Log some data samples for verification
  // ---------------------------
  console.log("GeoJSON features:", geoData.features.length);
  console.log("Licences sample:", penaltiesLicences.slice(0, 3));
  console.log("Penalties sample:", penalties.slice(0, 3));

  // ---------------------------
  // Here is to call functions to draw visualizations and set up interactions
  // ---------------------------

    drawMap(geoData, penalties);
    createFilters(penalties, (filteredData, filters) => {
      updateMap(geoData, filteredData, filters);
      updateLine1(filteredData, filters);
      updateBar1(filteredData, filters);
      updateBar2(filteredData, filters);

});
  

    if (document.querySelector("#line-1")) {
        drawLine1(penalties);
      }
    if (document.querySelector("#line-2")) {
        drawLine2(penalties);
      }
    if (document.querySelector("#histogram")) {
        drawHistogram(penalties);
      }
      if (document.querySelector("#bar-1")) {
        drawBar1(penaltiesLicences);
      }
      if (document.querySelector("#bar-2")) {
        drawBar2(penalties);
      }


})
.catch(error => {
  console.error("Error loading data:", error);
});
