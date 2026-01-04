// Shapefiles.js (merged + standalone)
// This file combines: Shapefiles demo + Configuration settings
// REQUIREMENTS:
// 1) index.html must load worldwind.min.js BEFORE this file
// 2) index.html must contain elements with IDs:
//    canvasOne, projectionDropdown, layerList, searchButton, searchText

(function () {
  "use strict";

  // ----------------------------
  // Safety check
  // ----------------------------
  if (!window.WorldWind) {
    console.error("WorldWind is not loaded. Make sure worldwind.min.js is loaded BEFORE Shapefiles.js");
    return;
  }

  const WorldWind = window.WorldWind;

  // Tell WorldWind to log only warnings and errors.
  WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

  // ----------------------------
  // Configuration.js merge
  WorldWind.configuration.baseUrl = "./";
  // (Must be set BEFORE creating the WorldWindow)
  // ----------------------------
  WorldWind.configuration.gpuCacheSize = 500e6; // 500 MB

  // ----------------------------
  // Create the WorldWindow
  // ----------------------------
  const wwd = new WorldWind.WorldWindow("canvasOne");

  // ----------------------------
  // Base layers + UI layers
  // ----------------------------
  const layers = [
    { name: "Blue Marble (BMNG)", layer: new WorldWind.BMNGLayer(), enabled: true },
    { name: "BMNG + Landsat", layer: new WorldWind.BMNGLandsatLayer(), enabled: false },
    { name: "Bing Aerial + Labels", layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true },
    { name: "Bing Roads", layer: new WorldWind.BingRoadsLayer(null), enabled: false },

    { name: "Atmosphere", layer: new WorldWind.AtmosphereLayer(), enabled: true },

    { name: "Compass", layer: new WorldWind.CompassLayer(), enabled: true },
    { name: "Coordinates", layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true },
    { name: "View Controls", layer: new WorldWind.ViewControlsLayer(wwd), enabled: true }
  ];

  layers.forEach(obj => {
    obj.layer.enabled = obj.enabled;
    wwd.addLayer(obj.layer);
  });

  // ----------------------------
  // Placemark attributes (cities)
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

      // Random pastel fill
      configuration.attributes.interiorColor = new WorldWind.Color(
        0.375 + 0.5 * Math.random(),
        0.375 + 0.5 * Math.random(),
        0.375 + 0.5 * Math.random(),
        1.0
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
  // Load shapefiles (Countries + Cities)
  // ----------------------------
  const shapefileLibrary = "https://worldwind.arc.nasa.gov/web/examples/data/shapefiles/naturalearth";

  // Countries
  const worldLayer = new WorldWind.RenderableLayer("Countries");
  const worldShapefile = new WorldWind.Shapefile(
    shapefileLibrary + "/ne_110m_admin_0_countries/ne_110m_admin_0_countries.shp"
  );
  worldShapefile.load(null, shapeConfigurationCallback, worldLayer);
  wwd.addLayer(worldLayer);

  // =======================================================
// CLICK PICKING: show country name + highlight selection
// =======================================================

// Make a small HUD to show the selected country name
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

// Keep track of the last picked shape so we can un-highlight it
let lastPickedShape = null;
let lastPickedOriginalAttributes = null;

// Helper: highlight a polygon (country)
function highlightCountryShape(shape) {
  if (!shape || !shape.attributes) return;

  // Restore previous selection
  if (lastPickedShape && lastPickedOriginalAttributes) {
    lastPickedShape.attributes = lastPickedOriginalAttributes;
  }

  // Save current attributes (so we can restore later)
  lastPickedShape = shape;
  lastPickedOriginalAttributes = shape.attributes;

  // Create new highlight attributes based on existing
  const highlightAttrs = new WorldWind.ShapeAttributes(shape.attributes);

  // Make border thicker + brighter
  highlightAttrs.outlineWidth = 3.0;
  highlightAttrs.outlineColor = new WorldWind.Color(1, 1, 1, 1); // white outline

  // Slightly increase opacity
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

// Helper: extract a country name from shapefile record attributes
function getCountryNameFromPickedObject(pickedUserObject) {
  // Many of the shapefile renderables have "displayName"
  if (pickedUserObject && pickedUserObject.displayName) {
    return pickedUserObject.displayName;
  }

  // Some store the original shapefile record/attributes
  // We’ll try common NaturalEarth field names:
  const attrs =
    pickedUserObject &&
    (pickedUserObject.attributes?.values ||
      pickedUserObject._attributes?.values ||
      pickedUserObject.userProperties ||
      null);

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

// Click handler: pick objects and detect a country polygon
function handleGlobeClick(event) {
  const x = event.clientX;
  const y = event.clientY;

  const pickList = wwd.pick(wwd.canvasCoordinates(x, y));
  if (!pickList.objects || pickList.objects.length === 0) return;

  // Prefer countries first if multiple objects are picked
  // We’ll search for a picked object that belongs to your "Countries" layer.
  // If we can’t detect the layer name, we still attempt to use the object.
  for (let i = 0; i < pickList.objects.length; i++) {
    const picked = pickList.objects[i];

    // picked.userObject is the actual renderable
    const shape = picked.userObject;

    // Must be a shape with attributes (countries are polygons)
    if (!shape || !shape.attributes) continue;

    // Get a name if possible
    const countryName = getCountryNameFromPickedObject(shape);

    // If we got a name, treat it as the selected country
    if (countryName) {
      infoDiv.innerHTML = `<b>Selected:</b> ${countryName}`;
      highlightCountryShape(shape);
      return;
    }
  }
}

// Attach click listener to the WorldWind canvas
wwd.addEventListener("click", handleGlobeClick);


  // Cities
  const cityLayer = new WorldWind.RenderableLayer("Cities");
  const cityShapefile = new WorldWind.Shapefile(
    shapefileLibrary + "/ne_50m_populated_places_simple/ne_50m_populated_places_simple.shp"
  );
  cityShapefile.load(null, shapeConfigurationCallback, cityLayer);
  wwd.addLayer(cityLayer);

  // Fort Story (Virginia Beach)
  const fortStoryUrl =
    "https://worldwind.arc.nasa.gov/web/examples/data/shapefiles/misc/FortStory/Trident-Spectre-Indigo-i.shp";
  const fortStoryLayer = new WorldWind.RenderableLayer("Fort Story");
  const fortStoryShapefile = new WorldWind.Shapefile(fortStoryUrl);
  fortStoryShapefile.load(null, null, fortStoryLayer);
  wwd.addLayer(fortStoryLayer);

  // ----------------------------
  // UI: Layer checkboxes
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

    geocoder.lookup(query, (results) => {
      if (results && results.length > 0) {
        const r = results[0];
        const lat = parseFloat(r.lat);
        const lon = parseFloat(r.lon);
        wwd.goTo(new WorldWind.Location(lat, lon));
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

  // Initial redraw
  wwd.redraw();

  // =======================================================
// CLICK PICKING: show country name + highlight selection
// =======================================================

// Make a small HUD to show the selected country name
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

// Keep track of the last picked shape so we can un-highlight it
let lastPickedShape = null;
let lastPickedOriginalAttributes = null;

// Helper: highlight a polygon (country)
function highlightCountryShape(shape) {
  if (!shape || !shape.attributes) return;

  // Restore previous selection
  if (lastPickedShape && lastPickedOriginalAttributes) {
    lastPickedShape.attributes = lastPickedOriginalAttributes;
  }

  // Save current attributes (so we can restore later)
  lastPickedShape = shape;
  lastPickedOriginalAttributes = shape.attributes;

  // Create new highlight attributes based on existing
  const highlightAttrs = new WorldWind.ShapeAttributes(shape.attributes);

  // Make border thicker + brighter
  highlightAttrs.outlineWidth = 3.0;
  highlightAttrs.outlineColor = new WorldWind.Color(1, 1, 1, 1); // white outline

  // Slightly increase opacity
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

// Helper: extract a country name from shapefile record attributes
function getCountryNameFromPickedObject(pickedUserObject) {
  // Many of the shapefile renderables have "displayName"
  if (pickedUserObject && pickedUserObject.displayName) {
    return pickedUserObject.displayName;
  }

  // Some store the original shapefile record/attributes
  // We’ll try common NaturalEarth field names:
  const attrs =
    pickedUserObject &&
    (pickedUserObject.attributes?.values ||
      pickedUserObject._attributes?.values ||
      pickedUserObject.userProperties ||
      null);

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

// Click handler: pick objects and detect a country polygon
function handleGlobeClick(event) {
  const x = event.clientX;
  const y = event.clientY;

  const pickList = wwd.pick(wwd.canvasCoordinates(x, y));
  if (!pickList.objects || pickList.objects.length === 0) return;

  // Prefer countries first if multiple objects are picked
  // We’ll search for a picked object that belongs to your "Countries" layer.
  // If we can’t detect the layer name, we still attempt to use the object.
  for (let i = 0; i < pickList.objects.length; i++) {
    const picked = pickList.objects[i];

    // picked.userObject is the actual renderable
    const shape = picked.userObject;

    // Must be a shape with attributes (countries are polygons)
    if (!shape || !shape.attributes) continue;

    // Get a name if possible
    const countryName = getCountryNameFromPickedObject(shape);

    // If we got a name, treat it as the selected country
    if (countryName) {
      infoDiv.innerHTML = `<b>Selected:</b> ${countryName}`;
      highlightCountryShape(shape);
      return;
    }
  }
}

// Attach click listener to the WorldWind canvas
wwd.addEventListener("click", handleGlobeClick);

})();
