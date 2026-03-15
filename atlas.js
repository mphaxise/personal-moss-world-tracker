const CONTENT_URL = "./content/bernal-heights-atlas.json";
const DEFAULT_CENTER = [37.7417, -122.4142];
const DEFAULT_ZOOM = 14;
const TOAST_MS = 2800;

const state = {
  atlas: null,
  selectedStopId: null,
  map: null,
  markerLayer: null,
  markersByStopId: new Map(),
  toastTimer: 0,
};

const dom = {
  heroEyebrow: document.querySelector("#heroEyebrow"),
  atlasTitle: document.querySelector("#atlasTitle"),
  atlasDeck: document.querySelector("#atlasDeck"),
  heroFacts: document.querySelector("#heroFacts"),
  neighborhoodSummary: document.querySelector("#neighborhoodSummary"),
  neighborhoodWhyHere: document.querySelector("#neighborhoodWhyHere"),
  coverCard: document.querySelector("#coverCard"),
  walkTitle: document.querySelector("#walkTitle"),
  walkStats: document.querySelector("#walkStats"),
  walkNarrative: document.querySelector("#walkNarrative"),
  walkStatusBadge: document.querySelector("#walkStatusBadge"),
  walkMap: document.querySelector("#walkMap"),
  mapNote: document.querySelector("#mapNote"),
  stopList: document.querySelector("#stopList"),
  stopDetail: document.querySelector("#stopDetail"),
  loadStatus: document.querySelector("#loadStatus"),
};

boot();

async function boot() {
  window.addEventListener("hashchange", syncSelectionFromHash);

  try {
    state.atlas = await fetchAtlas();
    state.selectedStopId = deriveInitialStopId();
    renderAtlas();
    showToast("Bernal atlas shell loaded from the candidate content scaffold.");
  } catch (error) {
    console.error(error);
    renderLoadError(error);
    showToast("Could not load the Bernal atlas content file.");
  }
}

async function fetchAtlas() {
  const response = await fetch(CONTENT_URL, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Failed to load atlas content (${response.status})`);
  }

  const payload = await response.json();
  validateAtlas(payload);
  return payload;
}

function validateAtlas(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Atlas payload must be an object.");
  }

  if (!payload.meta || !payload.neighborhood || !payload.walk || !Array.isArray(payload.stops)) {
    throw new Error("Atlas payload is missing required top-level sections.");
  }

  for (const field of ["title", "season", "updated_at"]) {
    if (!payload.meta[field]) {
      throw new Error(`Atlas meta is missing '${field}'.`);
    }
  }

  if (payload.stops.length === 0) {
    throw new Error("Atlas must contain at least one stop.");
  }

  const requiredStopFields = [
    "id",
    "slug",
    "title",
    "walk_order",
    "location_hint",
    "hero_image",
    "short_summary",
    "why_here",
    "habitat_type",
    "seasonality",
    "species_notes",
    "source_ids",
    "status",
  ];

  for (const stop of payload.stops) {
    for (const field of requiredStopFields) {
      if (!(field in stop)) {
        throw new Error(`Stop '${stop.id || "unknown"}' is missing '${field}'.`);
      }
    }
  }
}

function deriveInitialStopId() {
  const stops = getStops();
  const hashStop = decodeStopSlugFromHash();

  if (hashStop) {
    const match = stops.find((stop) => stop.slug === hashStop);
    if (match) {
      return match.id;
    }
  }

  return stops[0]?.id || null;
}

function syncSelectionFromHash() {
  const slug = decodeStopSlugFromHash();
  if (!slug) {
    return;
  }

  const stop = getStops().find((item) => item.slug === slug);
  if (!stop || stop.id === state.selectedStopId) {
    return;
  }

  state.selectedStopId = stop.id;
  renderStops();
  syncMapMarkers();
}

function decodeStopSlugFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    return "";
  }

  const params = new URLSearchParams(hash);
  return params.get("stop") || "";
}

function renderAtlas() {
  const { meta, neighborhood, walk } = state.atlas;
  document.title = meta.title;

  dom.heroEyebrow.textContent = `${neighborhood.name}, San Francisco`;
  dom.atlasTitle.textContent = meta.title;
  dom.atlasDeck.textContent = `${neighborhood.summary} This first shell keeps every stop visible while fieldwork upgrades candidate data into field-verified atlas cards.`;

  dom.neighborhoodSummary.textContent = neighborhood.summary;
  dom.neighborhoodWhyHere.textContent = neighborhood.why_here;
  dom.coverCard.replaceChildren(
    createVisualCard({
      title: neighborhood.name,
      label: `${meta.season} chapter`,
      note: neighborhood.cover_image_status === "needed"
        ? "Cover image still needed. Use the first strong Bernal view you find on the walk."
        : "Neighborhood cover image",
      imagePath: neighborhood.cover_image,
      assetStatus: neighborhood.cover_image_status,
      compact: false,
    })
  );

  dom.walkTitle.textContent = walk.title;
  dom.walkNarrative.textContent = `${walk.title} is designed as a neighborhood-scale reading of Bernal: start with built surfaces, move through stairs and retaining edges, then open into exposed textures before landing back in everyday street life.`;
  dom.walkStatusBadge.textContent = formatStatus(walk.status || meta.content_status || "candidate");
  dom.walkStatusBadge.className = `status-badge ${statusClassName(walk.status || meta.content_status || "candidate")}`;

  renderHeroFacts();
  renderWalkStats();
  renderStops();
  ensureMap();
  syncMapMarkers();
}

function renderHeroFacts() {
  const stops = getStops();
  const counts = countByStatus(stops);
  const facts = [
    { value: `${stops.length}`, label: "candidate stops" },
    { value: `${counts["field-verified"] || 0}`, label: "field-verified" },
    { value: state.atlas.meta.season, label: "editorial season" },
    { value: `${state.atlas.walk.duration_minutes} min`, label: "target walk" },
  ];

  dom.heroFacts.replaceChildren(...facts.map(createFactCard));
}

function renderWalkStats() {
  const walk = state.atlas.walk;
  const stats = [
    { label: "Distance", value: `${walk.distance_miles} miles` },
    { label: "Duration", value: `${walk.duration_minutes} minutes` },
    { label: "Terrain", value: walk.terrain },
    { label: "Route status", value: formatStatus(walk.status) },
  ];

  dom.walkStats.replaceChildren(...stats.map(createStatCard));
}

function renderStops() {
  const stops = getStops();

  dom.stopList.replaceChildren(...stops.map((stop) => createStopListItem(stop, stop.id === state.selectedStopId)));
  renderStopDetail(getSelectedStop());
}

function createStopListItem(stop, isActive) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = `stop-card${isActive ? " is-active" : ""}`;
  button.addEventListener("click", () => selectStop(stop.id, { updateHash: true, focusMap: true }));

  const head = document.createElement("div");
  head.className = "stop-card-head";

  const order = document.createElement("span");
  order.className = "stop-order";
  order.textContent = String(stop.walk_order);

  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "stop-card-title";
  title.textContent = stop.title;

  const meta = document.createElement("div");
  meta.className = "stop-card-meta";
  meta.append(
    createStatusBadge(stop.status),
    createMetaPill(stop.habitat_type),
    createMetaPill(hasCoords(stop) ? "mapped" : "coords pending")
  );

  titleWrap.append(title, meta);
  head.append(order, titleWrap);

  const body = document.createElement("div");
  body.className = "stop-card-body";

  const summary = document.createElement("p");
  summary.className = "stop-card-copy";
  summary.textContent = stop.short_summary;

  const location = document.createElement("p");
  location.className = "stop-meta";
  location.textContent = stop.location_hint;

  body.append(summary, location);
  button.append(head, body);
  item.append(button);
  return item;
}

function renderStopDetail(stop) {
  dom.stopDetail.replaceChildren();

  if (!stop) {
    return;
  }

  const detailHead = document.createElement("div");
  detailHead.className = "stop-detail-head";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "detail-title";
  title.textContent = `${stop.walk_order}. ${stop.title}`;
  const location = document.createElement("p");
  location.className = "stop-meta";
  location.textContent = stop.location_hint;
  titleWrap.append(title, location);

  detailHead.append(titleWrap, createStatusBadge(stop.status));

  const visual = createVisualCard({
    title: stop.title,
    label: stop.habitat_type,
    note: stop.asset_status === "needed"
      ? "Hero image still needed from fieldwork."
      : stop.short_summary,
    imagePath: stop.hero_image,
    assetStatus: stop.asset_status,
    compact: true,
  });
  visual.classList.add("stop-visual");

  const detailCopy = document.createElement("div");
  detailCopy.className = "detail-copy-block";
  detailCopy.append(
    createDetailSection("What is happening here", stop.short_summary),
    createDetailSection("Why this spot matters", stop.why_here),
    createDetailSection("Seasonality", stop.seasonality),
    createDetailSection("Species notes", stop.species_notes),
    createDetailListSection("Source notes", stop.source_ids.map(resolveSourceLabel)),
    createDetailListSection("Current blockers", buildStopBlockers(stop))
  );

  const actions = document.createElement("div");
  actions.className = "detail-actions";

  const docsLink = document.createElement("a");
  docsLink.href = "docs/bernal-field-worksheet.md";
  docsLink.textContent = "Open field worksheet";

  const nav = document.createElement("div");
  nav.className = "detail-nav";

  const previous = document.createElement("button");
  previous.type = "button";
  previous.textContent = "Previous stop";
  previous.disabled = stop.walk_order === 1;
  previous.addEventListener("click", () => selectRelativeStop(-1));

  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "Next stop";
  next.disabled = stop.walk_order === getStops().length;
  next.addEventListener("click", () => selectRelativeStop(1));

  nav.append(previous, next);
  actions.append(docsLink, nav);

  dom.stopDetail.append(detailHead, visual, detailCopy, actions);
}

function createDetailSection(titleText, bodyText) {
  const section = document.createElement("section");
  section.className = "detail-section";
  const title = document.createElement("h3");
  title.textContent = titleText;
  const body = document.createElement("p");
  body.textContent = bodyText;
  section.append(title, body);
  return section;
}

function createDetailListSection(titleText, items) {
  const section = document.createElement("section");
  section.className = "detail-section";
  const title = document.createElement("h3");
  title.textContent = titleText;

  const list = document.createElement("ul");
  list.className = "detail-list";

  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }

  section.append(title, list);
  return section;
}

function buildStopBlockers(stop) {
  const blockers = [];
  if (!hasCoords(stop)) {
    blockers.push("Coordinates still need field verification.");
  }
  if (stop.asset_status === "needed") {
    blockers.push("Hero image has not been captured yet.");
  }
  if (stop.status === "candidate") {
    blockers.push("Story still needs a real publish / hold / drop call in the field.");
  }
  return blockers;
}

function createVisualCard({ title, label, note, imagePath, assetStatus, compact }) {
  const wrap = document.createElement("div");
  wrap.className = compact ? "visual-fallback compact" : "visual-fallback";

  if (assetStatus && assetStatus !== "needed" && imagePath) {
    const img = document.createElement("img");
    img.className = "visual-image";
    img.alt = title;
    img.src = imagePath;
    img.addEventListener("error", () => {
      img.replaceWith(buildVisualFallback(title, label, note, compact));
    }, { once: true });
    wrap.replaceWith?.(img);
    return img;
  }

  return buildVisualFallback(title, label, note, compact);
}

function buildVisualFallback(title, label, note, compact) {
  const fallback = document.createElement("div");
  fallback.className = compact ? "visual-fallback compact" : "visual-fallback";

  const labelNode = document.createElement("p");
  labelNode.className = "visual-label";
  labelNode.textContent = label;

  const titleNode = document.createElement("h3");
  titleNode.className = "visual-title";
  titleNode.textContent = title;

  const noteNode = document.createElement("p");
  noteNode.className = "visual-note";
  noteNode.textContent = note;

  fallback.append(labelNode, titleNode, noteNode);
  return fallback;
}

function createFactCard(fact) {
  const card = document.createElement("div");
  card.className = "fact-card";
  const value = document.createElement("div");
  value.className = "fact-value";
  value.textContent = fact.value;
  const label = document.createElement("div");
  label.className = "fact-label";
  label.textContent = fact.label;
  card.append(value, label);
  return card;
}

function createStatCard(stat) {
  const card = document.createElement("div");
  card.className = "stat-card";
  const label = document.createElement("span");
  label.className = "stat-label";
  label.textContent = stat.label;
  const value = document.createElement("span");
  value.className = "stat-value";
  value.textContent = stat.value;
  card.append(label, value);
  return card;
}

function createStatusBadge(status) {
  const badge = document.createElement("span");
  badge.className = `status-badge ${statusClassName(status)}`;
  badge.textContent = formatStatus(status);
  return badge;
}

function createMetaPill(text) {
  const pill = document.createElement("span");
  pill.className = "status-badge";
  pill.textContent = text;
  return pill;
}

function selectStop(stopId, { updateHash, focusMap }) {
  if (stopId === state.selectedStopId) {
    if (focusMap) {
      focusSelectedStop();
    }
    return;
  }

  state.selectedStopId = stopId;
  if (updateHash) {
    const stop = getSelectedStop();
    if (stop) {
      window.location.hash = `stop=${encodeURIComponent(stop.slug)}`;
    }
  }

  renderStops();
  syncMapMarkers();

  if (focusMap) {
    focusSelectedStop();
  }
}

function selectRelativeStop(direction) {
  const stops = getStops();
  const currentIndex = stops.findIndex((stop) => stop.id === state.selectedStopId);
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= stops.length) {
    return;
  }
  selectStop(stops[nextIndex].id, { updateHash: true, focusMap: true });
}

function ensureMap() {
  if (state.map || !dom.walkMap) {
    return;
  }

  state.map = L.map(dom.walkMap, {
    zoomControl: false,
    scrollWheelZoom: false,
  });

  L.control.zoom({ position: "topright" }).addTo(state.map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(state.map);

  state.markerLayer = L.layerGroup().addTo(state.map);
  state.map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
}

function syncMapMarkers() {
  if (!state.map || !state.markerLayer) {
    return;
  }

  state.markerLayer.clearLayers();
  state.markersByStopId.clear();

  const mappedStops = getStops().filter(hasCoords);
  if (mappedStops.length === 0) {
    dom.mapNote.textContent = "Coordinates are still pending field verification. The map is centered on Bernal so the shell is ready as soon as the walk gets real stop positions.";
    state.map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    return;
  }

  const bounds = [];

  for (const stop of mappedStops) {
    const marker = L.marker([stop.latitude, stop.longitude], {
      icon: createStopIcon(stop.walk_order, stop.id === state.selectedStopId),
    });

    marker.bindPopup(`<strong>${escapeHtml(stop.title)}</strong><br>${escapeHtml(stop.location_hint)}`);
    marker.on("click", () => selectStop(stop.id, { updateHash: true, focusMap: false }));
    marker.addTo(state.markerLayer);

    state.markersByStopId.set(stop.id, marker);
    bounds.push([stop.latitude, stop.longitude]);
  }

  dom.mapNote.textContent = `${mappedStops.length} stop${mappedStops.length === 1 ? "" : "s"} currently mapped. Remaining stops will appear as field verification fills in coordinates.`;

  if (bounds.length > 0) {
    state.map.fitBounds(bounds, { padding: [28, 28] });
  }

  focusSelectedStop(false);
}

function createStopIcon(order, isSelected) {
  return L.divIcon({
    className: "",
    html: `<div class="stop-marker${isSelected ? " is-selected" : ""}">${order}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

function focusSelectedStop(openPopup = true) {
  const stop = getSelectedStop();
  if (!stop || !hasCoords(stop) || !state.map) {
    return;
  }

  state.map.flyTo([stop.latitude, stop.longitude], Math.max(state.map.getZoom(), 15), {
    duration: 0.55,
  });

  const marker = state.markersByStopId.get(stop.id);
  if (marker && openPopup) {
    marker.openPopup();
  }
}

function getStops() {
  return [...(state.atlas?.stops || [])].sort((a, b) => a.walk_order - b.walk_order);
}

function getSelectedStop() {
  return getStops().find((stop) => stop.id === state.selectedStopId) || null;
}

function hasCoords(stop) {
  return Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude);
}

function resolveSourceLabel(sourceId) {
  const source = (state.atlas?.sources || []).find((item) => item.id === sourceId);
  if (!source) {
    return sourceId;
  }
  return `${source.title} (${source.type})`;
}

function countByStatus(stops) {
  return stops.reduce((acc, stop) => {
    acc[stop.status] = (acc[stop.status] || 0) + 1;
    return acc;
  }, {});
}

function formatStatus(status) {
  return String(status || "unknown").replace(/-/g, " ");
}

function statusClassName(status) {
  return `status-${String(status || "unknown")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  if (!dom.loadStatus) {
    return;
  }

  dom.loadStatus.textContent = message;
  dom.loadStatus.classList.add("is-visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    dom.loadStatus.classList.remove("is-visible");
  }, TOAST_MS);
}

function renderLoadError(error) {
  dom.atlasDeck.textContent = "The Bernal atlas content could not be loaded.";
  dom.heroFacts.replaceChildren(createFactCard({ value: "load error", label: "check content/bernal-heights-atlas.json" }));
  dom.neighborhoodSummary.textContent = "The static shell is in place, but the content file did not validate.";
  dom.neighborhoodWhyHere.textContent = error.message;
  dom.coverCard.replaceChildren(buildVisualFallback("Content load failed", "debug", error.message, false));
  dom.walkStats.replaceChildren(createStatCard({ label: "Error", value: error.message }));
  dom.stopList.replaceChildren();
  dom.stopDetail.replaceChildren();
  dom.mapNote.textContent = "Map unavailable until content loads.";
}
