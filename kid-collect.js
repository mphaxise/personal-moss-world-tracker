const CONTENT_URL = "./content/bernal-heights-atlas.json";
const STORAGE_KEY = "bernal_walk_kid_capture_v1";
const PHOTO_DB_NAME = "bernal_walk_kid_capture";
const PHOTO_STORE_NAME = "stop_photos";
const DEFAULT_CENTER = [37.7398, -122.4139];
const DEFAULT_ZOOM = 15;
const TOAST_MS = 3000;
const MAX_IMAGE_DIMENSION = 1600;

const HABITAT_TAGS = [
  { value: "wall", label: "Wall" },
  { value: "tree", label: "Tree" },
  { value: "stairs", label: "Stairs" },
  { value: "soil", label: "Soil" },
  { value: "rock", label: "Rock" },
  { value: "wet", label: "Wet spot" },
];

const TEXTURE_TAGS = [
  { value: "tiny", label: "Tiny" },
  { value: "soft", label: "Soft" },
  { value: "bright", label: "Bright" },
  { value: "fuzzy", label: "Fuzzy" },
  { value: "weird", label: "Weird" },
  { value: "stripey", label: "Stripey" },
];

const FOUND_STATES = [
  {
    value: "found",
    label: "Found it",
    caption: "Good stop",
    className: "",
  },
  {
    value: "maybe",
    label: "Maybe",
    caption: "Not sure yet",
    className: "is-warm",
  },
  {
    value: "skip",
    label: "Skip",
    caption: "Nothing strong",
    className: "",
  },
];

const state = {
  atlas: null,
  storage: { stops: {} },
  selectedStopId: null,
  map: null,
  routeLayer: null,
  markerLayer: null,
  markersByStopId: new Map(),
  currentPosition: null,
  userMarker: null,
  watchId: null,
  hasFitRoute: false,
  toastTimer: 0,
  photoDb: null,
  photoUrls: new Map(),
  photoLoadNonce: 0,
};

const dom = {
  heroText: document.querySelector("#heroText"),
  trackBtn: document.querySelector("#trackBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  routeBtn: document.querySelector("#routeBtn"),
  routeTitle: document.querySelector("#routeTitle"),
  progressRow: document.querySelector("#progressRow"),
  routeMeta: document.querySelector("#routeMeta"),
  stopRail: document.querySelector("#stopRail"),
  activeStop: document.querySelector("#activeStop"),
  kidMap: document.querySelector("#kidMap"),
  toast: document.querySelector("#toast"),
};

boot();

async function boot() {
  dom.trackBtn.addEventListener("click", toggleTracking);
  dom.nextBtn.addEventListener("click", selectNextStop);
  dom.exportBtn.addEventListener("click", exportNotes);
  window.addEventListener("beforeunload", revokePhotoUrls);

  try {
    state.photoDb = await openPhotoDb();
  } catch (error) {
    console.error("Photo storage unavailable", error);
  }

  try {
    state.atlas = await fetchAtlas();
    state.storage = loadStorage();
    state.selectedStopId = state.storage.lastSelectedStopId || getStops()[0]?.id || null;
    renderPage();

    if (state.photoDb) {
      showToast("Kid scout mode is ready. Notes and photos save on this device.");
    } else {
      showToast("Kid scout mode is ready. Notes save on this device, but photo persistence is limited here.");
    }
  } catch (error) {
    console.error(error);
    dom.heroText.textContent = `Could not load kid scout mode: ${error.message}`;
    showToast("Failed to load the Bernal kid scout page.");
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
  dom.routeTitle.textContent = `${collection.start_point.label} to ${getStops().length} kid scout stops`;
  dom.heroText.textContent = `${walk.title} now has a companion kid mode. Adult notes can stay on the phone while kid notes and photos save separately on the iPad.`;
  dom.routeBtn.href = collection.google_maps_route_url || "#";

  renderProgress();
  renderRouteMeta();
  renderStopRail();
  renderActiveStop();
  ensureMap();
  renderRouteMap({ fitBounds: true });
}

function renderProgress() {
  const stops = getStops().map(getMergedStop);
  const finished = stops.filter((stop) => Boolean(stop.found_state)).length;
  const favorites = stops.filter((stop) => Boolean(stop.favorite)).length;
  const photos = stops.filter((stop) => Boolean(stop.has_photo)).length;
  const current = getSelectedStop();

  const cards = [
    { label: "Done", value: `${finished}/${stops.length}` },
    { label: "Favorites", value: String(favorites) },
    { label: "Photos", value: String(photos) },
    {
      label: "Current",
      value: current ? `Stop ${current.walk_order}` : "None",
    },
  ];

  dom.progressRow.replaceChildren(...cards.map(createProgressCard));
}

function renderRouteMeta() {
  const { walk, collection } = state.atlas;
  const chips = [
    `${walk.distance_miles} mile loop`,
    `${walk.duration_minutes} minute target`,
    `${collection.auto_expand_radius_meters} m auto-open radius`,
    "Each device saves separately",
  ];

  dom.routeMeta.replaceChildren(...chips.map(createMetaChip));
}

function renderStopRail() {
  dom.stopRail.replaceChildren(...getStops().map(createStopPill));
  updateDistanceLabels();
}

function createStopPill(stop) {
  const merged = getMergedStop(stop);
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "stop-pill",
    stop.id === state.selectedStopId ? "is-selected" : "",
    merged.found_state ? "is-complete" : "",
    merged.favorite ? "is-favorite" : "",
  ]
    .filter(Boolean)
    .join(" ");
  button.addEventListener("click", () => selectStop(stop.id, { focusMap: true }));

  const title = document.createElement("div");
  title.className = "pill-content";
  title.innerHTML = `
    <div class="pill-head">
      <span class="pill-order">${stop.walk_order}</span>
      <div class="pill-title">${escapeHtml(stop.title)}</div>
    </div>
  `;

  const meta = document.createElement("div");
  meta.className = "pill-meta";
  meta.append(
    createTinyMeta(merged.found_state || "pending"),
    createTinyMeta(merged.favorite ? "favorite" : "not favorite"),
    createTinyMeta(merged.has_photo ? "photo" : "no photo")
  );

  const distance = document.createElement("div");
  distance.className = "pill-meta";
  const distanceLabel = document.createElement("span");
  distanceLabel.dataset.distanceFor = stop.id;
  distanceLabel.textContent = describeDistance(merged);
  distance.append(distanceLabel);

  title.append(meta, distance);
  button.append(title);
  return button;
}

function renderActiveStop() {
  const stop = getSelectedStop();
  dom.activeStop.replaceChildren();

  if (!stop) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No stop is selected yet.";
    dom.activeStop.append(empty);
    return;
  }

  const card = document.createElement("div");
  card.className = "active-card";

  const head = document.createElement("section");
  head.className = "active-head";
  head.innerHTML = `
    <div class="active-title-row">
      <div class="active-title-wrap">
        <span class="active-order">${stop.walk_order}</span>
        <div>
          <h3>${escapeHtml(stop.title)}</h3>
          <div class="helper-copy" id="activeDistance" data-distance-for="${stop.id}">${describeDistance(stop)}</div>
        </div>
      </div>
      <div class="inline-actions">
        <a class="inline-link" href="${escapeAttribute(stop.google_maps_stop_url || buildMapsLink(stop.latitude, stop.longitude, stop.title))}" target="_blank" rel="noreferrer">Open in Google Maps</a>
        <button type="button" class="ghost-btn" id="focusMapBtn">Focus on map</button>
      </div>
    </div>
  `;

  const statusRow = document.createElement("div");
  statusRow.className = "active-status-row";
  statusRow.append(
    createStatusPill(stop.found_state || "pending"),
    createStatusPill(stop.favorite ? "favorite" : "exploring"),
    createStatusPill(stop.has_photo ? "photo saved" : "photo needed"),
    createStatusPill(stop.habitat_type)
  );
  head.append(statusRow);

  const callout = document.createElement("p");
  callout.className = "callout";
  callout.textContent = stop.story_angle || stop.short_summary;
  head.append(callout);

  const infoGrid = document.createElement("div");
  infoGrid.className = "info-grid";
  infoGrid.append(
    createInfoCard("Look here", stop.location_hint),
    createInfoCard("Address", stop.google_maps_address || "Address not set"),
    createInfoCard("Season", stop.seasonality),
    createInfoCard("Adult story note", stop.why_here)
  );
  head.append(infoGrid);
  card.append(head);

  card.append(createChoiceGroup(stop));
  card.append(createTagGroup(stop, "Habitat tags", "What is it growing on?", HABITAT_TAGS, "habitat_tags"));
  card.append(createTagGroup(stop, "Texture tags", "What does it feel like to look at?", TEXTURE_TAGS, "texture_tags"));
  card.append(createPhotoGroup(stop));
  card.append(createReferenceGroup(stop));
  card.append(createBottomNav(stop.id));

  dom.activeStop.append(card);

  document.querySelector("#focusMapBtn")?.addEventListener("click", () => {
    focusSelectedStop(true);
  });

  wireChoiceGroup(stop);
  wireTagGroups(stop);
  wirePhotoGroup(stop);
  wireBottomNav(stop.id);
  loadSelectedPhotoPreview(stop.id);
}

function createChoiceGroup(stop) {
  const section = document.createElement("section");
  section.className = "choice-group";

  const heading = document.createElement("h3");
  heading.textContent = "Did you find something strong here?";

  const copy = document.createElement("p");
  copy.className = "section-copy";
  copy.textContent = "Pick one quick answer. This is the main scout decision for the stop.";

  const row = document.createElement("div");
  row.className = "choice-row";

  for (const option of FOUND_STATES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `choice-btn ${option.className} ${stop.found_state === option.value ? "is-active" : ""}`.trim();
    button.dataset.foundState = option.value;
    button.innerHTML = `
      <strong>${option.label}</strong>
      <span class="button-caption">${option.caption}</span>
    `;
    row.append(button);
  }

  const favorite = document.createElement("button");
  favorite.type = "button";
  favorite.className = `favorite-btn ${stop.favorite ? "is-active" : ""}`.trim();
  favorite.id = "favoriteBtn";
  favorite.textContent = stop.favorite ? "Favorite stop" : "Mark as favorite";

  section.append(heading, copy, row, favorite);
  return section;
}

function wireChoiceGroup(stop) {
  for (const button of dom.activeStop.querySelectorAll("[data-found-state]")) {
    button.addEventListener("click", () => {
      const foundState = button.dataset.foundState || "";
      saveStop(stop.id, {
        found_state: foundState,
        visited_at: state.storage.stops[stop.id]?.visited_at || new Date().toISOString(),
      });
      renderPage();
      showToast(`Saved "${button.querySelector("strong")?.textContent || foundState}" for ${stop.title}.`);
    });
  }

  dom.activeStop.querySelector("#favoriteBtn")?.addEventListener("click", () => {
    saveStop(stop.id, {
      favorite: !Boolean(state.storage.stops[stop.id]?.favorite),
      visited_at: state.storage.stops[stop.id]?.visited_at || new Date().toISOString(),
    });
    renderPage();
  });
}

function createTagGroup(stop, title, copy, options, key) {
  const section = document.createElement("section");
  section.className = "tag-group";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const helper = document.createElement("p");
  helper.className = "section-copy";
  helper.textContent = copy;

  const row = document.createElement("div");
  row.className = "tag-row";
  const selected = Array.isArray(stop[key]) ? stop[key] : [];

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-btn ${selected.includes(option.value) ? "is-active" : ""}`.trim();
    button.dataset.tagGroup = key;
    button.dataset.tagValue = option.value;
    button.textContent = option.label;
    row.append(button);
  }

  section.append(heading, helper, row);
  return section;
}

function wireTagGroups(stop) {
  for (const button of dom.activeStop.querySelectorAll("[data-tag-group]")) {
    button.addEventListener("click", () => {
      const key = button.dataset.tagGroup;
      const value = button.dataset.tagValue;
      const current = Array.isArray(state.storage.stops[stop.id]?.[key]) ? state.storage.stops[stop.id][key] : [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      saveStop(stop.id, {
        [key]: next,
        visited_at: state.storage.stops[stop.id]?.visited_at || new Date().toISOString(),
      });
      renderPage();
    });
  }
}

function createPhotoGroup(stop) {
  const section = document.createElement("section");
  section.className = "photo-group";

  const heading = document.createElement("h3");
  heading.textContent = "Take one photo";

  const helper = document.createElement("p");
  helper.className = "section-copy";
  helper.textContent = "Use the camera on this iPad. The saved preview stays on this device.";

  const photoWell = document.createElement("div");
  photoWell.className = "photo-well";
  photoWell.id = "photoWell";
  photoWell.innerHTML = `<div class="photo-empty">No saved photo yet for this stop.</div>`;

  const meta = document.createElement("div");
  meta.className = "photo-meta";
  meta.id = "photoMeta";
  meta.textContent = stop.photo_updated_at
    ? `Saved ${formatShortDate(stop.photo_updated_at)}${stop.photo_name ? ` • ${stop.photo_name}` : ""}`
    : "No photo saved yet";

  const fileInput = document.createElement("input");
  fileInput.className = "photo-upload";
  fileInput.id = "photoInput";
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.capture = "environment";

  const uploadButton = document.createElement("label");
  uploadButton.className = "photo-btn";
  uploadButton.htmlFor = "photoInput";
  uploadButton.textContent = stop.has_photo ? "Replace photo" : "Add photo";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "ghost-btn";
  removeButton.id = "removePhotoBtn";
  removeButton.disabled = !stop.has_photo;
  removeButton.textContent = "Remove photo";

  const photoActions = document.createElement("div");
  photoActions.className = "photo-actions";
  photoActions.append(uploadButton, removeButton);

  section.append(heading, helper, photoWell, meta, fileInput, photoActions);
  return section;
}

function wirePhotoGroup(stop) {
  const input = dom.activeStop.querySelector("#photoInput");
  const removeButton = dom.activeStop.querySelector("#removePhotoBtn");

  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      await savePhotoForStop(stop.id, file);
      saveStop(stop.id, {
        has_photo: true,
        photo_name: file.name,
        photo_updated_at: new Date().toISOString(),
        visited_at: state.storage.stops[stop.id]?.visited_at || new Date().toISOString(),
      });
      renderPage();
      showToast(`Saved a photo for ${stop.title}.`);
    } catch (error) {
      console.error(error);
      showToast(`Could not save photo: ${error.message}`);
    } finally {
      input.value = "";
    }
  });

  removeButton?.addEventListener("click", async () => {
    try {
      await deletePhotoForStop(stop.id);
      saveStop(stop.id, {
        has_photo: false,
        photo_name: "",
        photo_updated_at: "",
      });
      renderPage();
      showToast(`Removed the photo for ${stop.title}.`);
    } catch (error) {
      console.error(error);
      showToast(`Could not remove photo: ${error.message}`);
    }
  });
}

function createReferenceGroup(stop) {
  const section = document.createElement("section");
  section.className = "reference-group";

  const heading = document.createElement("h3");
  heading.textContent = "Nearby example photos";

  const helper = document.createElement("p");
  helper.className = "section-copy";
  helper.textContent = "Use these as inspiration. They are recent nearby iNaturalist observations, not exact stop photos.";

  const grid = document.createElement("div");
  grid.className = "reference-grid";

  const photos = Array.isArray(stop.inat_recent_photos) ? stop.inat_recent_photos : [];
  if (photos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No nearby example photos were found for this stop yet.";
    section.append(heading, helper, empty);
    return section;
  }

  for (const photo of photos) {
    const link = document.createElement("a");
    link.className = "reference-card";
    link.href = photo.observation_url;
    link.target = "_blank";
    link.rel = "noreferrer";

    const image = document.createElement("img");
    image.loading = "lazy";
    image.src = photo.photo_url;
    image.alt = `${photo.common_name || photo.taxon_name || "Nearby observation"} from iNaturalist`;

    const title = document.createElement("strong");
    title.textContent = photo.common_name || photo.taxon_name || "Nearby observation";

    const date = document.createElement("span");
    date.textContent = `${photo.observed_on || "date unknown"}${photo.place_guess ? ` • ${photo.place_guess}` : ""}`;

    link.append(image, title, date);
    grid.append(link);
  }

  section.append(heading, helper, grid);
  return section;
}

function createBottomNav(stopId) {
  const next = getNextStop(stopId);
  const wrap = document.createElement("div");
  wrap.className = "card-footer";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary-btn next-stop-btn";
  button.id = "cardNextBtn";
  button.textContent = next ? `Next stop: ${next.walk_order}` : "Last stop";
  button.disabled = !next;

  wrap.append(button);
  return wrap;
}

function wireBottomNav(stopId) {
  dom.activeStop.querySelector("#cardNextBtn")?.addEventListener("click", () => {
    selectNextStopFrom(stopId);
  });
}

async function loadSelectedPhotoPreview(stopId) {
  const preview = document.querySelector("#photoWell");
  const meta = document.querySelector("#photoMeta");
  if (!preview || !meta) {
    return;
  }

  const record = state.storage.stops[stopId] || {};
  if (!record.has_photo || !state.photoDb) {
    preview.innerHTML = `<div class="photo-empty">No saved photo yet for this stop.</div>`;
    meta.textContent = record.photo_updated_at
      ? `Saved ${formatShortDate(record.photo_updated_at)}${record.photo_name ? ` • ${record.photo_name}` : ""}`
      : "No photo saved yet";
    return;
  }

  const nonce = ++state.photoLoadNonce;
  preview.innerHTML = `<div class="photo-empty">Loading saved photo...</div>`;
  const saved = await readPhotoRecord(stopId);
  if (!saved || nonce !== state.photoLoadNonce || state.selectedStopId !== stopId) {
    if (!saved && state.selectedStopId === stopId) {
      preview.innerHTML = `<div class="photo-empty">The photo record was not found. You can add it again.</div>`;
    }
    return;
  }

  const url = rememberPhotoUrl(stopId, saved.blob);
  preview.replaceChildren();
  const image = document.createElement("img");
  image.src = url;
  image.alt = `Saved scout photo for ${getBaseStop(stopId)?.title || "selected stop"}`;
  preview.append(image);
  meta.textContent = `Saved ${formatShortDate(saved.updatedAt)}${saved.name ? ` • ${saved.name}` : ""}`;
}

function ensureMap() {
  if (state.map) {
    return;
  }

  state.map = L.map(dom.kidMap, {
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
  if (!state.map) {
    return;
  }

  const fitBounds = Boolean(options.fitBounds);
  state.routeLayer.clearLayers();
  state.markerLayer.clearLayers();
  state.markersByStopId.clear();

  const start = state.atlas.collection.start_point;
  const stops = getStops().map(getMergedStop);
  const routePoints = [[start.latitude, start.longitude], ...stops.filter(hasCoords).map((stop) => [stop.latitude, stop.longitude])];

  L.marker([start.latitude, start.longitude], { icon: createStartIcon() })
    .bindPopup(`<strong>Start</strong><br>${escapeHtml(start.label)}`)
    .addTo(state.markerLayer);

  for (const stop of stops) {
    if (!hasCoords(stop)) {
      continue;
    }

    const marker = L.marker([stop.latitude, stop.longitude], {
      icon: createStopIcon(stop.walk_order, stop.id === state.selectedStopId, Boolean(stop.found_state), Boolean(stop.favorite)),
    })
      .bindPopup(`<strong>${escapeHtml(stop.title)}</strong><br>${escapeHtml(stop.location_hint)}`)
      .addTo(state.markerLayer);

    marker.on("click", () => selectStop(stop.id, { focusMap: false }));
    state.markersByStopId.set(stop.id, marker);
  }

  if (routePoints.length >= 2) {
    L.polyline(routePoints, {
      color: "#4f7042",
      weight: 4,
      opacity: 0.82,
      dashArray: "7 7",
    }).addTo(state.routeLayer);
  }

  if (state.currentPosition) {
    state.userMarker = L.marker([state.currentPosition.latitude, state.currentPosition.longitude], {
      icon: createUserIcon(),
    })
      .bindPopup("Your current position")
      .addTo(state.markerLayer);
  }

  if (routePoints.length > 0) {
    const bounds = L.latLngBounds(routePoints);
    if (fitBounds || !state.hasFitRoute) {
      state.map.fitBounds(bounds.pad(0.18), { padding: [20, 20] });
      state.hasFitRoute = true;
    }
  }

  focusSelectedStop(false);
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

function createStopIcon(order, selected, complete, favorite) {
  const classes = [
    "route-stop-marker",
    selected ? "is-selected" : "",
    complete ? "is-complete" : "",
    favorite ? "is-favorite" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return L.divIcon({
    className: "",
    html: `<div class="${classes}">${order}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
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
  updateDistanceLabels();
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
  const saved = state.storage.stops[stop.id] || {};
  if (!saved.visited_at) {
    saveStop(stop.id, { visited_at: new Date().toISOString() });
  }

  if (state.selectedStopId !== stop.id) {
    selectStop(stop.id, { focusMap: true });
    showToast(`Near stop ${stop.walk_order}: ${stop.title}`);
  }
}

function selectStop(stopId, options = {}) {
  state.selectedStopId = stopId;
  state.storage.lastSelectedStopId = stopId;
  persistStorage();
  renderProgress();
  renderStopRail();
  renderActiveStop();
  renderRouteMap({ fitBounds: false });

  if (options.focusMap) {
    focusSelectedStop(true);
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

  selectStop(next.id, { focusMap: true });
}

function exportNotes() {
  const exported = {
    exported_at: new Date().toISOString(),
    mode: "kid-scout",
    start_point: state.atlas.collection.start_point,
    note: "Photos stay on the device. This export includes photo metadata, not image blobs.",
    stops: getStops().map((stop) => ({
      id: stop.id,
      title: stop.title,
      walk_order: stop.walk_order,
      google_maps_address: stop.google_maps_address || "",
      kid_notes: {
        ...(state.storage.stops[stop.id] || {}),
      },
    })),
  };

  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bernal-kid-notes-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Exported the kid notes. Photos stay on this device.");
}

function saveStop(stopId, patch) {
  const previous = state.storage.stops[stopId] || {};
  const next = {
    found_state: "",
    favorite: false,
    habitat_tags: [],
    texture_tags: [],
    visited_at: "",
    has_photo: false,
    photo_name: "",
    photo_updated_at: "",
    ...previous,
    ...patch,
  };

  state.storage.stops[stopId] = next;
  state.storage.lastSelectedStopId = stopId;
  persistStorage();
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

function getBaseStop(stopId) {
  return getStops().find((stop) => stop.id === stopId) || null;
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
    found_state: "",
    favorite: false,
    habitat_tags: [],
    texture_tags: [],
    visited_at: "",
    has_photo: false,
    photo_name: "",
    photo_updated_at: "",
    ...saved,
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

async function openPhotoDb() {
  if (!("indexedDB" in window)) {
    throw new Error("IndexedDB is not available in this browser.");
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB_NAME, 1);
    request.onerror = () => reject(request.error || new Error("Could not open IndexedDB."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        db.createObjectStore(PHOTO_STORE_NAME, { keyPath: "stopId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function savePhotoForStop(stopId, file) {
  if (!state.photoDb) {
    throw new Error("Photo persistence is not available in this browser.");
  }

  const blob = await normalizeImageBlob(file);
  const record = {
    stopId,
    blob,
    name: file.name || "",
    updatedAt: new Date().toISOString(),
  };

  await new Promise((resolve, reject) => {
    const tx = state.photoDb.transaction(PHOTO_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not save photo."));
    tx.objectStore(PHOTO_STORE_NAME).put(record);
  });
}

async function readPhotoRecord(stopId) {
  if (!state.photoDb) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const tx = state.photoDb.transaction(PHOTO_STORE_NAME, "readonly");
    const request = tx.objectStore(PHOTO_STORE_NAME).get(stopId);
    request.onerror = () => reject(request.error || new Error("Could not load photo."));
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function deletePhotoForStop(stopId) {
  if (!state.photoDb) {
    return;
  }

  forgetPhotoUrl(stopId);

  await new Promise((resolve, reject) => {
    const tx = state.photoDb.transaction(PHOTO_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not delete photo."));
    tx.objectStore(PHOTO_STORE_NAME).delete(stopId);
  });
}

async function normalizeImageBlob(file) {
  if (!(file instanceof Blob) || !String(file.type || "").startsWith("image/")) {
    return file;
  }

  try {
    const image = await loadImage(file);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));

    if (scale >= 1 && file.size <= 1_800_000) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });

    return blob || file;
  } catch (error) {
    console.error("Image normalization failed", error);
    return file;
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });
}

function rememberPhotoUrl(stopId, blob) {
  forgetPhotoUrl(stopId);
  const url = URL.createObjectURL(blob);
  state.photoUrls.set(stopId, url);
  return url;
}

function forgetPhotoUrl(stopId) {
  const existing = state.photoUrls.get(stopId);
  if (existing) {
    URL.revokeObjectURL(existing);
    state.photoUrls.delete(stopId);
  }
}

function revokePhotoUrls() {
  for (const stopId of state.photoUrls.keys()) {
    forgetPhotoUrl(stopId);
  }
}

function createProgressCard(item) {
  const card = document.createElement("div");
  card.className = "progress-card";
  const value = document.createElement("strong");
  value.textContent = item.value;
  const label = document.createElement("span");
  label.textContent = item.label;
  card.append(value, label);
  return card;
}

function createMetaChip(text) {
  const chip = document.createElement("span");
  chip.className = "meta-chip";
  chip.textContent = text;
  return chip;
}

function createTinyMeta(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

function createStatusPill(text) {
  const pill = document.createElement("span");
  pill.className = "status-pill";
  pill.textContent = text;
  return pill;
}

function createInfoCard(label, value) {
  const card = document.createElement("div");
  card.className = "info-card";
  const heading = document.createElement("span");
  heading.className = "label";
  heading.textContent = label;
  const body = document.createElement("div");
  body.textContent = value;
  card.append(heading, body);
  return card;
}

function buildMapsLink(latitude, longitude, title) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(title || "Bernal stop");
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function formatShortDate(value) {
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, TOAST_MS);
}
