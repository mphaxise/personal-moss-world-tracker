const PUBLIC_CONTRIBUTOR_LABEL = "Anonymous contributor";
const MAP_DEFAULT_CENTER = [37.7749, -122.4194];
const MAP_DEFAULT_ZOOM = 12;

const state = {
  entries: [],
  map: null,
  markerLayer: null,
  activeView: "cards",
};

const dom = {
  entryForm: document.querySelector("#entryForm"),
  submitBtn: document.querySelector("#submitBtn"),
  formStatus: document.querySelector("#formStatus"),
  entryCount: document.querySelector("#entryCount"),
  cardsBtn: document.querySelector("#cardsBtn"),
  mapBtn: document.querySelector("#mapBtn"),
  cardsView: document.querySelector("#cardsView"),
  mapView: document.querySelector("#mapView"),
  cardsGrid: document.querySelector("#cardsGrid"),
  mapCanvas: document.querySelector("#mapCanvas"),
  missingLocationList: document.querySelector("#missingLocationList"),
};

boot();

async function boot() {
  wireEvents();
  await loadSeedEntries();
  render();
}

function wireEvents() {
  dom.entryForm.addEventListener("submit", handleSubmit);

  for (const button of [dom.cardsBtn, dom.mapBtn]) {
    button.addEventListener("click", () => switchView(button.dataset.view));
  }
}

async function loadSeedEntries() {
  try {
    const response = await fetch("./data/seed-entries.json");

    if (!response.ok) {
      throw new Error(`Failed to load seeds: ${response.status}`);
    }

    const rawEntries = await response.json();
    state.entries = rawEntries.map((entry) => normalizeEntry(entry));
  } catch (error) {
    dom.formStatus.textContent = "Could not load seed entries. You can still add new sightings.";
    console.error(error);
  }
}

function normalizeEntry(entry) {
  return {
    id: entry.id || createId(),
    title: (entry.title || "Untitled moss world").trim(),
    description: (entry.description || "").trim(),
    photo_url: entry.photo_url || "",
    captured_at: entry.captured_at || "",
    latitude: toOptionalNumber(entry.latitude),
    longitude: toOptionalNumber(entry.longitude),
    location_label: (entry.location_label || "Location not specified").trim(),
    created_at: entry.created_at || new Date().toISOString(),
    contributor_token: entry.contributor_token || createContributorToken(),
    inat_observation_id: entry.inat_observation_id || "",
    inat_summary: entry.inat_summary || "",
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  dom.formStatus.textContent = "";
  dom.submitBtn.disabled = true;

  try {
    const formData = new FormData(dom.entryForm);
    const title = String(formData.get("title") || "").trim();

    if (!title) {
      throw new Error("Title is required.");
    }

    const photoUrl = String(formData.get("photoUrl") || "").trim();
    const photoFile = formData.get("photoFile");
    const resolvedPhoto = await resolvePhoto(photoUrl, photoFile);

    if (!resolvedPhoto) {
      throw new Error("Provide a photo URL or upload a photo.");
    }

    const nextEntry = normalizeEntry({
      id: createId(),
      title,
      description: String(formData.get("description") || "").trim(),
      photo_url: resolvedPhoto,
      captured_at: String(formData.get("capturedAt") || "").trim(),
      latitude: parseCoordinate(formData.get("latitude")),
      longitude: parseCoordinate(formData.get("longitude")),
      location_label: String(formData.get("locationLabel") || "").trim() || "Location not specified",
      created_at: new Date().toISOString(),
      contributor_token: createContributorToken(),
      inat_observation_id: "",
      inat_summary: "",
    });

    state.entries.unshift(nextEntry);
    dom.entryForm.reset();
    switchView("cards");
    render();
    dom.formStatus.textContent = "Sighting added and shown publicly as anonymous.";
  } catch (error) {
    dom.formStatus.textContent = error.message;
  } finally {
    dom.submitBtn.disabled = false;
  }
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

function resolvePhoto(photoUrl, photoFile) {
  if (photoUrl) {
    return Promise.resolve(photoUrl);
  }

  if (!photoFile || !(photoFile instanceof File) || photoFile.size === 0) {
    return Promise.resolve("");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read uploaded image file."));
    reader.readAsDataURL(photoFile);
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
  dom.entryCount.textContent = `${state.entries.length} ${state.entries.length === 1 ? "entry" : "entries"}`;
  renderCards();

  if (state.activeView === "map") {
    ensureMap();
    syncMapMarkers();
  }

  renderMissingLocationList();
}

function renderCards() {
  dom.cardsGrid.replaceChildren();

  if (state.entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No sightings yet. Add the first anonymous moss world above.";
    dom.cardsGrid.append(empty);
    return;
  }

  for (const entry of state.entries) {
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

  const inatBlock = document.createElement("div");
  inatBlock.className = "inat-block";

  const enrichButton = document.createElement("button");
  enrichButton.type = "button";
  enrichButton.textContent = "Try iNaturalist enrichment";

  const status = document.createElement("p");
  status.className = "inat-status";
  status.textContent = entry.inat_summary || "No enrichment data yet.";

  enrichButton.addEventListener("click", async () => {
    enrichButton.disabled = true;
    status.textContent = "Looking up nearby iNaturalist observations...";

    try {
      const updated = await runINaturalistLookup(entry);
      Object.assign(entry, updated);
      status.textContent = entry.inat_summary;
      render();
    } catch (error) {
      status.textContent = `Lookup failed: ${error.message}`;
    } finally {
      enrichButton.disabled = false;
    }
  });

  inatBlock.append(enrichButton, status);

  card.append(image, title, description, location, contributor, capturedAt, inatBlock);
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
}

function syncMapMarkers() {
  if (!state.map || !state.markerLayer) {
    return;
  }

  state.markerLayer.clearLayers();

  const geoEntries = state.entries.filter((entry) => Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude));

  if (geoEntries.length === 0) {
    state.map.setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
    return;
  }

  const bounds = [];

  for (const entry of geoEntries) {
    const marker = window.L.marker([entry.latitude, entry.longitude]);
    marker.bindPopup(
      `<strong>${escapeHtml(entry.title)}</strong><br>${escapeHtml(entry.location_label)}<br>Submitted by: ${PUBLIC_CONTRIBUTOR_LABEL}`
    );
    marker.addTo(state.markerLayer);
    bounds.push([entry.latitude, entry.longitude]);
  }

  state.map.fitBounds(bounds, { padding: [28, 28] });
}

function renderMissingLocationList() {
  dom.missingLocationList.replaceChildren();
  const entriesWithoutCoordinates = state.entries.filter(
    (entry) => !Number.isFinite(entry.latitude) || !Number.isFinite(entry.longitude)
  );

  if (entriesWithoutCoordinates.length === 0) {
    const item = document.createElement("li");
    item.textContent = "All current entries have map coordinates.";
    dom.missingLocationList.append(item);
    return;
  }

  for (const entry of entriesWithoutCoordinates) {
    const item = document.createElement("li");
    item.textContent = `${entry.title} (${entry.location_label})`;
    dom.missingLocationList.append(item);
  }
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
    inat_observation_id: String(first.id || ""),
    inat_summary: `Closest iNaturalist match: ${scientificName} (${quality}), observed ${observedOn}.`,
  };
}

function buildINaturalistURL(entry) {
  const endpoint = new URL("https://api.inaturalist.org/v1/observations");
  endpoint.searchParams.set("per_page", "1");
  endpoint.searchParams.set("order", "desc");
  endpoint.searchParams.set("order_by", "created_at");

  if (Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude)) {
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

function createId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createContributorToken() {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return `anon-${values[0].toString(16)}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
