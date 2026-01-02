// Shapefiles.js (standalone version for GitHub Pages)
// Requires: worldwind.min.js loaded BEFORE this file in index.html

(function () {
  "use strict";

  // Safety check
  if (!window.WorldWind) {
    console.error("WorldWind is not loaded. Make sure worldwind.min.js is loaded before Shapefiles.js");
    return;
  }

  const WorldWind = window.WorldWind;

  // Tell WorldWind to log only warnings and errors.
  WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

  // ----------------------------
  // Create the WorldWindow
  // ----------------------------
  const wwd = new WorldWind.WorldWindow("canvasOne");

  // ----------------------------
  // Base layers + UI layers
  // ----------------------------
  const layers = [
    // Imagery layers
    { name: "Blue Marble (BMNG)", layer: new WorldWind.BMNGLayer(), enabled: true },
    { name: "Bing Aerial + Labels", layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: false },

    // Atmosphere
    { name: "Atmosphere", layer: new WorldWind.AtmosphereLayer(), enabled: true },

    // UI layers
    { name: "Compass", layer: new WorldWind.CompassLayer(), enabled: true },
    { name: "Coordinates", layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true },
    { name: "View Controls", layer: new WorldWind.ViewControlsLayer(wwd), enabled: true }
  ];

  layers.forEach(obj => {
    obj.layer.enabled = obj.enabled;
    wwd.addLayer(obj.layer);
  });

  // ----------------------------
  // Placemark attributes (for cities)
  // ----------------------------
  const placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
  placemarkAttributes.imageScale = 0.025;
  placemarkAttributes.imageColor = WorldWind.Color.WHITE;
  placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
    WorldWind.OFFSET_FRACTION, 0.5,
    WorldWind.OFFSET_FRACTION, 1.0
  );
  placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/white-dot.png";

  // ----------------------------
  // Shapefile styling callback
  // ----------------------------
  const shapeConfigurationCallback = function (attributes, record) {
    const configuration = {};
    configuration.name = attributes.values.name || attributes.values.Name || attributes.values.NAME;

    if (record.isPointType()) {
      configuration.attributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);

      if (attributes.values.pop_max) {
        const population = attributes.values.pop_max;
        configuration.attributes.imageScale = 0.01 * Math.log(population);
      }
    } else if (record.isPolygonType()) {
      configuration.attributes = new WorldWind.ShapeAttributes(null);

      // Pastel fill
      configuration.attributes.interiorColor = new WorldWind.Color(
        0.375 + 0.5 * Math.random(),
        0.375 + 0.5 * Math.random(),
        0.375 + 0.5 * Math.random(),
        0.8
      );

      // Dark outline
      configuration.attributes.outlineColor = new WorldWind.Color(
        0.5 * configuration.attributes.interiorColor.red,
        0.5 * configuration.attributes.interiorColor.green,
        0.5 * configuration.attributes.interiorColor.blue,
        1.0
      );

      configuration.attributes.outlineWidth = 1.0;
    }

    return configuration;
  };

  // ----------------------------
  // Load Shapefiles (Countries + Cities)
  // ----------------------------
  const shapefileLibrary = "https://worldwind.arc.nasa.gov/web/examples/data/shapefiles/naturalearth";

  // Countries layer
  const worldLayer = new WorldWind.RenderableLayer("Countries");
  const worldShapefile = new WorldWind.Shapefile(
    shapefileLibrary + "/ne_110m_admin_0_countries/ne_110m_admin_0_countries.shp"
  );
  worldShapefile.load(null, shapeConfigurationCallback, worldLayer);
  wwd.addLayer(worldLayer);

  // Cities layer
  const cityLayer = new WorldWind.RenderableLayer("Cities");
  const cityShapefile = new WorldWind.Shapefile(
    shapefileLibrary + "/ne_50m_populated_places_simple/ne_50m_populated_places_simple.shp"
  );
  cityShapefile.load(null, shapeConfigurationCallback, cityLayer);
  wwd.addLayer(cityLayer);

  // (Optional) example extra layer
  const fortStoryUrl =
    "https://worldwind.arc.nasa.gov/web/examples/data/shapefiles/misc/FortStory/Trident-Spectre-Indigo-i.shp";
  const fortStoryLayer = new WorldWind.RenderableLayer("Fort Story");
  const fortStoryShapefile = new WorldWind.Shapefile(fortStoryUrl);
  fortStoryShapefile.load(null, null, fortStoryLayer);
  wwd.addLayer(fortStoryLayer);

  // ----------------------------
  // UI: Layers list (checkboxes)
  // ----------------------------
  const layerListDiv = document.getElementById("layerList");

  // Include also the shapefile layers (Countries / Cities / Fort Story)
  const allLayerEntries = [
    ...layers.map(x => ({ name: x.name, layer: x.layer })),
    { name: "Countries", layer: worldLayer },
    { name: "Cities", layer: cityLayer },
    { name: "Fort Story", layer: fortStoryLayer }
  ];

  function rebuildLayerList() {
    if (!layerListDiv) return;

    layerListDiv.innerHTML = "";

    allLayerEntries.forEach(entry => {
      const id = "layer_" + entry.name.replace(/\s+/g, "_");

      const item = document.createElement("label");
      item.className = "list-group-item";
      item.style.cursor = "pointer";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = entry.layer.enabled;
      checkbox.id = id;
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

    // Bootstrap dropdown HTML
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

  // Use the NASA geocoder endpoint (same as examples)
  // If this endpoint ever fails, we can replace it with OpenStreetMap Nominatim.
  const geocoder = new WorldWind.NominatimGeocoder();

  function gotoLocation(query) {
    if (!query) return;

    geocoder.lookup(query, (geocoderResults) => {
      if (geocoderResults && geocoderResults.length > 0) {
        const result = geocoderResults[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        wwd.goTo(new WorldWind.Location(lat, lon));
      } else {
        alert("Location not found: " + query);
      }
    });
  }

  if (searchButton && searchText) {
    searchButton.addEventListener("click", () => {
      gotoLocation(searchText.value.trim());
    });

    // Enter key
    searchText.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        gotoLocation(searchText.value.trim());
      }
    });
  }

  // Force initial redraw
  wwd.redraw();
})();
