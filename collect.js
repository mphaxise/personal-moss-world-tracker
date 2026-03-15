const CONTENT_URL = "./content/bernal-heights-atlas.json";
const STORAGE_KEY = "bernal_walk_capture_v1";
const DEFAULT_CENTER = [37.7398, -122.4139];
const DEFAULT_ZOOM = 15;
const TOAST_MS = 2600;

const state = {
  atlas: null,
  forms: new Map(),
  storage: { stops: {} },
  kidImport: { stops: {}, importedAt: "", exportedAt: "" },
  selectedStopId: null,
  map: null,
  routeLayer: null,
  markerLayer: null,
  startMarker: null,
  markersByStopId: new Map(),
  currentPosition: null,
  userMarker: null,
  watchId: null,
  hasFitRoute: false,
  toastTimer: 0,
};

const dom = {
  heroText: document.querySelector("#heroText"),
  trackBtn: document.querySelector("#trackBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  uploadBtn: document.querySelector("#uploadBtn"),
  importKidBtn: document.querySelector("#importKidBtn"),
  kidImportInput: document.querySelector("#kidImportInput"),
  offlineBtn: document.querySelector("#offlineBtn"),
  routeBtn: document.querySelector("#routeBtn"),
  routeTitle: document.querySelector("#routeTitle"),
  routeMeta: document.querySelector("#routeMeta"),
  captureMap: document.querySelector("#captureMap"),
  stopForms: document.querySelector("#stopForms"),
  toast: document.querySelector("#toast"),
};

boot();

async function boot() {
  dom.trackBtn.addEventListener("click", toggleTracking);
  dom.nextBtn.addEventListener("click", selectNextStop);
  dom.exportBtn.addEventListener("click", exportNotes);
  dom.uploadBtn.addEventListener("click", uploadCurrentBundle);
  dom.importKidBtn.addEventListener("click", () => dom.kidImportInput.click());
  dom.kidImportInput.addEventListener("change", handleKidImport);
  dom.offlineBtn.addEventListener("click", prepareOffline);

  try {
    state.atlas = await fetchAtlas();
    state.storage = loadStorage();
    state.selectedStopId = state.storage.lastSelectedStopId || getStops()[0]?.id || null;
    renderPage();
    showToast("Walk capture page is ready. Edits will auto-save on this device.");
  } catch (error) {
    console.error(error);
    dom.heroText.textContent = `Could not load walk capture data: ${error.message}`;
    showToast("Failed to load walk capture data.");
  }
}

async function fetchAtlas() {
  const response = await fetch(CONTENT_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to load atlas content (${response.status})`);
  }
  return response.json();
}

function loadStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object") {
      return { stops: {} };
    }
    return {
      lastSelectedStopId: parsed.lastSelectedStopId || "",
      stops: parsed.stops && typeof parsed.stops === "object" ? parsed.stops : {},
    };
  } catch (_error) {
    return { stops: {} };
  }
}

function persistStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.storage));
}

function renderPage() {
  const { walk, collection } = state.atlas;
  dom.routeTitle.textContent = `${collection.start_point.label} to ${getStops().length} scouting stops`;
  dom.heroText.textContent = `${walk.title} now has a mobile-first collection mode. The route starts at ${collection.start_point.label} and each stop form is pre-filled from the atlas JSON.`;
  dom.routeBtn.href = collection.google_maps_route_url || "#";
  renderRouteMeta();
  renderStopForms();
  ensureMap();
  renderRouteMap({ fitBounds: true });
  syncOpenDetails();
}

function renderRouteMeta() {
  const { walk, collection } = state.atlas;
  const chips = [
    `${walk.distance_miles} mile scouting loop`,
    `${walk.duration_minutes} minute target`,
    `${getStops().length} editable stops`,
    `auto-open radius ${collection.auto_expand_radius_meters} m`,
    collection.route_note,
  ];

  const importedCount = Object.keys(state.kidImport.stops || {}).length;
  if (importedCount > 0) {
    chips.push(`kid import loaded for ${importedCount} stops`);
  }

  dom.routeMeta.replaceChildren(...chips.map((text) => createChip(text)));
}

function renderStopForms() {
  state.forms.clear();
  dom.stopForms.replaceChildren(...getStops().map((stop) => createStopAccordion(stop)));
}

function createStopAccordion(stop) {
  const merged = getMergedStop(stop);
  const details = document.createElement("details");
  details.className = "stop-accordion";
  details.dataset.stopId = stop.id;
  details.open = stop.id === state.selectedStopId;
  details.addEventListener("toggle", () => {
    if (details.open) {
      selectStop(stop.id, { focusMap: true, fromToggle: true });
    }
  });

  const summary = document.createElement("summary");
  const summaryGrid = document.createElement("div");
  summaryGrid.className = "summary-grid";

  const top = document.createElement("div");
  top.className = "summary-top";
  const titleWrap = document.createElement("div");
  const titleLine = document.createElement("div");
  titleLine.innerHTML = `<span class="stop-index">${stop.walk_order}</span> <strong>${escapeHtml(stop.title)}</strong>`;
  const distance = document.createElement("div");
  distance.className = "stop-distance";
  distance.dataset.distanceFor = stop.id;
  distance.textContent = describeDistance(stop);
  titleWrap.append(titleLine, distance);

  const badge = document.createElement("span");
  badge.className = `status-chip ${statusClassName(merged.status)}`;
  badge.dataset.badgeFor = stop.id;
  badge.textContent = merged.decision ? `${merged.status} / ${merged.decision}` : merged.status;

  top.append(titleWrap, badge);

  const meta = document.createElement("div");
  meta.className = "summary-meta";
  meta.append(
    createChip(stop.habitat_type),
    createChip(stop.location_hint),
    createChip(stop.coordinate_status)
  );

  summaryGrid.append(top, meta);
  summary.append(summaryGrid);

  const form = document.createElement("form");
  form.className = "stop-form";
  form.dataset.stopId = stop.id;
  form.addEventListener("submit", (event) => event.preventDefault());

  form.innerHTML = `
    <div class="field-grid">
      <label>
        <span>Decision</span>
        <select name="decision">
          <option value="">Pending</option>
          <option value="publish">Publish</option>
          <option value="hold">Hold</option>
          <option value="drop">Drop</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select name="status">
          <option value="candidate">candidate</option>
          <option value="field-verified">field-verified</option>
          <option value="published">published</option>
        </select>
      </label>
      <label>
        <span>Arrival time</span>
        <input name="arrived_at" type="datetime-local" />
      </label>
      <label>
        <span>Location hint</span>
        <input name="location_hint" type="text" />
      </label>
      <label>
        <span>Google Maps address</span>
        <input name="google_maps_address" type="text" readonly />
      </label>
      <label>
        <span>Latitude</span>
        <input name="latitude" type="number" step="any" />
      </label>
      <label>
        <span>Longitude</span>
        <input name="longitude" type="number" step="any" />
      </label>
      <label>
        <span>Story angle</span>
        <textarea name="story_angle"></textarea>
      </label>
      <label>
        <span>Short summary</span>
        <textarea name="short_summary"></textarea>
      </label>
      <label>
        <span>Why here</span>
        <textarea name="why_here"></textarea>
      </label>
      <label>
        <span>Species notes</span>
        <textarea name="species_notes"></textarea>
      </label>
      <label>
        <span>Field notes</span>
        <textarea name="field_notes" placeholder="What changed, what looked strong, what should be dropped?"></textarea>
      </label>
      <label>
        <span>Hero image path or filename</span>
        <input name="hero_image" type="text" />
      </label>
    </div>
    <label class="checkbox-row">
      <input name="photo_captured" type="checkbox" />
      <span>Hero image captured on walk</span>
    </label>
    <div class="form-actions">
      <div class="inline-actions">
        <button type="button" class="inline-btn" data-action="use-location">Arrive now</button>
        <button type="button" class="inline-btn" data-action="focus-map">Focus on map</button>
      </div>
      <div class="inline-actions">
        <a class="action-link" data-action="directions" target="_blank" rel="noreferrer">Open in Google Maps</a>
      </div>
    </div>
  `;

  hydrateForm(form, merged);
  const kidScoutBlock = createKidScoutBlock(merged);
  if (kidScoutBlock) {
    form.append(kidScoutBlock);
  }
  form.append(createPhotoBlock(merged));
  form.append(createBottomNav(stop.id));
  wireForm(form, stop.id);

  details.append(summary, form);
  state.forms.set(stop.id, { details, form });
  return details;
}

function hydrateForm(form, merged) {
  form.elements.decision.value = merged.decision || "";
  form.elements.status.value = merged.status || "candidate";
  form.elements.arrived_at.value = merged.arrived_at || "";
  form.elements.location_hint.value = merged.location_hint || "";
  form.elements.google_maps_address.value = merged.google_maps_address || "";
  form.elements.latitude.value = toFormNumber(merged.latitude);
  form.elements.longitude.value = toFormNumber(merged.longitude);
  form.elements.story_angle.value = merged.story_angle || "";
  form.elements.short_summary.value = merged.short_summary || "";
  form.elements.why_here.value = merged.why_here || "";
  form.elements.species_notes.value = merged.species_notes || "";
  form.elements.field_notes.value = merged.field_notes || "";
  form.elements.hero_image.value = merged.hero_image || "";
  form.elements.photo_captured.checked = Boolean(merged.photo_captured);
  form.querySelector('[data-action="directions"]').href = buildMapsLink(merged.latitude, merged.longitude, merged.title);
}

function wireForm(form, stopId) {
  form.addEventListener("input", () => saveForm(stopId, form));
  form.addEventListener("change", () => saveForm(stopId, form));

  form.querySelector('[data-action="use-location"]').addEventListener("click", async () => {
    try {
      await ensureCurrentPosition();
      stampArrivalFromCurrentPosition(stopId, form, {
        overwriteExisting: true,
        announce: true,
        focusMap: true,
      });
    } catch (error) {
      console.error(error);
      showToast(error.message || "Could not get your device location.");
    }
  });

  form.querySelector('[data-action="focus-map"]').addEventListener("click", () => {
    selectStop(stopId, { focusMap: true, fromToggle: false });
  });

  form.querySelector('[data-action="next-stop"]').addEventListener("click", () => {
    selectNextStopFrom(stopId);
  });
}

function saveForm(stopId, form) {
  const previousBase = getBaseStop(stopId);
  const previousSaved = state.storage.stops[stopId] || {};
  const next = {
    ...previousSaved,
    decision: form.elements.decision.value,
    status: form.elements.status.value,
    arrived_at: form.elements.arrived_at.value,
    location_hint: form.elements.location_hint.value.trim(),
    latitude: parseNullableNumber(form.elements.latitude.value),
    longitude: parseNullableNumber(form.elements.longitude.value),
    story_angle: form.elements.story_angle.value.trim(),
    short_summary: form.elements.short_summary.value.trim(),
    why_here: form.elements.why_here.value.trim(),
    species_notes: form.elements.species_notes.value.trim(),
    field_notes: form.elements.field_notes.value.trim(),
    hero_image: form.elements.hero_image.value.trim(),
    photo_captured: form.elements.photo_captured.checked,
    google_maps_address: previousSaved.google_maps_address || previousBase.google_maps_address || "",
  };

  state.storage.stops[stopId] = next;
  state.storage.lastSelectedStopId = stopId;
  persistStorage();
  updateSummary(stopId, previousBase, next, {
    refreshMap:
      previousSaved.latitude !== next.latitude ||
      previousSaved.longitude !== next.longitude,
  });
}

function updateSummary(stopId, baseStop, saved, options = {}) {
  const merged = { ...baseStop, ...saved };
  const badge = document.querySelector(`[data-badge-for="${stopId}"]`);
  if (badge) {
    badge.className = `status-chip ${statusClassName(merged.status)}`;
    badge.textContent = merged.decision ? `${merged.status} / ${merged.decision}` : merged.status;
  }

  const details = state.forms.get(stopId)?.details;
  if (details && merged.location_hint) {
    const chips = details.querySelectorAll(".summary-meta .meta-chip");
    if (chips[1]) {
      chips[1].textContent = merged.location_hint;
    }
  }

  const directions = state.forms.get(stopId)?.form.querySelector('[data-action="directions"]');
  if (directions) {
    directions.href = buildMapsLink(merged.latitude, merged.longitude, merged.title);
  }

  if (options.refreshMap) {
    renderRouteMap({ fitBounds: false });
  }
}

function stampArrivalFromCurrentPosition(stopId, form, options = {}) {
  const overwriteExisting = Boolean(options.overwriteExisting);
  const announce = options.announce !== false;
  const focusMap = Boolean(options.focusMap);

  if (!state.currentPosition) {
    if (announce) {
      showToast("Enable location tracking first, then use Arrive now.");
    }
    return false;
  }

  const hasArrival = Boolean(form.elements.arrived_at.value);
  const hasCoords = Boolean(String(form.elements.latitude.value).trim() && String(form.elements.longitude.value).trim());
  if (!overwriteExisting && hasArrival && hasCoords) {
    return false;
  }

  form.elements.latitude.value = state.currentPosition.latitude.toFixed(6);
  form.elements.longitude.value = state.currentPosition.longitude.toFixed(6);
  form.elements.arrived_at.value = currentDateTimeLocal();

  saveForm(stopId, form);
  renderRouteMap({ fitBounds: false });

  if (focusMap) {
    selectStop(stopId, { focusMap: true, fromToggle: false });
  }

  if (announce) {
    showToast("Arrival time and device coordinates recorded for this stop.");
  }

  return true;
}

async function ensureCurrentPosition() {
  if (state.currentPosition) {
    return state.currentPosition;
  }

  if (!navigator.geolocation) {
    throw new Error("This browser does not support location access.");
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    });
  }).catch((error) => {
    throw new Error(`Location error: ${error.message}`);
  });

  state.currentPosition = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };

  renderRouteMap({ fitBounds: false });
  return state.currentPosition;
}

function createPhotoBlock(stop) {
  const wrap = document.createElement("section");
  wrap.className = "photo-block";

  const title = document.createElement("h3");
  title.textContent = "Recent nearby iNaturalist photos";

  const notes = document.createElement("p");
  notes.className = "field-note";
  notes.textContent = "These are the two most recent nearby moss, liverwort, or lichen observations with photos around this provisional stop anchor.";

  const grid = document.createElement("div");
  grid.className = "photo-grid";

  const photos = Array.isArray(stop.inat_recent_photos) ? stop.inat_recent_photos : [];
  if (photos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "field-note";
    empty.textContent = "No nearby iNaturalist photos were found for this stop yet.";
    wrap.append(title, notes, empty);
    return wrap;
  }

  for (const photo of photos) {
    const link = document.createElement("a");
    link.className = "photo-card";
    link.href = photo.observation_url;
    link.target = "_blank";
    link.rel = "noreferrer";

    const image = document.createElement("img");
    image.loading = "lazy";
    image.src = photo.photo_url;
    image.alt = `${photo.taxon_name || "Observation"} from iNaturalist`;

    const caption = document.createElement("div");
    caption.className = "photo-caption";

    const line1 = document.createElement("strong");
    line1.textContent = photo.common_name || photo.taxon_name || "Observation";

    const line2 = document.createElement("span");
    line2.textContent = `${photo.observed_on || "date unknown"}${photo.place_guess ? ` • ${photo.place_guess}` : ""}`;

    const line3 = document.createElement("span");
    line3.textContent = photo.attribution || "iNaturalist photo";

    caption.append(line1, line2, line3);
    link.append(image, caption);
    grid.append(link);
  }

  wrap.append(title, notes, grid);
  return wrap;
}

function createKidScoutBlock(stop) {
  const scout = stop?.kid_scout;
  if (!scout) {
    return null;
  }

  const wrap = document.createElement("section");
  wrap.className = "kid-scout-block";

  const title = document.createElement("h3");
  title.textContent = "Kid scout handoff";

  const note = document.createElement("p");
  note.className = "field-note";
  note.textContent = scout.imported_at
    ? `Imported from the kid device ${formatShortDateTime(scout.imported_at)}.`
    : "Imported from the kid device.";

  const meta = document.createElement("div");
  meta.className = "kid-scout-meta";
  const labels = [
    scout.found_state || "pending",
    scout.favorite ? "favorite" : "",
    ...(Array.isArray(scout.habitat_tags) ? scout.habitat_tags : []),
    ...(Array.isArray(scout.texture_tags) ? scout.texture_tags : []),
  ].filter(Boolean);
  meta.append(...labels.map((label) => createChip(`kid: ${label}`)));

  wrap.append(title, note, meta);

  if (scout.photo_data_url) {
    const photo = document.createElement("div");
    photo.className = "kid-scout-photo";

    const image = document.createElement("img");
    image.loading = "lazy";
    image.src = scout.photo_data_url;
    image.alt = `Kid scout photo for ${stop.title}`;

    const caption = document.createElement("span");
    caption.className = "field-note";
    caption.textContent = scout.photo_updated_at
      ? `Kid photo captured ${formatShortDateTime(scout.photo_updated_at)}${scout.photo_name ? ` • ${scout.photo_name}` : ""}`
      : "Kid photo imported from the iPad.";

    photo.append(image, caption);
    wrap.append(photo);
  }

  return wrap;
}

function createBottomNav(stopId) {
  const next = getNextStop(stopId);
  const wrap = document.createElement("div");
  wrap.className = "form-footer";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary-btn next-stop-btn";
  button.dataset.action = "next-stop";
  button.textContent = next ? `Next stop: ${next.walk_order}` : "Last stop";
  button.disabled = !next;

  wrap.append(button);
  return wrap;
}

function ensureMap() {
  if (state.map) {
    return;
  }

  state.map = L.map(dom.captureMap, {
    zoomControl: false,
    scrollWheelZoom: false,
  });

  L.control.zoom({ position: "topright" }).addTo(state.map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(state.map);

  state.routeLayer = L.layerGroup().addTo(state.map);
  state.markerLayer = L.layerGroup().addTo(state.map);
  state.map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
}

function renderRouteMap(options = {}) {
  const fitBounds = Boolean(options.fitBounds);
  if (!state.map) {
    return;
  }

  state.routeLayer.clearLayers();
  state.markerLayer.clearLayers();
  state.markersByStopId.clear();

  const start = state.atlas.collection.start_point;
  const stops = getStops().map(getMergedStop);

  const startLatLng = [start.latitude, start.longitude];
  const routePoints = [startLatLng, ...stops.filter(hasCoords).map((stop) => [stop.latitude, stop.longitude])];

  const startMarker = L.marker(startLatLng, { icon: createStartIcon() })
    .bindPopup(`<strong>Start</strong><br>${escapeHtml(start.label)}`)
    .addTo(state.markerLayer);
  state.startMarker = startMarker;

  for (const stop of stops) {
    if (!hasCoords(stop)) {
      continue;
    }

    const marker = L.marker([stop.latitude, stop.longitude], {
      icon: createStopIcon(stop.walk_order, stop.id === state.selectedStopId),
    });
    marker.bindPopup(`<strong>${escapeHtml(stop.title)}</strong><br>${escapeHtml(stop.location_hint)}`);
    marker.on("click", () => selectStop(stop.id, { focusMap: false, fromToggle: false }));
    marker.addTo(state.markerLayer);
    state.markersByStopId.set(stop.id, marker);
  }

  if (routePoints.length >= 2) {
    L.polyline(routePoints, {
      color: "#48683f",
      weight: 4,
      opacity: 0.78,
      dashArray: "8 8",
    }).addTo(state.routeLayer);
  }

  if (state.currentPosition) {
    if (state.userMarker) {
      state.userMarker.remove();
    }

    state.userMarker = L.marker([state.currentPosition.latitude, state.currentPosition.longitude], {
      icon: createUserIcon(),
    }).addTo(state.markerLayer);
    state.userMarker.bindPopup("Your current position");
  }

  const bounds = routePoints.length > 0 ? L.latLngBounds(routePoints) : null;
  if (bounds && (fitBounds || !state.hasFitRoute)) {
    state.map.fitBounds(bounds.pad(0.18), { padding: [20, 20] });
    state.hasFitRoute = true;
  }

  focusSelectedStop(false);
  updateDistanceLabels();
}

function createStartIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="route-start-marker">S</div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function createStopIcon(order, selected) {
  return L.divIcon({
    className: "",
    html: `<div class="route-stop-marker${selected ? " is-selected" : ""}">${order}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

function createUserIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="user-dot"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function toggleTracking() {
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
    dom.trackBtn.textContent = "Enable location tracking";
    showToast("Location tracking stopped.");
    return;
  }

  if (!navigator.geolocation) {
    showToast("This browser does not support location tracking.");
    return;
  }

  state.watchId = navigator.geolocation.watchPosition(handlePosition, handlePositionError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  });

  dom.trackBtn.textContent = "Stop location tracking";
  showToast("Location tracking enabled.");
}

function handlePosition(position) {
  state.currentPosition = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
  renderRouteMap({ fitBounds: false });
  maybeAutoSelectNearestStop();
}

function handlePositionError(error) {
  console.error(error);
  showToast(`Location error: ${error.message}`);
}

function maybeAutoSelectNearestStop() {
  if (!state.currentPosition) {
    return;
  }

  const nearest = getNearestStop(state.currentPosition);
  if (!nearest) {
    return;
  }

  const radius = state.atlas.collection.auto_expand_radius_meters;
  if (nearest.distanceMeters > radius) {
    return;
  }

  const stop = nearest.stop;
  let autoStamped = false;
  const form = state.forms.get(stop.id)?.form;
  if (form) {
    autoStamped = stampArrivalFromCurrentPosition(stop.id, form, {
      overwriteExisting: false,
      announce: false,
      focusMap: false,
    });
  }

  if (state.selectedStopId !== stop.id) {
    selectStop(stop.id, { focusMap: true, fromToggle: false });
    showToast(
      autoStamped
        ? `Near stop ${stop.walk_order}: ${stop.title}. Arrival and device coordinates were auto-recorded.`
        : `Near stop ${stop.walk_order}: ${stop.title}`
    );
    return;
  }

  if (autoStamped) {
    showToast(`Arrival and device coordinates were auto-recorded for stop ${stop.walk_order}.`);
  }
}

function selectStop(stopId, { focusMap, fromToggle }) {
  state.selectedStopId = stopId;
  state.storage.lastSelectedStopId = stopId;
  persistStorage();

  syncOpenDetails();
  renderRouteMap({ fitBounds: false });

  if (focusMap) {
    focusSelectedStop();
  }

  if (!fromToggle) {
    state.forms.get(stopId)?.details.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function syncOpenDetails() {
  for (const [stopId, refs] of state.forms.entries()) {
    refs.details.open = stopId === state.selectedStopId;
  }
}

function focusSelectedStop(openPopup = true) {
  const stop = getSelectedStop();
  if (!stop || !hasCoords(stop) || !state.map) {
    return;
  }

  state.map.flyTo([stop.latitude, stop.longitude], Math.max(state.map.getZoom(), 16), {
    duration: 0.45,
  });

  const marker = state.markersByStopId.get(stop.id);
  if (marker && openPopup) {
    marker.openPopup();
  }
}

function selectNextStop() {
  selectNextStopFrom(state.selectedStopId);
}

function selectNextStopFrom(stopId) {
  const next = getNextStop(stopId);
  if (!next) {
    showToast("You are already on the last stop.");
    return;
  }

  selectStop(next.id, { focusMap: true, fromToggle: false });
}

function exportNotes() {
  const exported = buildAdultExportPayload();

  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bernal-walk-capture-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Exported current walk notes.");
}

function buildAdultExportPayload() {
  return {
    exported_at: new Date().toISOString(),
    mode: "adult-capture",
    device_label: "adult-phone",
    start_point: state.atlas.collection.start_point,
    stops: getStops().map((stop) => getMergedStop(stop)),
  };
}

async function uploadCurrentBundle() {
  try {
    const payload = buildAdultExportPayload();
    const response = await fetch("/api/walk-bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Upload failed (${response.status})`);
    }

    showToast(`Uploaded to laptop as ${result.filename}.`);
  } catch (error) {
    console.error(error);
    showToast(`Could not upload to the laptop: ${error.message}`);
  }
}

async function handleKidImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const payload = JSON.parse(await file.text());
    const imported = normalizeKidImportPayload(payload);
    state.kidImport = imported;
    renderPage();
    showToast(`Imported kid handoff for ${Object.keys(imported.stops).length} stops. Use Export notes to save the merged pack.`);
  } catch (error) {
    console.error(error);
    showToast(`Could not import the kid export: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function normalizeKidImportPayload(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.stops)) {
    throw new Error("Kid export must be a JSON object with a stops array.");
  }

  const importedStops = {};
  for (const item of payload.stops) {
    const stopId = String(item?.id || "");
    if (!getBaseStop(stopId)) {
      continue;
    }

    const notes = normalizeKidScoutNotes(item.kid_notes || {});
    if (!hasKidScoutData(notes)) {
      continue;
    }

    importedStops[stopId] = {
      ...notes,
      imported_at: new Date().toISOString(),
      source_exported_at: String(payload.exported_at || ""),
    };
  }

  return {
    stops: importedStops,
    importedAt: new Date().toISOString(),
    exportedAt: String(payload.exported_at || ""),
  };
}

function normalizeKidScoutNotes(notes) {
  return {
    found_state: sanitizeShortText(notes.found_state),
    favorite: Boolean(notes.favorite),
    habitat_tags: sanitizeStringArray(notes.habitat_tags),
    texture_tags: sanitizeStringArray(notes.texture_tags),
    visited_at: sanitizeShortText(notes.visited_at),
    has_photo: Boolean(notes.has_photo),
    photo_name: sanitizeShortText(notes.photo_name),
    photo_updated_at: sanitizeShortText(notes.photo_updated_at),
    photo_data_url: typeof notes.photo_export_data_url === "string" && notes.photo_export_data_url.startsWith("data:image/")
      ? notes.photo_export_data_url
      : "",
  };
}

function hasKidScoutData(notes) {
  return Boolean(
    notes.found_state ||
      notes.favorite ||
      notes.habitat_tags.length ||
      notes.texture_tags.length ||
      notes.photo_data_url
  );
}

async function prepareOffline() {
  const photoUrls = getStops()
    .flatMap((stop) => stop.inat_recent_photos || [])
    .map((photo) => photo.photo_url)
    .filter(Boolean);

  try {
    const result = await window.mossOffline?.prepare(photoUrls);
    if (!result?.ok) {
      showToast(result?.reason || "Offline prep is not available here.");
      return;
    }
    showToast("Offline prep started. On HTTPS or localhost, this warms the app for field use.");
  } catch (error) {
    console.error(error);
    showToast(`Offline prep failed: ${error.message}`);
  }
}

function updateDistanceLabels() {
  const labels = document.querySelectorAll("[data-distance-for]");
  for (const label of labels) {
    const stop = getMergedStop(getBaseStop(label.dataset.distanceFor));
    label.textContent = describeDistance(stop);
  }
}

function describeDistance(stop) {
  if (state.currentPosition) {
    const meters = distanceMeters(state.currentPosition, stop);
    if (Number.isFinite(meters)) {
      return meters < 1000 ? `${Math.round(meters)} m from you` : `${(meters / 1000).toFixed(2)} km from you`;
    }
  }

  const start = state.atlas?.collection?.start_point;
  if (start) {
    const meters = distanceMeters(start, stop);
    if (Number.isFinite(meters)) {
      return meters < 1000 ? `${Math.round(meters)} m from start` : `${(meters / 1000).toFixed(2)} km from start`;
    }
  }

  return "distance pending";
}

function getNearestStop(origin) {
  let best = null;
  for (const stop of getStops().map(getMergedStop)) {
    if (!hasCoords(stop)) {
      continue;
    }
    const meters = distanceMeters(origin, stop);
    if (!Number.isFinite(meters)) {
      continue;
    }
    if (!best || meters < best.distanceMeters) {
      best = { stop, distanceMeters: meters };
    }
  }
  return best;
}

function getSelectedStop() {
  const stop = getBaseStop(state.selectedStopId);
  return stop ? getMergedStop(stop) : null;
}

function getNextStop(stopId) {
  const stops = getStops();
  const index = stops.findIndex((stop) => stop.id === stopId);
  if (index === -1) {
    return stops[0] || null;
  }
  return stops[index + 1] || null;
}

function getBaseStop(stopId) {
  return getStops().find((stop) => stop.id === stopId) || null;
}

function getStops() {
  return [...(state.atlas?.stops || [])].sort((a, b) => a.walk_order - b.walk_order);
}

function getMergedStop(stop) {
  if (!stop) {
    return null;
  }
  const saved = state.storage.stops[stop.id] || {};
  return {
    ...stop,
    ...saved,
    kid_scout: state.kidImport.stops[stop.id] || saved.kid_scout || null,
  };
}

function hasCoords(stop) {
  return Number.isFinite(stop?.latitude) && Number.isFinite(stop?.longitude);
}

function distanceMeters(a, b) {
  if (!hasCoords(a) || !hasCoords(b)) {
    return Number.NaN;
  }

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLat = lat2 - lat1;
  const dLng = toRad(b.longitude - a.longitude);
  const hav = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toFormNumber(value) {
  return Number.isFinite(value) ? String(value) : "";
}

function createChip(text) {
  const chip = document.createElement("span");
  chip.className = "meta-chip";
  chip.textContent = text;
  return chip;
}

function buildMapsLink(latitude, longitude, title) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(title || "Bernal stop");
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function currentDateTimeLocal() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now - timezoneOffset).toISOString().slice(0, 16);
}

function statusClassName(status) {
  return `status-${String(status || "candidate")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeShortText(value) {
  return String(value || "").trim().slice(0, 120);
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => sanitizeShortText(item))
    .filter(Boolean)
    .slice(0, 12);
}

function formatShortDateTime(value) {
  if (!value) {
    return "date unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, TOAST_MS);
}
