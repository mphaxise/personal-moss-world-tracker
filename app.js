const API_BASE = "/api";
const STORAGE_KEY = "moss_tracker_entries_v2";
const PUBLIC_CONTRIBUTOR_LABEL = "Anonymous contributor";
const MAP_DEFAULT_CENTER = [37.7749, -122.4194];
const MAP_DEFAULT_ZOOM = 12;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1800;

const state = {
  entries: [],
  visibleEntries: [],
  map: null,
  markerLayer: null,
  userLayer: null,
  markerByEntryId: new Map(),
  activeView: "cards",
  apiOnline: false,
  userLocation: null,
  filters: {
    query: "",
    sort: "ranked",
    coordsOnly: false,
    inatOnly: false,
    nearbyOnly: false,
    nearbyRadiusKm: 3,
  },
};

const dom = {
  entryForm: document.querySelector("#entryForm"),
  submitBtn: document.querySelector("#submitBtn"),
  formStatus: document.querySelector("#formStatus"),
  browseStatus: document.querySelector("#browseStatus"),
  entryCount: document.querySelector("#entryCount"),
  dataModeBadge: document.querySelector("#dataModeBadge"),
  cardsBtn: document.querySelector("#cardsBtn"),
  mapBtn: document.querySelector("#mapBtn"),
  cardsView: document.querySelector("#cardsView"),
  mapView: document.querySelector("#mapView"),
  cardsGrid: document.querySelector("#cardsGrid"),
  mapCanvas: document.querySelector("#mapCanvas"),
  missingLocationList: document.querySelector("#missingLocationList"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  coordsOnly: document.querySelector("#coordsOnly"),
  inatOnly: document.querySelector("#inatOnly"),
  nearbyOnly: document.querySelector("#nearbyOnly"),
  radiusSelect: document.querySelector("#radiusSelect"),
  centerMeBtn: document.querySelector("#centerMeBtn"),
  fitBoundsBtn: document.querySelector("#fitBoundsBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  importBtn: document.querySelector("#importBtn"),
  importFileInput: document.querySelector("#importFileInput"),
};

boot();

async function boot() {
  wireEvents();
  await initializeData();
  render();
}

function wireEvents() {
  dom.entryForm.addEventListener("submit", handleSubmit);

  for (const button of [dom.cardsBtn, dom.mapBtn]) {
    button.addEventListener("click", () => switchView(button.dataset.view));
  }

  dom.searchInput.addEventListener("input", () => {
    state.filters.query = sanitizeUserText(dom.searchInput.value, 100).toLowerCase();
    render();
  });

  dom.sortSelect.addEventListener("change", () => {
    state.filters.sort = dom.sortSelect.value;
    render();
  });

  dom.coordsOnly.addEventListener("change", () => {
    state.filters.coordsOnly = dom.coordsOnly.checked;
    render();
  });

  dom.inatOnly.addEventListener("change", () => {
    state.filters.inatOnly = dom.inatOnly.checked;
    render();
  });

  dom.nearbyOnly.addEventListener("change", () => {
    state.filters.nearbyOnly = dom.nearbyOnly.checked;
    render();
  });

  dom.radiusSelect.addEventListener("change", () => {
    state.filters.nearbyRadiusKm = Number(dom.radiusSelect.value);
    render();
  });

  dom.centerMeBtn.addEventListener("click", centerOnUser);
  dom.fitBoundsBtn.addEventListener("click", fitMapToVisibleEntries);
  dom.exportBtn.addEventListener("click", exportEntriesJson);
  dom.importBtn.addEventListener("click", () => dom.importFileInput.click());
  dom.importFileInput.addEventListener("change", handleImportEntries);
}

async function initializeData() {
  state.apiOnline = await probeApi();

  if (state.apiOnline) {
    setDataModeBadge("Data mode: online API + SQLite");
    await refreshEntriesFromApi();
    persistEntriesToLocal();
    return;
  }

  setDataModeBadge("Data mode: offline local cache");
  const cached = loadEntriesFromLocal();

  if (cached.length > 0) {
    state.entries = cached;
    return;
  }

  const seeded = await loadSeedEntries();
  state.entries = seeded;
  persistEntriesToLocal();
}

async function probeApi() {
  try {
    const response = await fetch(`${API_BASE}/health`, { headers: { Accept: "application/json" } });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function refreshEntriesFromApi() {
  const response = await fetch(`${API_BASE}/entries`, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Failed to load API entries (${response.status})`);
  }

  const payload = await response.json();
  const rawEntries = Array.isArray(payload.entries) ? payload.entries : [];
  state.entries = dedupeEntries(rawEntries.map((entry) => normalizeEntry(entry)));
}

async function loadSeedEntries() {
  try {
    const response = await fetch("./data/seed-entries.json", { headers: { Accept: "application/json" } });

    if (!response.ok) {
      throw new Error(`Failed to load seeds: ${response.status}`);
    }

    const rawEntries = await response.json();
    return dedupeEntries(rawEntries.map((entry) => normalizeEntry(entry)));
  } catch (error) {
    setBrowseStatus("Could not load seed entries.");
    console.error(error);
    return [];
  }
}

function normalizeEntry(entry) {
  return {
    id: String(entry.id || createId()),
    title: sanitizeUserText(entry.title || "Untitled moss world", 90),
    description: sanitizeUserText(entry.description || "", 240),
    photo_url: sanitizePhotoUrl(String(entry.photo_url || "")),
    captured_at: sanitizeDate(entry.captured_at),
    latitude: roundCoordinate(toOptionalNumber(entry.latitude), 4),
    longitude: roundCoordinate(toOptionalNumber(entry.longitude), 4),
    location_label: sanitizeUserText(entry.location_label || "Location not specified", 120),
    created_at: sanitizeDateTime(entry.created_at),
    contributor_token: String(entry.contributor_token || createContributorToken()),
    inat_observation_id: sanitizeUserText(entry.inat_observation_id || "", 40),
    inat_summary: sanitizeUserText(entry.inat_summary || "", 200),
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  dom.formStatus.textContent = "";
  dom.submitBtn.disabled = true;

  try {
    const formData = new FormData(dom.entryForm);
    const title = sanitizeUserText(formData.get("title") || "", 90);

    if (!title) {
      throw new Error("Title is required.");
    }

    const description = sanitizeUserText(formData.get("description") || "", 240);
    const locationLabel = sanitizeUserText(formData.get("locationLabel") || "", 120) || "Location not specified";
    const capturedAt = sanitizeDate(formData.get("capturedAt") || "");
    const latitude = clampCoordinate(parseCoordinate(formData.get("latitude")), -90, 90);
    const longitude = clampCoordinate(parseCoordinate(formData.get("longitude")), -180, 180);
    const photoUrl = String(formData.get("photoUrl") || "").trim();
    const photoFile = formData.get("photoFile");
    const resolvedPhoto = await resolvePhoto(photoUrl, photoFile);

    if (!resolvedPhoto) {
      throw new Error("Provide a photo URL or upload a photo.");
    }

    const payload = {
      title,
      description,
      photo_url: resolvedPhoto,
      captured_at: capturedAt,
      latitude,
      longitude,
      location_label: locationLabel,
    };

    let created;

    if (state.apiOnline) {
      created = await createEntryViaApi(payload);
    } else {
      created = normalizeEntry({
        ...payload,
        id: createId(),
        created_at: new Date().toISOString(),
        contributor_token: createContributorToken(),
      });
    }

    state.entries = dedupeEntries([created, ...state.entries]);
    persistEntriesToLocal();
    dom.entryForm.reset();
    dom.nearbyOnly.checked = false;
    state.filters.nearbyOnly = false;
    switchView("cards");
    render();
    dom.formStatus.textContent = "Sighting added and shown publicly as anonymous.";
  } catch (error) {
    dom.formStatus.textContent = error.message;
  } finally {
    dom.submitBtn.disabled = false;
  }
}

async function createEntryViaApi(payload) {
  const response = await fetch(`${API_BASE}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to save entry (${response.status})`);
  }

  const result = await response.json();
  return normalizeEntry(result.entry || payload);
}

async function updateEnrichmentViaApi(entry) {
  if (!state.apiOnline) {
    return;
  }

  await fetch(`${API_BASE}/entries/${encodeURIComponent(entry.id)}/enrichment`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      inat_observation_id: entry.inat_observation_id,
      inat_summary: entry.inat_summary,
    }),
  });
}

function parseCoordinate(value) {
  return toOptionalNumber(value);
}

function toOptionalNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampCoordinate(value, min, max) {
  if (!Number.isFinite(value)) {
    return null;
  }

  if (value < min || value > max) {
    return null;
  }

  return roundCoordinate(value, 4);
}

function roundCoordinate(value, decimals) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function resolvePhoto(photoUrl, photoFile) {
  if (photoUrl) {
    const sanitized = sanitizePhotoUrl(photoUrl);

    if (!sanitized) {
      throw new Error("Photo URL must be HTTP(S). Upload a file for local images.");
    }

    return sanitized;
  }

  if (!photoFile || !(photoFile instanceof File) || photoFile.size === 0) {
    return "";
  }

  return sanitizeImageUpload(photoFile);
}

async function sanitizeImageUpload(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Uploaded file must be an image.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large. Use files under 8MB.");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);

  const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image processing is unavailable in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

  // Re-encoding strips most file metadata from uploaded images.
  return canvas.toDataURL("image/jpeg", 0.86);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read uploaded image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to process uploaded image."));
    image.src = src;
  });
}

function switchView(view) {
  state.activeView = view;

  const showCards = view === "cards";
  dom.cardsView.classList.toggle("is-hidden", !showCards);
  dom.mapView.classList.toggle("is-hidden", showCards);
  dom.cardsView.setAttribute("aria-hidden", String(!showCards));
  dom.mapView.setAttribute("aria-hidden", String(showCards));

  dom.cardsBtn.classList.toggle("is-active", showCards);
  dom.mapBtn.classList.toggle("is-active", !showCards);
  dom.cardsBtn.setAttribute("aria-selected", String(showCards));
  dom.mapBtn.setAttribute("aria-selected", String(!showCards));

  if (!showCards) {
    ensureMap();
    syncMapMarkers();
  }
}

function render() {
  state.visibleEntries = sortEntries(applyFilters(state.entries));

  dom.entryCount.textContent = `${state.visibleEntries.length}/${state.entries.length} visible`;
  renderCards();

  if (state.activeView === "map") {
    ensureMap();
    syncMapMarkers();
  }

  renderMissingLocationList();
}

function applyFilters(entries) {
  return entries.filter((entry) => {
    if (state.filters.query) {
      const haystack = `${entry.title} ${entry.description} ${entry.location_label}`.toLowerCase();
      if (!haystack.includes(state.filters.query)) {
        return false;
      }
    }

    if (state.filters.coordsOnly && !hasCoordinates(entry)) {
      return false;
    }

    if (state.filters.inatOnly && !entry.inat_summary) {
      return false;
    }

    if (state.filters.nearbyOnly) {
      const distance = getDistanceFromUserKm(entry);
      if (!Number.isFinite(distance) || distance > state.filters.nearbyRadiusKm) {
        return false;
      }
    }

    return true;
  });
}

function sortEntries(entries) {
  const cloned = [...entries];

  if (state.filters.sort === "newest") {
    return cloned.sort((a, b) => toTimeMs(b.created_at) - toTimeMs(a.created_at));
  }

  if (state.filters.sort === "nearest") {
    return cloned.sort((a, b) => {
      const da = getDistanceFromUserKm(a);
      const db = getDistanceFromUserKm(b);

      if (Number.isFinite(da) && Number.isFinite(db)) {
        return da - db;
      }

      if (Number.isFinite(da)) {
        return -1;
      }

      if (Number.isFinite(db)) {
        return 1;
      }

      return toTimeMs(b.created_at) - toTimeMs(a.created_at);
    });
  }

  return cloned.sort((a, b) => computeRankScore(b) - computeRankScore(a));
}

function computeRankScore(entry) {
  const ageDays = Math.max(0, (Date.now() - toTimeMs(entry.created_at)) / 86_400_000);
  const recencyScore = Math.max(0, 1 - ageDays / 30);
  const distanceKm = getDistanceFromUserKm(entry);
  const proximityScore = Number.isFinite(distanceKm) ? Math.max(0, 1 - distanceKm / 10) : 0.22;
  const inatBonus = entry.inat_summary ? 0.12 : 0;
  const coordinateBonus = hasCoordinates(entry) ? 0.08 : 0;
  return recencyScore * 0.58 + proximityScore * 0.25 + inatBonus + coordinateBonus;
}

function toTimeMs(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasCoordinates(entry) {
  return Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude);
}

function renderCards() {
  dom.cardsGrid.replaceChildren();

  if (state.visibleEntries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No entries match your current filters.";
    dom.cardsGrid.append(empty);
    return;
  }

  for (const entry of state.visibleEntries) {
    dom.cardsGrid.append(createCard(entry));
  }
}

function createCard(entry) {
  const card = document.createElement("article");
  card.className = "card";

  const image = document.createElement("img");
  image.src = entry.photo_url;
  image.alt = `${entry.title} photo`;
  image.loading = "lazy";

  const title = document.createElement("h3");
  title.textContent = entry.title;

  const description = document.createElement("p");
  description.textContent = entry.description || "No description provided.";

  const location = document.createElement("p");
  location.className = "meta";
  location.textContent = `Location: ${entry.location_label}`;

  const contributor = document.createElement("p");
  contributor.className = "meta";
  contributor.textContent = `Submitted by: ${PUBLIC_CONTRIBUTOR_LABEL}`;

  const capturedAt = document.createElement("p");
  capturedAt.className = "meta";
  capturedAt.textContent = entry.captured_at
    ? `Captured: ${entry.captured_at}`
    : "Captured date not provided";

  const distance = getDistanceFromUserKm(entry);
  const distanceMeta = document.createElement("p");
  distanceMeta.className = "meta";
  distanceMeta.textContent = Number.isFinite(distance)
    ? `Distance from you: ${distance.toFixed(2)} km`
    : "Distance from you: unavailable";

  const inatStatus = document.createElement("p");
  inatStatus.className = "inat-status";
  inatStatus.textContent = entry.inat_summary || "No enrichment data yet.";

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const enrichButton = document.createElement("button");
  enrichButton.type = "button";
  enrichButton.textContent = "Try iNaturalist enrichment";

  enrichButton.addEventListener("click", async () => {
    enrichButton.disabled = true;
    inatStatus.textContent = "Looking up nearby iNaturalist observations...";

    try {
      const updated = await runINaturalistLookup(entry);
      Object.assign(entry, updated);
      await updateEnrichmentViaApi(entry);
      persistEntriesToLocal();
      inatStatus.textContent = entry.inat_summary || "No enrichment data yet.";
      render();
    } catch (error) {
      inatStatus.textContent = `Lookup failed: ${error.message}`;
    } finally {
      enrichButton.disabled = false;
    }
  });

  actions.append(enrichButton);

  if (hasCoordinates(entry)) {
    const mapButton = document.createElement("button");
    mapButton.type = "button";
    mapButton.textContent = "Show on map";
    mapButton.addEventListener("click", () => {
      switchView("map");
      focusEntryOnMap(entry.id);
    });
    actions.append(mapButton);
  }

  card.append(image, title, description, location, contributor, capturedAt, distanceMeta, actions, inatStatus);
  return card;
}

function ensureMap() {
  if (state.map || typeof window.L === "undefined") {
    return;
  }

  state.map = window.L.map(dom.mapCanvas).setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(state.map);

  state.markerLayer = window.L.layerGroup().addTo(state.map);
  state.userLayer = window.L.layerGroup().addTo(state.map);
}

function syncMapMarkers() {
  if (!state.map || !state.markerLayer) {
    return;
  }

  state.markerLayer.clearLayers();
  state.userLayer.clearLayers();
  state.markerByEntryId.clear();

  const geoEntries = state.visibleEntries.filter((entry) => hasCoordinates(entry));

  if (geoEntries.length === 0) {
    state.map.setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
  } else {
    const bounds = [];

    for (const entry of geoEntries) {
      const marker = window.L.marker([entry.latitude, entry.longitude]);
      const distance = getDistanceFromUserKm(entry);
      const distanceLine = Number.isFinite(distance) ? `<br>${distance.toFixed(2)} km from you` : "";

      marker.bindPopup(
        `<strong>${escapeHtml(entry.title)}</strong><br>${escapeHtml(entry.location_label)}<br>Submitted by: ${PUBLIC_CONTRIBUTOR_LABEL}${distanceLine}`
      );
      marker.addTo(state.markerLayer);
      state.markerByEntryId.set(entry.id, marker);
      bounds.push([entry.latitude, entry.longitude]);
    }

    state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }

  if (state.userLocation) {
    const userMarker = window.L.circleMarker([state.userLocation.lat, state.userLocation.lng], {
      radius: 7,
      color: "#21422f",
      fillColor: "#c5dc8a",
      fillOpacity: 0.95,
      weight: 2,
    });

    userMarker.bindPopup("Your location");
    userMarker.addTo(state.userLayer);
  }
}

function focusEntryOnMap(entryId) {
  const marker = state.markerByEntryId.get(entryId);

  if (!marker || !state.map) {
    return;
  }

  const latLng = marker.getLatLng();
  state.map.setView(latLng, Math.max(state.map.getZoom(), 15));
  marker.openPopup();
}

function renderMissingLocationList() {
  dom.missingLocationList.replaceChildren();
  const entriesWithoutCoordinates = state.visibleEntries.filter((entry) => !hasCoordinates(entry));

  if (entriesWithoutCoordinates.length === 0) {
    const item = document.createElement("li");
    item.textContent = "All filtered entries have map coordinates.";
    dom.missingLocationList.append(item);
    return;
  }

  for (const entry of entriesWithoutCoordinates) {
    const item = document.createElement("li");
    item.textContent = `${entry.title} (${entry.location_label})`;
    dom.missingLocationList.append(item);
  }
}

async function centerOnUser() {
  try {
    const coords = await getCurrentPosition();
    state.userLocation = {
      lat: roundCoordinate(coords.latitude, 4),
      lng: roundCoordinate(coords.longitude, 4),
    };
    setBrowseStatus("Using your location for nearby ranking/filtering.");
    render();
    switchView("map");

    if (state.map) {
      state.map.setView([state.userLocation.lat, state.userLocation.lng], 14);
    }
  } catch (error) {
    setBrowseStatus(error.message);
  }
}

function getCurrentPosition() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Geolocation is unavailable in this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error("Location permission denied or unavailable.")),
      { enableHighAccuracy: true, timeout: 8_000 }
    );
  });
}

function fitMapToVisibleEntries() {
  if (!state.map) {
    switchView("map");
  }

  const coords = state.visibleEntries.filter(hasCoordinates).map((entry) => [entry.latitude, entry.longitude]);

  if (coords.length === 0) {
    setBrowseStatus("No filtered entries with coordinates to fit.");
    return;
  }

  state.map.fitBounds(coords, { padding: [30, 30], maxZoom: 15 });
  setBrowseStatus("Map fit to filtered entries.");
}

function getDistanceFromUserKm(entry) {
  if (!state.userLocation || !hasCoordinates(entry)) {
    return NaN;
  }

  return haversineDistanceKm(state.userLocation.lat, state.userLocation.lng, entry.latitude, entry.longitude);
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

async function handleImportEntries(event) {
  const file = event.target.files?.[0];
  dom.importFileInput.value = "";

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const payload = JSON.parse(text);

    if (!Array.isArray(payload)) {
      throw new Error("Import file must be a JSON array of entries.");
    }

    const imported = payload
      .map((item) => normalizeEntry(item))
      .filter((entry) => Boolean(entry.photo_url) && Boolean(entry.title));

    if (imported.length === 0) {
      throw new Error("No valid entries found in import file.");
    }

    if (state.apiOnline) {
      await importEntriesViaApi(imported);
      await refreshEntriesFromApi();
    } else {
      state.entries = dedupeEntries([...imported, ...state.entries]);
    }

    persistEntriesToLocal();
    render();
    setBrowseStatus(`Imported ${imported.length} entries.`);
  } catch (error) {
    setBrowseStatus(`Import failed: ${error.message}`);
  }
}

async function importEntriesViaApi(entries) {
  const payload = entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    photo_url: entry.photo_url,
    captured_at: entry.captured_at,
    latitude: entry.latitude,
    longitude: entry.longitude,
    location_label: entry.location_label,
    created_at: entry.created_at,
  }));

  const response = await fetch(`${API_BASE}/entries/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ entries: payload }),
  });

  if (!response.ok) {
    throw new Error(`API import failed (${response.status})`);
  }
}

function exportEntriesJson() {
  const data = JSON.stringify(state.entries, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `moss-entries-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setBrowseStatus("Exported current entries as JSON.");
}

function persistEntriesToLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
  } catch (_error) {
    setBrowseStatus("Local storage is full or unavailable.");
  }
}

function loadEntriesFromLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return dedupeEntries(parsed.map((entry) => normalizeEntry(entry)));
  } catch (_error) {
    return [];
  }
}

function dedupeEntries(entries) {
  const seen = new Set();
  const deduped = [];

  for (const entry of entries) {
    const key = entry.id || fingerprintEntry(entry);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

function fingerprintEntry(entry) {
  return [entry.title, entry.captured_at || "", entry.location_label || ""].join("|").toLowerCase();
}

function sanitizeUserText(input, maxLength) {
  const text = String(input || "");
  const withoutTags = text.replace(/[<>]/g, "");
  const redactedEmail = withoutTags.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[redacted-email]");
  const redactedPhone = redactedEmail.replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, "[redacted-phone]");
  const normalized = redactedPhone.replace(/\s+/g, " ").trim();
  return normalized.slice(0, maxLength);
}

function sanitizePhotoUrl(rawUrl) {
  const value = String(rawUrl || "").trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("data:image/")) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch (_error) {
    return "";
  }

  return "";
}

function sanitizeDate(rawDate) {
  const value = String(rawDate || "").trim();

  if (!value) {
    return "";
  }

  const match = value.match(/^\d{4}-\d{2}-\d{2}$/);
  return match ? value : "";
}

function sanitizeDateTime(rawDateTime) {
  const value = String(rawDateTime || "").trim();

  if (!value) {
    return new Date().toISOString();
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

async function runINaturalistLookup(entry) {
  const url = buildINaturalistURL(entry);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`iNaturalist request returned ${response.status}`);
  }

  const payload = await response.json();
  const first = payload?.results?.[0];

  if (!first) {
    return {
      inat_observation_id: "",
      inat_summary: "No close iNaturalist observation found for this entry.",
    };
  }

  const scientificName = first?.taxon?.name || "Unknown taxon";
  const quality = first?.quality_grade || "unknown grade";
  const observedOn = first?.observed_on_string || first?.observed_on || "date unavailable";

  return {
    inat_observation_id: sanitizeUserText(String(first.id || ""), 40),
    inat_summary: sanitizeUserText(
      `Closest iNaturalist match: ${scientificName} (${quality}), observed ${observedOn}.`,
      200
    ),
  };
}

function buildINaturalistURL(entry) {
  const endpoint = new URL("https://api.inaturalist.org/v1/observations");
  endpoint.searchParams.set("per_page", "1");
  endpoint.searchParams.set("order", "desc");
  endpoint.searchParams.set("order_by", "created_at");

  if (hasCoordinates(entry)) {
    endpoint.searchParams.set("lat", String(entry.latitude));
    endpoint.searchParams.set("lng", String(entry.longitude));
    endpoint.searchParams.set("radius", "2");
  } else {
    endpoint.searchParams.set("q", entry.title);
    if (entry.location_label && entry.location_label !== "Location not specified") {
      endpoint.searchParams.set("place_guess", entry.location_label);
    }
  }

  return endpoint.toString();
}

function setDataModeBadge(text) {
  dom.dataModeBadge.textContent = text;
}

function setBrowseStatus(text) {
  dom.browseStatus.textContent = text;
}

function createId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createContributorToken() {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return `anon-${values[0].toString(16)}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
