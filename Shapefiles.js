// Shapefiles.js (standalone for GitHub Pages)
// Requires: worldwind.min.js loaded BEFORE this file in index.html
// Also requires: images/ folder present at same level as index.html
// because WorldWind loads ./images/white-dot.png etc.

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

  // IMPORTANT: tells WorldWind where to find the ./images folder
  // Your repo should be:
  // /index.html
  // /worldwind.min.js
  // /Shapefiles.js
  // /images/...
  WorldWind.configuration.baseUrl = "./";

  // Tell WorldWind to log only warnings and errors.
  WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

  // ----------------------------
  // Create the WorldWindow
  // ----------------------------
  const wwd = new WorldWind.WorldWindow("canvasOne");

  // ----------------------------
  // Base layers + UI layers
  // (REMOVED Bing layers to avoid API key / "resources" errors)
  // ----------------------------
  const layers = [
    // Imagery layers
    { name: "Blue Marble (BMNG)", layer: new WorldWind.BMNGLayer(), enabled: true },
    { name: "BMNG + Landsat", layer: new WorldWind.BMNGLandsatLayer(), enabled: false },

    // Atmosphere
    { name: "Atmosphere", layer: new WorldWind.AtmosphereLayer(), enabled: false },

    // UI layers
    { name: "Compass", layer: new WorldWind.CompassLayer(), enabled: false },
    { name: "Coordinates", layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: false },
    { name: "View Controls", layer: new WorldWind.ViewControlsLayer(wwd), enabled: false }
  ];

  layers.forEach(obj => {
    obj.layer.enabled = obj.enabled;
    wwd.addLayer(obj.layer);
  });

  // ----------------------------
  // Placemark attributes (for point shapefiles like cities)
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

    // Name used by WorldWind for renderable.displayName
    configuration.name =
      attributes.values.ADMIN ||
      attributes.values.admin ||
      attributes.values.NAME ||
      attributes.values.Name ||
      attributes.values.name ||
      attributes.values.SOVEREIGNT ||
      attributes.values.sovreignt ||
      attributes.values.SOVEREIGN ||
      attributes.values.sovereign ||
      null;

    if (record.isPointType()) {
      configuration.attributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);

      // scale by population if available (cities)
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
  const shapefileLibrary =
    "https://worldwind.arc.nasa.gov/web/examples/data/shapefiles/naturalearth";

  // Countries layer
  const worldLayer = new WorldWind.RenderableLayer("Countries");
  const worldShapefile = new WorldWind.Shapefile(
    shapefileLibrary + "/ne_110m_admin_0_countries/ne_110m_admin_0_countries.shp"
  );
  worldShapefile.load(null, shapeConfigurationCallback, worldLayer);
  worldLayer.enabled = true;
  wwd.addLayer(worldLayer);

  // Cities layer
  const cityLayer = new WorldWind.RenderableLayer("Cities");
  const cityShapefile = new WorldWind.Shapefile(
    shapefileLibrary +
      "/ne_50m_populated_places_simple/ne_50m_populated_places_simple.shp"
  );
  cityShapefile.load(null, shapeConfigurationCallback, cityLayer);
  cityLayer.enabled = false;
  wwd.addLayer(cityLayer);

  // Fort Story example shapefile
  const fortStoryUrl =
    "https://worldwind.arc.nasa.gov/web/examples/data/shapefiles/misc/FortStory/Trident-Spectre-Indigo-i.shp";
  const fortStoryLayer = new WorldWind.RenderableLayer("Fort Story");
  const fortStoryShapefile = new WorldWind.Shapefile(fortStoryUrl);
  fortStoryShapefile.load(null, null, fortStoryLayer);
  fortStoryLayer.enabled = false;
  wwd.addLayer(fortStoryLayer);

  // ----------------------------
  // UI: Layers list (checkboxes)
  // ----------------------------
  const layerListDiv = document.getElementById("layerList");

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

    searchText.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        gotoLocation(searchText.value.trim());
      }
    });
  }

  // =======================================================
  // CLICK PICKING: show country name + highlight selection
  // =======================================================

  // Guard: prevents duplicate installation if pasted twice
  if (!window.__COUNTRY_CLICK_INSTALLED__) {
    window.__COUNTRY_CLICK_INSTALLED__ = true;

    // HUD (bottom-right)
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

    // Track selection
    let lastPickedShape = null;
    let lastPickedOriginalAttributes = null;

    function highlightCountryShape(shape) {
      if (!shape || !shape.attributes) return;

      // Restore previous
      if (lastPickedShape && lastPickedOriginalAttributes) {
        lastPickedShape.attributes = lastPickedOriginalAttributes;
      }

      lastPickedShape = shape;
      lastPickedOriginalAttributes = shape.attributes;

      const highlightAttrs = new WorldWind.ShapeAttributes(shape.attributes);

      highlightAttrs.outlineWidth = 3.0;
      highlightAttrs.outlineColor = new WorldWind.Color(1, 1, 1, 1);

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

    function getCountryNameFromPickedObject(pickedUserObject) {
      if (!pickedUserObject) return null;

      if (pickedUserObject.displayName) return pickedUserObject.displayName;

      const attrs =
        pickedUserObject.attributes?.values ||
        pickedUserObject._attributes?.values ||
        pickedUserObject.userProperties ||
        null;

      if (!attrs) return null;

      return (
        attrs.ADMIN ||
        attrs.Admin ||
        attrs.admin ||
        attrs.NAME ||
        attrs.Name ||
        attrs.name ||
        attrs.SOVEREIGNT ||
        attrs.SOVEREIGN ||
        null
      );
    }

    function handleGlobeClick(event) {
      const x = event.clientX;
      const y = event.clientY;

      const pickList = wwd.pick(wwd.canvasCoordinates(x, y));
      if (!pickList.objects || pickList.objects.length === 0) return;

      for (let i = 0; i < pickList.objects.length; i++) {
        const picked = pickList.objects[i];
        const shape = picked.userObject;

        if (!shape || !shape.attributes) continue;

        const countryName = getCountryNameFromPickedObject(shape);

        if (countryName) {
          infoDiv.innerHTML = `<b>Selected:</b> ${countryName}`;
          highlightCountryShape(shape);
          return;
        }
      }
    }

    wwd.addEventListener("click", handleGlobeClick);
  }

  // Force initial redraw
  wwd.redraw();
})();
