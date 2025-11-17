// ======================================================
// STATE NAME MAPPING (ABBREVIATION → FULL NAME)
// Ensures consistency across all charts and filters.
// ======================================================
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


// ======================================================
// LOAD ALL DATASETS AT ONCE
// Using Promise.all ensures all 3 files are fully loaded
// before running any visualisation.
// Files loaded:
//   1. GeoJSON (Australia state boundaries)
//   2. Penalties_per_10,000_licences_processed.csv
//   3. Penalties_process.csv
// ======================================================
Promise.all([
  d3.json("data/australian-states.min.geojson"),
  d3.csv("data/Penalties_per_10,000_licences_processed.csv"),
  d3.csv("data/Penalties_process.csv")
])
.then(([geoData, penaltiesLicences, penalties]) => {

  console.log("All data loaded successfully!");

  // ======================================================
  // DATA CLEANING — penaltiesLicences (normalised rates)
  // Convert text → numbers and trim spaces in text fields.
  // ======================================================
  penaltiesLicences.forEach(d => {
    // Convert numeric columns
    d.LICENCES = +d.LICENCES || 0;
    d.YEAR = +d.YEAR || 0;
    d["Sum(FINES)"] = +d["Sum(FINES)"] || 0;
    d["Sum(ARRESTS)"] = +d["Sum(ARRESTS)"] || 0;
    d["Sum(CHARGES)"] = +d["Sum(CHARGES)"] || 0;

    // Convert all rate columns to numbers
    d["FINES PER 10000 LICENCES"] = +d["FINES PER 10000 LICENCES"] || 0;
    d["ARRESTS PER 10000 LICENCES"] = +d["ARRESTS PER 10000 LICENCES"] || 0;
    d["CHARGES PER 10000 LICENCES"] = +d["CHARGES PER 10000 LICENCES"] || 0;

    // Trim text fields to avoid filter mismatches
    d.AGE_GROUP = d.AGE_GROUP?.trim();
    d.DETECTION_METHOD = d.DETECTION_METHOD?.trim();
    d.METRIC = d.METRIC?.trim();
    d.JURISDICTION = d.JURISDICTION?.trim();
  });


  // ======================================================
  // DATA CLEANING — penalties (raw totals)
  // Ensures numeric + consistent categorical values.
  // ======================================================
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


  // ======================================================
  // ADD FULL JURISDICTION NAME — penaltiesLicences
  // Converts “NSW” → “New South Wales”
  // ======================================================
  penaltiesLicences.forEach(d => {
    d.JURISDICTION_FULL = stateNameMap[d.JURISDICTION] || d.JURISDICTION;
  });


  // ======================================================
  // ADD FULL JURISDICTION NAME — penalties
  // Keeps consistency across *all* charts
  // ======================================================
  penalties.forEach(d => {
    d.JURISDICTION_FULL = stateNameMap[d.JURISDICTION] || d.JURISDICTION;
  });


  // ======================================================
  // DEBUG LOGS
  // Helps validate data integrity during development
  // ======================================================
  console.log("GeoJSON features:", geoData.features.length);
  console.log("Licences sample:", penaltiesLicences.slice(0, 3));
  console.log("Penalties sample:", penalties.slice(0, 3));


  // ======================================================
  // INITIALISE FILTERS + LINK TO UPDATE FUNCTIONS
  // Each page has its own filter group:
  //
  // Page 1 → Map + Line-1 + Bar
  // Page 2 → Line-2 + Histogram
  // Page 3 → Fairness Comparison (Bar-1 + Bar-2)
  // ======================================================

  // -------------------- PAGE 1 FILTERS --------------------
  createFilters(penalties, (filteredData, filters) => {
    updateMap(geoData, filteredData, filters);
    updateLine1(filteredData, filters);
  });

  // -------------------- PAGE 2 FILTERS --------------------
  createFilters2(penalties, (filteredPenalties, filters) => {
    updateLine2(filteredPenalties);
    updateHistogram(filteredPenalties);
  });

  // -------------------- PAGE 3 FILTERS --------------------
  createFilters3(penalties, penaltiesLicences, (filteredLicences, filteredPenalties, filters) => {
    updateBar1(filteredLicences, filters);
    updateBar2(filteredPenalties, filters);
  });


  // ======================================================
  // INITIAL DRAW CALLS (only run if element exists)
  // Allows each HTML page to load only its own visuals.
  // ======================================================

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
  if (document.querySelector("#map")) {
    drawMap(geoData, penalties);
  }

})
.catch(error => {
  console.error("Error loading data:", error);
});
