import {
  countCompletedCards,
  createExportPhotoDataUrl,
  createMetaChip,
  createProgressCard,
  defaultCardState,
  downloadJson,
  escapeAttribute,
  escapeHtml,
  fetchManifest,
  fetchPackFromManifest,
  formatShortDateTime,
  getFirstIncompleteCard,
  getNextCard,
  getRequestedPackId,
  isCardComplete,
  isChoiceCard,
  isPhotoCard,
  loadDeviceStorage,
  makePhotoKey,
  mergeCardState,
  openPhotoDb,
  persistDeviceStorage,
  readPhotoRecord,
  rememberLastPackId,
  resolvePackId,
  savePhotoRecord,
  sortedCards,
  uploadBundle,
  deletePhotoRecord,
} from "./challenge-core.js";

const ROLE = "kid";
const PHOTO_DB_NAME = "nature_challenge_kid_photos_v1";
const COLOR_OPTIONS = ["red", "orange", "yellow", "green", "blue", "purple", "white", "pink"];
const TOAST_MS = 3000;

const state = {
  manifest: null,
  packMeta: null,
  pack: null,
  storage: { cards: {} },
  selectedCardId: "",
  photoDb: null,
  toastTimer: 0,
};

const dom = {
  title: document.querySelector("#pageTitle"),
  heroText: document.querySelector("#heroText"),
  progressRow: document.querySelector("#progressRow"),
  packMeta: document.querySelector("#packMeta"),
  cardRail: document.querySelector("#cardRail"),
  activeCard: document.querySelector("#activeCard"),
  nextBtn: document.querySelector("#nextBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  uploadBtn: document.querySelector("#uploadBtn"),
  offlineBtn: document.querySelector("#offlineBtn"),
  pickerLink: document.querySelector("#pickerLink"),
  adultLink: document.querySelector("#adultLink"),
  atlasLink: document.querySelector("#atlasLink"),
  toast: document.querySelector("#toast"),
};

boot();

async function boot() {
  dom.nextBtn.addEventListener("click", selectNextCard);
  dom.exportBtn.addEventListener("click", exportNotes);
  dom.uploadBtn.addEventListener("click", uploadCurrentBundle);
  dom.offlineBtn.addEventListener("click", prepareOffline);

  try {
    state.photoDb = await openPhotoDb(PHOTO_DB_NAME);
  } catch (error) {
    console.error("Kid photo storage unavailable", error);
  }

  try {
    state.manifest = await fetchManifest();
    const packId = resolvePackId(state.manifest, getRequestedPackId());
    const loaded = await fetchPackFromManifest(state.manifest, packId);
    state.packMeta = loaded.meta;
    state.pack = loaded.pack;
    state.storage = loadDeviceStorage(ROLE, packId);
    state.selectedCardId = state.storage.lastSelectedCardId || getFirstIncompleteCard(state.pack, state.storage.cards)?.id || sortedCards(state.pack)[0]?.id || "";
    rememberLastPackId(packId);
    renderPage();
    showToast(
      state.photoDb
        ? "Kid mode is ready. Photos and choices save on this device."
        : "Kid mode is ready. Choices save on this device, but photo persistence is limited here."
    );
  } catch (error) {
    console.error(error);
    dom.heroText.textContent = `Could not load the challenge: ${error.message}`;
    showToast("Failed to load the challenge pack.");
  }
}

function renderPage() {
  dom.title.textContent = state.pack.pack.title;
  dom.heroText.textContent = `${state.pack.pack.summary} One photo or one choice at a time is enough.`;
  dom.pickerLink.href = `index.html?pack=${encodeURIComponent(state.pack.meta.id)}`;
  dom.adultLink.href = `collect.html?pack=${encodeURIComponent(state.pack.meta.id)}`;
  dom.atlasLink.href = "atlas.html";
  renderMeta();
  renderProgress();
  renderRail();
  renderActiveCard();
}

function renderMeta() {
  dom.packMeta.replaceChildren(
    createMetaChip(`${state.pack.pack.estimated_minutes} min`),
    createMetaChip(state.pack.pack.difficulty),
    createMetaChip(`ages ${state.pack.pack.age_band}`),
    createMetaChip(state.pack.pack.play_style)
  );
}

function renderProgress() {
  const completed = countCompletedCards(state.pack, state.storage.cards, {});
  const total = sortedCards(state.pack).length;
  const photos = Object.values(state.storage.cards).filter((card) => card.has_photo).length;
  const current = getSelectedCard();

  dom.progressRow.replaceChildren(
    createProgressCard("Done", `${completed}/${total}`),
    createProgressCard("Photos", String(photos)),
    createProgressCard("Current", current ? String(current.order) : "-")
  );
}

function renderRail() {
  dom.cardRail.replaceChildren(...sortedCards(state.pack).map(createCardPill));
}

function createCardPill(card) {
  const own = getOwnState(card.id);
  const complete = isCardComplete(card, own, null);
  const button = document.createElement("button");
  button.type = "button";
  button.className = ["card-pill", card.id === state.selectedCardId ? "is-selected" : "", complete ? "is-complete" : ""]
    .filter(Boolean)
    .join(" ");
  button.innerHTML = `
    <span class="pill-order">${card.order}</span>
    <span class="pill-text">${escapeHtml(card.title)}</span>
  `;
  button.addEventListener("click", () => {
    state.selectedCardId = card.id;
    state.storage.lastSelectedCardId = card.id;
    persistCurrentStorage();
    renderPage();
  });
  return button;
}

function renderActiveCard() {
  const card = getSelectedCard();
  dom.activeCard.replaceChildren();

  if (!card) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No card selected yet.";
    dom.activeCard.append(empty);
    return;
  }

  const own = getOwnState(card.id);
  const complete = isCardComplete(card, own, null);

  const wrap = document.createElement("div");
  wrap.className = "kid-card";
  wrap.innerHTML = `
    <div class="kid-card-head">
      <span class="active-order">${card.order}</span>
      <div>
        <h2>${escapeHtml(card.title)}</h2>
        <p>${escapeHtml(card.kid_prompt || card.prompt)}</p>
      </div>
    </div>
  `;

  const meta = document.createElement("div");
  meta.className = "meta-row";
  meta.append(
    createMetaChip(complete ? "done" : own.status || "pending"),
    createMetaChip(`${card.points} points`),
    ...(card.tags || []).slice(0, 3).map((tag) => createMetaChip(tag))
  );

  const content = document.createElement("div");
  content.className = "kid-card-content";
  if (isChoiceCard(card)) {
    content.append(createChoiceButtons(card, own));
  }
  if (isPhotoCard(card)) {
    content.append(createKidPhotoBlock(card, own));
  }
  content.append(createKidActions(card));

  wrap.append(meta, content);
  dom.activeCard.append(wrap);
}

function createChoiceButtons(card, own) {
  const wrap = document.createElement("section");
  wrap.className = "choice-grid";
  const options = Array.isArray(card.options) && card.options.length ? card.options : COLOR_OPTIONS;
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["choice-pill", own.choice === option ? "is-selected" : ""].filter(Boolean).join(" ");
    button.dataset.color = String(option).toLowerCase();
    button.textContent = option;
    button.addEventListener("click", () => {
      saveOwnState(card.id, {
        choice: option,
        status: "done",
        completed_at: new Date().toISOString(),
      });
      renderPage();
      showToast(`Saved ${option}.`);
    });
    wrap.append(button);
  }
  return wrap;
}

function createKidPhotoBlock(card, own) {
  const wrap = document.createElement("section");
  wrap.className = "kid-photo-block";

  const helper = document.createElement("p");
  helper.className = "field-note";
  helper.textContent = own.has_photo ? `Saved ${own.photo_name || "photo"} ${own.photo_updated_at ? formatShortDateTime(own.photo_updated_at) : ""}.` : "Take one photo for this card.";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  input.className = "photo-upload";
  input.id = `kid-photo-${card.id}`;

  const buttonRow = document.createElement("div");
  buttonRow.className = "action-row compact-actions";

  const addButton = document.createElement("label");
  addButton.className = "primary-btn kid-primary";
  addButton.htmlFor = input.id;
  addButton.textContent = own.has_photo ? "Retake photo" : "Snap photo";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "ghost-btn";
  removeButton.textContent = "Clear photo";
  removeButton.disabled = !own.has_photo;
  removeButton.addEventListener("click", async () => {
    try {
      await deletePhotoRecord(state.photoDb, makePhotoKey(state.pack.meta.id, ROLE, card.id));
      saveOwnState(card.id, {
        has_photo: false,
        photo_name: "",
        photo_updated_at: "",
        status: own.choice ? "done" : "",
      });
      renderPage();
      showToast("Removed the photo.");
    } catch (error) {
      console.error(error);
      showToast(`Could not remove the photo: ${error.message}`);
    }
  });
  buttonRow.append(addButton, removeButton);

  const preview = document.createElement("div");
  preview.className = "photo-preview";
  loadPreview(preview, card.id, own.has_photo);

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const record = await savePhotoRecord(state.photoDb, makePhotoKey(state.pack.meta.id, ROLE, card.id), file);
      saveOwnState(card.id, {
        has_photo: true,
        photo_name: file.name || "",
        photo_updated_at: record.updatedAt,
        status: "done",
        completed_at: record.updatedAt,
      });
      renderPage();
      showToast("Saved the photo.");
    } catch (error) {
      console.error(error);
      showToast(`Could not save the photo: ${error.message}`);
    } finally {
      input.value = "";
    }
  });

  wrap.append(helper, input, buttonRow, preview);
  return wrap;
}

async function loadPreview(container, cardId, hasPhoto) {
  container.replaceChildren();
  if (!hasPhoto) {
    return;
  }
  const photoRecord = await readPhotoRecord(state.photoDb, makePhotoKey(state.pack.meta.id, ROLE, cardId));
  if (!photoRecord?.dataUrl) {
    return;
  }
  const image = document.createElement("img");
  image.src = photoRecord.dataUrl;
  image.alt = "Saved kid challenge photo";
  container.append(image);
}

function createKidActions(card) {
  const row = document.createElement("div");
  row.className = "action-row";

  const skipButton = document.createElement("button");
  skipButton.type = "button";
  skipButton.className = "ghost-btn";
  skipButton.textContent = "Maybe later";
  skipButton.addEventListener("click", () => {
    saveOwnState(card.id, { status: "skipped" });
    renderPage();
    showToast("Skipped for now.");
  });

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "ghost-btn";
  resetButton.textContent = "Start over";
  resetButton.addEventListener("click", async () => {
    try {
      await deletePhotoRecord(state.photoDb, makePhotoKey(state.pack.meta.id, ROLE, card.id));
    } catch (error) {
      console.error(error);
    }
    state.storage.cards[card.id] = defaultCardState();
    persistCurrentStorage();
    renderPage();
    showToast("Card reset.");
  });

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "primary-btn";
  nextButton.textContent = "Show next card";
  nextButton.addEventListener("click", () => selectNextCardFrom(card.id));

  row.append(skipButton, resetButton, nextButton);
  return row;
}

function getSelectedCard() {
  return sortedCards(state.pack).find((card) => card.id === state.selectedCardId) || null;
}

function getOwnState(cardId) {
  return mergeCardState(defaultCardState(), state.storage.cards[cardId]);
}

function saveOwnState(cardId, patch) {
  const previous = state.storage.cards[cardId] || defaultCardState();
  state.storage.cards[cardId] = mergeCardState(previous, patch);
  state.storage.lastSelectedCardId = cardId;
  state.selectedCardId = cardId;
  persistCurrentStorage();
}

function persistCurrentStorage() {
  persistDeviceStorage(ROLE, state.pack.meta.id, state.storage);
}

function selectNextCard() {
  selectNextCardFrom(state.selectedCardId);
}

function selectNextCardFrom(cardId) {
  const next = getNextCard(state.pack, cardId) || getFirstIncompleteCard(state.pack, state.storage.cards);
  if (!next) {
    showToast("You finished the challenge.");
    return;
  }
  state.selectedCardId = next.id;
  state.storage.lastSelectedCardId = next.id;
  persistCurrentStorage();
  renderPage();
}

async function exportNotes() {
  try {
    const payload = await buildKidExportPayload();
    const filename = `${state.pack.meta.slug}-kid-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJson(filename, payload);
    showToast("Exported kid notes.");
  } catch (error) {
    console.error(error);
    showToast(`Could not export the kid notes: ${error.message}`);
  }
}

async function buildKidExportPayload() {
  const cards = [];
  for (const card of sortedCards(state.pack)) {
    const own = getOwnState(card.id);
    const exportedKid = { ...own, photo_export_data_url: "" };
    if (own.has_photo) {
      const photoRecord = await readPhotoRecord(state.photoDb, makePhotoKey(state.pack.meta.id, ROLE, card.id));
      exportedKid.photo_export_data_url = photoRecord?.dataUrl || (await createExportPhotoDataUrl(photoRecord));
    }
    cards.push({
      id: card.id,
      title: card.title,
      assigned_to: card.assigned_to,
      kid_response: exportedKid,
    });
  }

  return {
    exported_at: new Date().toISOString(),
    mode: "kid-challenge",
    device_label: "kid-ipad",
    participant_role: ROLE,
    pack_id: state.pack.meta.id,
    pack_title: state.pack.pack.title,
    cards,
  };
}

async function uploadCurrentBundle() {
  try {
    const payload = await buildKidExportPayload();
    const result = await uploadBundle(payload);
    showToast(`Uploaded to laptop as ${result.filename}.`);
  } catch (error) {
    console.error(error);
    showToast(`Could not upload to the laptop: ${error.message}`);
  }
}

async function prepareOffline() {
  try {
    const additionalUrls = [
      `/content/challenges/manifest.json`,
      state.pack.meta.path,
      `/collect.html?pack=${encodeURIComponent(state.pack.meta.id)}`,
      `/kid-collect.html?pack=${encodeURIComponent(state.pack.meta.id)}`,
    ];
    const result = await window.mossOffline?.prepare(additionalUrls);
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

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, TOAST_MS);
}
