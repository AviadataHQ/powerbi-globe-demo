// Shapefiles.js (clean, stable, GitHub Pages ready)
// Requires: worldwind.min.js loaded BEFORE this file in index.html
// Requires: ./images folder present next to index.html

(function () {
  "use strict";

  // ----------------------------
  // Safety check
  // ----------------------------
  if (!window.WorldWind) {
    console.error(
      "WorldWind is not loaded. Make sure worldwind.min.js is loaded BEFORE Shapefiles.js"
    );
    return;
  }

  const WorldWind = window.WorldWind;

  // IMPORTANT: tells WorldWind where to find ./images
  // Repo should be:
  // /index.html
  // /worldwind.min.js
  // /Shapefiles.js
  // /images/...
  WorldWind.configuration.baseUrl = "./";

  // Reduce log noise
  WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

  // ----------------------------
  // Create the WorldWindow
  // ----------------------------
  const wwd = new WorldWind.WorldWindow("canvasOne");

  // ----------------------------
  // Base layers + UI layers
  // (No Bing layers -> no API key warnings/errors)
  // ----------------------------
  const layers = [
    { name: "Blue Marble (BMNG)", layer: new WorldWind.BMNGLayer(), enabled: true },
    { name: "BMNG + Landsat", layer: new WorldWind.BMNGLandsatLayer(), enabled: false },

    { name: "Atmosphere", layer: new WorldWind.AtmosphereLayer(), enabled: false },

    { name: "Compass", layer: new WorldWind.CompassLayer(), enabled: false },
    { name: "Coordinates", layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: false },
    { name: "View Controls", layer: new WorldWind.ViewControlsLayer(wwd), enabled: false }
  ];

  layers.forEach(obj => {
    obj.layer.enabled = obj.enabled;
    wwd.addLayer(obj.layer);
  });

  // ----------------------------
  // Country polygon styling callback
  // ----------------------------
  const shapeConfigurationCallback = function (attributes, record) {
    const configuration = {};

    // Name used by WorldWind for renderable.displayName
    configuration.name =
      attributes.values.ADMIN ||
      attributes.values.admin ||
      attributes.values.NAME ||
      attributes.values.Name ||
      attributes.values.name ||
      attributes.values.SOVEREIGNT ||
      attributes.values.SOVEREIGN ||
      null;

    // Countries are polygons
    if (record.isPolygonType()) {
      configuration.attributes = new WorldWind.ShapeAttributes(null);

      // Pastel fill
      configuration.attributes.interiorColor = new WorldWind.Color(
        0.375 + 0.5 * Math.random(),
        0.375 + 0.5 * Math.random(),
        0.375 + 0.5 * Math.random(),
        0.80
      );

      // Dark outline
      configuration.attributes.outlineColor = new WorldWind.Color(
        0.50 * configuration.attributes.interiorColor.red,
        0.50 * configuration.attributes.interiorColor.green,
        0.50 * configuration.attributes.interiorColor.blue,
        1.0
      );

      configuration.attributes.outlineWidth = 1.0;
    }

    return configuration;
  };

  // ----------------------------
  // Load shapefiles (COUNTRIES ONLY)
  // ----------------------------
  const shapefileLibrary =
    "https://worldwind.arc.nasa.gov/web/examples/data/shapefiles/naturalearth";

  const countriesLayer = new WorldWind.RenderableLayer("Countries");

  const countriesShapefile = new WorldWind.Shapefile(
    shapefileLibrary + "/ne_110m_admin_0_countries/ne_110m_admin_0_countries.shp"
  );

  countriesShapefile.load(null, shapeConfigurationCallback, countriesLayer);
  countriesLayer.enabled = true;
  wwd.addLayer(countriesLayer);

  // ----------------------------
  // Optional extra example layer (kept OFF by default)
  // ----------------------------
  const fortStoryUrl =
    "https://worldwind.arc.nasa.gov/web/examples/data/shapefiles/misc/FortStory/Trident-Spectre-Indigo-i.shp";

  const fortStoryLayer = new WorldWind.RenderableLayer("Fort Story");
  const fortStoryShapefile = new WorldWind.Shapefile(fortStoryUrl);
  fortStoryShapefile.load(null, null, fortStoryLayer);
  fortStoryLayer.enabled = false;
  wwd.addLayer(fortStoryLayer);

  // ----------------------------
  // UI: Layers list (checkboxes)
  // (Cities removed completely)
  // ----------------------------
  const layerListDiv = document.getElementById("layerList");

  const allLayerEntries = [
    ...layers.map(x => ({ name: x.name, layer: x.layer })),
    { name: "Countries", layer: countriesLayer },
    { name: "Fort Story", layer: fortStoryLayer }
  ];

  function rebuildLayerList() {
    if (!layerListDiv) return;

    layerListDiv.innerHTML = "";

    allLayerEntries.forEach(entry => {
      const item = document.createElement("label");
      item.className = "list-group-item";
      item.style.cursor = "pointer";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = entry.layer.enabled;
      checkbox.style.marginRight = "10px";

      checkbox.addEventListener("change", () => {
        entry.layer.enabled = checkbox.checked;
        wwd.redraw();
      });

      item.appendChild(checkbox);
      item.appendChild(document.createTextNode(entry.name));
      layerListDiv.appendChild(item);
    });
  }

  rebuildLayerList();

  // ----------------------------
  // UI: Projection dropdown
  // ----------------------------
  const projectionDropdown = document.getElementById("projectionDropdown");

  const projections = [
    { label: "3D Globe", projection: new WorldWind.ProjectionWgs84() },
    { label: "Equirectangular", projection: new WorldWind.ProjectionEquirectangular() },
    { label: "Mercator", projection: new WorldWind.ProjectionMercator() },
    { label: "Polar Equidistant (North)", projection: new WorldWind.ProjectionPolarEquidistant("North") },
    { label: "Polar Equidistant (South)", projection: new WorldWind.ProjectionPolarEquidistant("South") }
  ];

  function setProjection(proj) {
    wwd.globe.projection = proj;
    wwd.redraw();
  }

  function buildProjectionDropdown() {
    if (!projectionDropdown) return;

    projectionDropdown.innerHTML = `
      <button class="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown">
        Projection <span class="caret"></span>
      </button>
      <ul class="dropdown-menu" role="menu" id="projectionMenu"></ul>
    `;

    const menu = document.getElementById("projectionMenu");

    projections.forEach(p => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = p.label;

      a.addEventListener("click", (e) => {
        e.preventDefault();
        setProjection(p.projection);
      });

      li.appendChild(a);
      menu.appendChild(li);
    });
  }

  buildProjectionDropdown();

  // ----------------------------
  // UI: Destination search (GoTo)
  // ----------------------------
  const searchButton = document.getElementById("searchButton");
  const searchText = document.getElementById("searchText");

  const geocoder = new WorldWind.NominatimGeocoder();

  function gotoLocation(query) {
    if (!query) return;

    geocoder.lookup(query, (results) => {
      if (results && results.length > 0) {
        const r = results[0];
        wwd.goTo(new WorldWind.Location(parseFloat(r.lat), parseFloat(r.lon)));
      } else {
        alert("Location not found: " + query);
      }
    });
  }

  if (searchButton && searchText) {
    searchButton.addEventListener("click", () => gotoLocation(searchText.value.trim()));

    searchText.addEventListener("keypress", (e) => {
      if (e.key === "Enter") gotoLocation(searchText.value.trim());
    });
  }

  // =======================================================
  // CLICK PICKING: show country name + highlight selection
  //  ✅ stable highlight
  //  ✅ ocean click clears
  //  ✅ ignores non-country objects
  // =======================================================

  // Prevent duplicate installation
  if (!window.__COUNTRY_CLICK_INSTALLED__) {
    window.__COUNTRY_CLICK_INSTALLED__ = true;

    // HUD
    const infoDiv = document.createElement("div");
    infoDiv.id = "countryInfoHUD";
    infoDiv.style.position = "fixed";
    infoDiv.style.right = "18px";
    infoDiv.style.bottom = "18px";
    infoDiv.style.padding = "10px 14px";
    infoDiv.style.background = "rgba(0,0,0,0.65)";
    infoDiv.style.color = "white";
    infoDiv.style.fontFamily = "Arial, sans-serif";
    infoDiv.style.fontSize = "14px";
    infoDiv.style.borderRadius = "10px";
    infoDiv.style.boxShadow = "0 8px 18px rgba(0,0,0,0.35)";
    infoDiv.style.zIndex = "9999";
    infoDiv.innerHTML = "Click a country…";
    document.body.appendChild(infoDiv);

    // Track selection safely
    let lastPickedShape = null;
    let lastPickedOriginalAttributes = null;

    function clearSelection() {
      if (lastPickedShape && lastPickedOriginalAttributes) {
        lastPickedShape.attributes = lastPickedOriginalAttributes;
      }
      lastPickedShape = null;
      lastPickedOriginalAttributes = null;
      infoDiv.innerHTML = "Click a country…";
      wwd.redraw();
    }

    function getCountryName(shape) {
      if (!shape) return null;

      // displayName is set by configuration.name
      if (shape.displayName) return shape.displayName;

      const vals =
        shape.attributes?.values ||
        shape._attributes?.values ||
        shape.userProperties ||
        null;

      if (!vals) return null;

      return vals.ADMIN || vals.NAME || vals.SOVEREIGNT || vals.SOVEREIGN || null;
    }

    function highlightCountryShape(shape) {
      if (!shape || !shape.attributes) return;

      // Restore previous selection (if any)
      if (lastPickedShape && lastPickedOriginalAttributes) {
        lastPickedShape.attributes = lastPickedOriginalAttributes;
      }

      // Save original attributes (clone so we can restore properly)
      lastPickedShape = shape;
      lastPickedOriginalAttributes = new WorldWind.ShapeAttributes(shape.attributes);

      // Highlight attributes
      const highlightAttrs = new WorldWind.ShapeAttributes(shape.attributes);
      highlightAttrs.outlineWidth = 3.0;
      highlightAttrs.outlineColor = new WorldWind.Color(1, 1, 1, 1);

      // Make fill slightly stronger (if interiorColor exists)
      if (highlightAttrs.interiorColor) {
        highlightAttrs.interiorColor = new WorldWind.Color(
          highlightAttrs.interiorColor.red,
          highlightAttrs.interiorColor.green,
          highlightAttrs.interiorColor.blue,
          0.95
        );
      }

      shape.attributes = highlightAttrs;
      wwd.redraw();
    }

    function handleGlobeClick(event) {
      const x = event.clientX;
      const y = event.clientY;

      const pickList = wwd.pick(wwd.canvasCoordinates(x, y));

      // Ocean or nothing picked -> clear
      if (!pickList.objects || pickList.objects.length === 0) {
        clearSelection();
        return;
      }

      // Find the first polygon country shape
      for (let i = 0; i < pickList.objects.length; i++) {
        const picked = pickList.objects[i];
        const obj = picked.userObject;

        // Only allow polygon shapes (countries)
        if (!obj || !obj.attributes) continue;

        // Reject placemarks / non-polygons by checking if it has interiorColor
        // (countries do; most other objects won't)
        if (!obj.attributes.interiorColor) continue;

        const name = getCountryName(obj);
        if (!name) continue;

        infoDiv.innerHTML = `<b>Selected:</b> ${name}`;
        highlightCountryShape(obj);
        return;
      }

      // Clicked something but not a country -> clear
      clearSelection();
    }

    wwd.addEventListener("click", handleGlobeClick);
  }

  // Initial draw
  wwd.redraw();
})();
