import {
  countCompletedCards,
  createExportPhotoDataUrl,
  createMetaChip,
  createProgressCard,
  currentDateTimeLocal,
  defaultCardState,
  downloadJson,
  escapeAttribute,
  escapeHtml,
  fetchManifest,
  fetchPackFromManifest,
  formatShortDateTime,
  getCardById,
  getFirstIncompleteCard,
  getNextCard,
  getRequestedPackId,
  isCardComplete,
  isChoiceCard,
  isPhotoCard,
  loadDeviceStorage,
  makeRoleLabel,
  makePhotoKey,
  mergeCardState,
  openPhotoDb,
  persistDeviceStorage,
  readPhotoRecord,
  rememberLastPackId,
  resolvePackId,
  savePhotoRecord,
  sortedCards,
  sumBaseScore,
  uploadBundle,
  deletePhotoRecord,
} from "./challenge-core.js";

const ROLE = "adult";
const PHOTO_DB_NAME = "nature_challenge_adult_photos_v1";
const COLOR_OPTIONS = ["red", "orange", "yellow", "green", "blue", "purple", "white", "pink"];
const TOAST_MS = 2800;

const state = {
  manifest: null,
  packMeta: null,
  pack: null,
  storage: { cards: {} },
  kidImport: { cards: {}, importedAt: "", exportedAt: "" },
  selectedCardId: "",
  photoDb: null,
  toastTimer: 0,
};

const dom = {
  title: document.querySelector("#pageTitle"),
  heroText: document.querySelector("#heroText"),
  progressRow: document.querySelector("#progressRow"),
  packMeta: document.querySelector("#packMeta"),
  recap: document.querySelector("#recapPanel"),
  cardList: document.querySelector("#cardList"),
  nextBtn: document.querySelector("#nextBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  uploadBtn: document.querySelector("#uploadBtn"),
  importKidBtn: document.querySelector("#importKidBtn"),
  kidImportInput: document.querySelector("#kidImportInput"),
  offlineBtn: document.querySelector("#offlineBtn"),
  pickerLink: document.querySelector("#pickerLink"),
  kidLink: document.querySelector("#kidLink"),
  atlasLink: document.querySelector("#atlasLink"),
  toast: document.querySelector("#toast"),
};

boot();

async function boot() {
  dom.nextBtn.addEventListener("click", selectNextCard);
  dom.exportBtn.addEventListener("click", exportNotes);
  dom.uploadBtn.addEventListener("click", uploadCurrentBundle);
  dom.importKidBtn.addEventListener("click", () => dom.kidImportInput.click());
  dom.kidImportInput.addEventListener("change", handleKidImport);
  dom.offlineBtn.addEventListener("click", prepareOffline);

  try {
    state.photoDb = await openPhotoDb(PHOTO_DB_NAME);
  } catch (error) {
    console.error("Adult photo storage unavailable", error);
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
        ? "Adult challenge mode is ready. Edits and photos save on this device."
        : "Adult challenge mode is ready. Edits save on this device, but photo persistence is limited here."
    );
  } catch (error) {
    console.error(error);
    dom.heroText.textContent = `Could not load the challenge pack: ${error.message}`;
    showToast("Failed to load the challenge pack.");
  }
}

function renderPage() {
  const pack = state.pack;
  dom.title.textContent = pack.pack.title;
  dom.heroText.textContent = `${pack.pack.summary} Use this on the phone, and use kid mode on the iPad if you want a paired walk.`;
  dom.kidLink.href = `kid-collect.html?pack=${encodeURIComponent(pack.meta.id)}`;
  dom.pickerLink.href = `index.html?pack=${encodeURIComponent(pack.meta.id)}`;
  dom.atlasLink.href = "atlas.html";
  renderPackMeta();
  renderProgress();
  renderRecap();
  renderCards();
}

function renderPackMeta() {
  dom.packMeta.replaceChildren(
    createMetaChip(`${state.pack.pack.estimated_minutes} min`),
    createMetaChip(state.pack.pack.difficulty),
    createMetaChip(`ages ${state.pack.pack.age_band}`),
    createMetaChip(state.pack.pack.play_style)
  );
}

function renderProgress() {
  const completed = countCompletedCards(state.pack, state.storage.cards, state.kidImport.cards);
  const total = sortedCards(state.pack).length;
  const ownPhotos = Object.values(state.storage.cards).filter((card) => card.has_photo).length;
  const kidCompleted = countCompletedCards(state.pack, state.kidImport.cards, {});
  const score = sumBaseScore(state.pack, state.storage.cards, state.kidImport.cards);

  dom.progressRow.replaceChildren(
    createProgressCard("Done", `${completed}/${total}`),
    createProgressCard("Base score", String(score)),
    createProgressCard("Adult photos", String(ownPhotos)),
    createProgressCard("Kid cards", String(kidCompleted))
  );
}

function renderRecap() {
  const cards = sortedCards(state.pack);
  const completed = cards.filter((card) => isCardComplete(card, state.storage.cards[card.id], state.kidImport.cards[card.id]));
  dom.recap.replaceChildren();

  const head = document.createElement("div");
  head.className = "section-head compact-head";
  const label = document.createElement("p");
  label.className = "section-label";
  label.textContent = "Recap";
  const title = document.createElement("h2");
  title.textContent = state.pack.recap.title;
  head.append(label, title);

  const message = document.createElement("p");
  message.className = "sidebar-note";
  if (completed.length === 0) {
    message.textContent = state.pack.recap.empty_message;
  } else if (completed.length === cards.length) {
    message.textContent = state.pack.recap.success_message;
  } else {
    message.textContent = state.pack.recap.partial_message;
  }

  const bonusList = document.createElement("div");
  bonusList.className = "meta-row";
  for (const rule of state.pack.rules.bonus_rules || []) {
    bonusList.append(createMetaChip(rule));
  }

  const recapGrid = document.createElement("div");
  recapGrid.className = "recap-grid";
  for (const card of cards) {
    const own = state.storage.cards[card.id] || defaultCardState();
    const kid = state.kidImport.cards[card.id] || defaultCardState();
    recapGrid.append(createRecapCard(card, own, kid));
  }

  dom.recap.append(head, message, bonusList, recapGrid);
}

function createRecapCard(card, own, kid) {
  const article = document.createElement("article");
  article.className = `recap-card ${isCardComplete(card, own, kid) ? "is-done" : ""}`;

  const title = document.createElement("h3");
  title.textContent = card.title;
  const status = document.createElement("p");
  status.className = "recap-status";
  status.textContent = isCardComplete(card, own, kid) ? `Complete for ${card.points} points` : "Not complete yet";

  const meta = document.createElement("div");
  meta.className = "meta-row";
  if (own.status === "done") {
    meta.append(createMetaChip(`adult ${own.choice || "done"}`));
  }
  if (kid.status === "done") {
    meta.append(createMetaChip(`kid ${kid.choice || "done"}`));
  }
  if (meta.childNodes.length === 0) {
    meta.append(createMetaChip("pending"));
  }

  const previewRow = document.createElement("div");
  previewRow.className = "recap-photo-row";
  if (own.photo_data_url) {
    previewRow.append(createRecapPhoto("Adult", own.photo_data_url));
  }
  if (kid.photo_data_url) {
    previewRow.append(createRecapPhoto("Kid", kid.photo_data_url));
  }

  article.append(title, status, meta, previewRow);
  return article;
}

function createRecapPhoto(labelText, src) {
  const wrap = document.createElement("figure");
  wrap.className = "recap-photo";
  const image = document.createElement("img");
  image.src = src;
  image.alt = `${labelText} challenge photo`;
  const caption = document.createElement("figcaption");
  caption.textContent = labelText;
  wrap.append(image, caption);
  return wrap;
}

function renderCards() {
  dom.cardList.replaceChildren(...sortedCards(state.pack).map((card) => createCardPanel(card)));
}

function createCardPanel(card) {
  const own = getOwnState(card.id);
  const kid = state.kidImport.cards[card.id] || defaultCardState();
  const complete = isCardComplete(card, own, kid);

  const details = document.createElement("details");
  details.className = "challenge-card";
  details.open = card.id === state.selectedCardId;
  details.dataset.cardId = card.id;
  details.addEventListener("toggle", () => {
    if (details.open) {
      state.selectedCardId = card.id;
      state.storage.lastSelectedCardId = card.id;
      persistCurrentStorage();
    }
  });

  const summary = document.createElement("summary");
  summary.innerHTML = `
    <div class="summary-grid">
      <div class="summary-top">
        <div>
          <div><span class="stop-index">${card.order}</span> <strong>${escapeHtml(card.title)}</strong></div>
          <div class="stop-distance">${escapeHtml(card.prompt)}</div>
        </div>
        <span class="status-chip ${statusClassName(complete ? "done" : own.status || kid.status || "pending")}">${complete ? "done" : own.status || kid.status || "pending"}</span>
      </div>
    </div>
  `;

  const body = document.createElement("div");
  body.className = "challenge-body";

  const promptBlock = document.createElement("section");
  promptBlock.className = "card-copy";
  promptBlock.innerHTML = `
    <p class="card-prompt">${escapeHtml(card.prompt)}</p>
    ${card.kid_prompt ? `<p class="card-subprompt"><strong>Kid:</strong> ${escapeHtml(card.kid_prompt)}</p>` : ""}
    ${card.adult_prompt ? `<p class="card-subprompt"><strong>Adult:</strong> ${escapeHtml(card.adult_prompt)}</p>` : ""}
  `;

  const meta = document.createElement("div");
  meta.className = "meta-row";
  meta.append(
    createMetaChip(`assigned ${card.assigned_to}`),
    createMetaChip(`${card.points} points`),
    ...(card.tags || []).slice(0, 4).map((tag) => createMetaChip(tag))
  );
  promptBlock.append(meta);

  const helper = document.createElement("p");
  helper.className = "field-note";
  helper.textContent = isPhotoCard(card)
    ? "Take one reference photo for this challenge card."
    : isChoiceCard(card)
      ? "Pick one option to mark this card complete."
      : "Mark this card when you have completed it.";
  promptBlock.append(helper);

  const content = document.createElement("div");
  content.className = "challenge-controls";
  if (isChoiceCard(card)) {
    content.append(createChoiceBlock(card, own));
  }
  if (isPhotoCard(card)) {
    content.append(createPhotoBlock(card, own));
  }
  content.append(createAdultNoteBlock(card, own));
  content.append(createImportedKidBlock(kid));
  content.append(createActionRow(card));

  body.append(promptBlock, content);
  details.append(summary, body);
  return details;
}

function createChoiceBlock(card, own) {
  const wrap = document.createElement("section");
  wrap.className = "control-block";
  const label = document.createElement("label");
  label.className = "field-block";
  const heading = document.createElement("span");
  heading.textContent = "Selected option";
  const select = document.createElement("select");
  select.name = `choice-${card.id}`;
  const options = Array.isArray(card.options) && card.options.length ? card.options : COLOR_OPTIONS;
  select.innerHTML = `<option value="">Choose one</option>${options
    .map((option) => `<option value="${escapeAttribute(option)}">${escapeHtml(option)}</option>`)
    .join("")}`;
  select.value = own.choice || "";
  select.addEventListener("change", () => {
    const choice = select.value;
    saveOwnState(card.id, {
      choice,
      status: choice ? "done" : "",
      completed_at: choice ? new Date().toISOString() : "",
    });
    renderPage();
    if (choice) {
      showToast(`Saved ${choice} for ${card.title}.`);
    }
  });
  label.append(heading, select);
  wrap.append(label);
  return wrap;
}

function createPhotoBlock(card, own) {
  const wrap = document.createElement("section");
  wrap.className = "control-block photo-block";
  const helper = document.createElement("p");
  helper.className = "field-note";
  helper.textContent = own.has_photo ? `Saved ${own.photo_name || "photo"} ${own.photo_updated_at ? formatShortDateTime(own.photo_updated_at) : ""}.` : "No photo saved yet.";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.capture = "environment";
  fileInput.className = "photo-upload";
  fileInput.id = `photo-${card.id}`;

  const buttonRow = document.createElement("div");
  buttonRow.className = "action-row compact-actions";
  const addButton = document.createElement("label");
  addButton.className = "primary-btn";
  addButton.htmlFor = fileInput.id;
  addButton.textContent = own.has_photo ? "Replace photo" : "Take photo";
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "ghost-btn";
  removeButton.textContent = "Remove photo";
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
      showToast(`Removed the photo for ${card.title}.`);
    } catch (error) {
      console.error(error);
      showToast(`Could not remove the photo: ${error.message}`);
    }
  });
  buttonRow.append(addButton, removeButton);

  const preview = document.createElement("div");
  preview.className = "photo-preview";
  loadPreview(preview, card.id, own.has_photo, ROLE);

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
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
      showToast(`Saved a photo for ${card.title}.`);
    } catch (error) {
      console.error(error);
      showToast(`Could not save the photo: ${error.message}`);
    } finally {
      fileInput.value = "";
    }
  });

  wrap.append(helper, fileInput, buttonRow, preview);
  return wrap;
}

function createAdultNoteBlock(card, own) {
  const wrap = document.createElement("section");
  wrap.className = "control-block";
  const label = document.createElement("label");
  label.className = "field-block";
  const heading = document.createElement("span");
  heading.textContent = "Adult note";
  const textarea = document.createElement("textarea");
  textarea.placeholder = "Optional context or reminder";
  textarea.value = own.note || "";
  textarea.addEventListener("change", () => {
    saveOwnState(card.id, { note: textarea.value.trim() });
    renderRecap();
  });
  label.append(heading, textarea);
  wrap.append(label);
  return wrap;
}

function createImportedKidBlock(kid) {
  const wrap = document.createElement("section");
  wrap.className = "control-block imported-block";
  const heading = document.createElement("p");
  heading.className = "field-note";
  if (!kid || (!kid.status && !kid.photo_data_url && !kid.choice)) {
    heading.textContent = "No kid handoff imported for this card yet.";
    wrap.append(heading);
    return wrap;
  }

  heading.textContent = `Kid handoff: ${kid.choice || kid.status || "done"}${kid.completed_at ? ` on ${formatShortDateTime(kid.completed_at)}` : ""}.`;
  wrap.append(heading);
  if (kid.photo_data_url) {
    const preview = document.createElement("div");
    preview.className = "photo-preview";
    const image = document.createElement("img");
    image.src = kid.photo_data_url;
    image.alt = "Kid imported photo";
    preview.append(image);
    wrap.append(preview);
  }
  return wrap;
}

function createActionRow(card) {
  const row = document.createElement("div");
  row.className = "action-row";

  const skipButton = document.createElement("button");
  skipButton.type = "button";
  skipButton.className = "ghost-btn";
  skipButton.textContent = "Skip for now";
  skipButton.addEventListener("click", () => {
    saveOwnState(card.id, { status: "skipped" });
    renderPage();
    showToast(`Skipped ${card.title} for now.`);
  });

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "ghost-btn";
  resetButton.textContent = "Reset card";
  resetButton.addEventListener("click", async () => {
    try {
      await deletePhotoRecord(state.photoDb, makePhotoKey(state.pack.meta.id, ROLE, card.id));
    } catch (error) {
      console.error(error);
    }
    state.storage.cards[card.id] = defaultCardState();
    persistCurrentStorage();
    renderPage();
    showToast(`Reset ${card.title}.`);
  });

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "primary-btn";
  nextButton.textContent = "Next card";
  nextButton.addEventListener("click", () => selectNextCardFrom(card.id));

  row.append(skipButton, resetButton, nextButton);
  return row;
}

async function loadPreview(container, cardId, hasPhoto, role) {
  container.replaceChildren();
  if (!hasPhoto) {
    return;
  }
  const photoRecord = await readPhotoRecord(state.photoDb, makePhotoKey(state.pack.meta.id, role, cardId));
  if (!photoRecord?.dataUrl) {
    return;
  }
  const image = document.createElement("img");
  image.src = photoRecord.dataUrl;
  image.alt = "Saved challenge photo";
  container.append(image);
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
  const next = getNextCard(state.pack, cardId) || getFirstIncompleteCard(state.pack, state.storage.cards, state.kidImport.cards);
  if (!next) {
    showToast("No more cards in this challenge.");
    return;
  }
  state.selectedCardId = next.id;
  state.storage.lastSelectedCardId = next.id;
  persistCurrentStorage();
  renderCards();
}

async function exportNotes() {
  try {
    showToast("Preparing the adult export...");
    const payload = await buildAdultExportPayload();
    const filename = `${state.pack.meta.slug}-adult-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJson(filename, payload);
    showToast("Exported the adult challenge bundle.");
  } catch (error) {
    console.error(error);
    showToast(`Could not export notes: ${error.message}`);
  }
}

async function buildAdultExportPayload() {
  const cards = [];
  for (const card of sortedCards(state.pack)) {
    const own = getOwnState(card.id);
    const kid = state.kidImport.cards[card.id] || defaultCardState();
    const exportedAdult = { ...own, photo_export_data_url: "" };
    if (own.has_photo) {
      const photoRecord = await readPhotoRecord(state.photoDb, makePhotoKey(state.pack.meta.id, ROLE, card.id));
      exportedAdult.photo_export_data_url = photoRecord?.dataUrl || (await createExportPhotoDataUrl(photoRecord));
    }
    cards.push({
      id: card.id,
      title: card.title,
      assigned_to: card.assigned_to,
      points: card.points,
      adult_response: exportedAdult,
      kid_imported_response: kid,
    });
  }

  return {
    exported_at: new Date().toISOString(),
    mode: Object.keys(state.kidImport.cards).length ? "adult-challenge-merged" : "adult-challenge",
    device_label: "adult-phone",
    participant_role: ROLE,
    pack_id: state.pack.meta.id,
    pack_title: state.pack.pack.title,
    cards,
  };
}

async function uploadCurrentBundle() {
  try {
    const payload = await buildAdultExportPayload();
    const result = await uploadBundle(payload);
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
    showToast(`Imported kid handoff for ${Object.keys(imported.cards).length} cards.`);
  } catch (error) {
    console.error(error);
    showToast(`Could not import the kid export: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function normalizeKidImportPayload(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.cards)) {
    throw new Error("Kid export must be a JSON object with a cards array.");
  }
  if (String(payload.pack_id || "") !== state.pack.meta.id) {
    throw new Error("This kid export belongs to a different challenge pack.");
  }

  const cards = {};
  for (const item of payload.cards) {
    const cardId = String(item?.id || "");
    if (!getCardById(state.pack, cardId)) {
      continue;
    }
    const response = normalizeImportedCardState(item.kid_response || {});
    if (response.status || response.choice || response.photo_data_url || response.note) {
      cards[cardId] = response;
    }
  }

  return {
    cards,
    importedAt: new Date().toISOString(),
    exportedAt: String(payload.exported_at || ""),
  };
}

function normalizeImportedCardState(value) {
  return {
    ...defaultCardState(),
    status: sanitizeShortText(value.status),
    choice: sanitizeShortText(value.choice),
    note: sanitizeShortText(value.note),
    completed_at: sanitizeShortText(value.completed_at),
    has_photo: Boolean(value.has_photo),
    photo_name: sanitizeShortText(value.photo_name),
    photo_updated_at: sanitizeShortText(value.photo_updated_at),
    photo_data_url:
      typeof value.photo_export_data_url === "string" && value.photo_export_data_url.startsWith("data:image/")
        ? value.photo_export_data_url
        : "",
  };
}

function sanitizeShortText(value) {
  return String(value || "").trim().slice(0, 240);
}

async function prepareOffline() {
  try {
    const additionalUrls = [
      `/content/challenges/manifest.json`,
      `/content/challenges/${state.pack.meta.id}.json`,
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

function statusClassName(status) {
  const value = String(status || "pending");
  if (value === "done") {
    return "status-done";
  }
  if (value === "skipped") {
    return "status-skipped";
  }
  return "status-pending";
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, TOAST_MS);
}
