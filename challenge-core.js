export const MANIFEST_URL = "./content/challenges/manifest.json";
export const LAST_PACK_KEY = "nature_challenge_last_pack_id";
export const DEFAULT_TOAST_MS = 2800;
const DEFAULT_MAX_IMAGE_DIMENSION = 1600;
const DEFAULT_EXPORT_IMAGE_DIMENSION = 960;
const PHOTO_STORE_NAME = "challenge_photos";

export async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json();
}

export async function fetchManifest() {
  return fetchJson(MANIFEST_URL);
}

export async function fetchPackFromManifest(manifest, packId) {
  const meta = getPackMeta(manifest, packId);
  if (!meta) {
    throw new Error(`Could not find challenge pack ${packId}.`);
  }
  const pack = await fetchJson(meta.path);
  return { meta, pack };
}

export function getPackMeta(manifest, packId) {
  return (manifest?.packs || []).find((item) => item.id === packId) || null;
}

export function getRequestedPackId() {
  return new URLSearchParams(window.location.search).get("pack") || "";
}

export function readLastPackId() {
  return localStorage.getItem(LAST_PACK_KEY) || "";
}

export function rememberLastPackId(packId) {
  if (packId) {
    localStorage.setItem(LAST_PACK_KEY, packId);
  }
}

export function resolvePackId(manifest, requestedPackId) {
  const available = new Set((manifest?.packs || []).map((item) => item.id));
  if (requestedPackId && available.has(requestedPackId)) {
    return requestedPackId;
  }

  const remembered = readLastPackId();
  if (remembered && available.has(remembered)) {
    return remembered;
  }

  if (manifest?.default_pack_id && available.has(manifest.default_pack_id)) {
    return manifest.default_pack_id;
  }

  return manifest?.packs?.[0]?.id || "";
}

export function buildPackLink(page, packId) {
  return `${page}?pack=${encodeURIComponent(packId)}`;
}

export function getStorageKey(role, packId) {
  return `nature_challenge_${role}_${packId}_v1`;
}

export function loadDeviceStorage(role, packId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(getStorageKey(role, packId)) || "{}");
    if (!parsed || typeof parsed !== "object") {
      return { cards: {} };
    }
    return {
      lastSelectedCardId: parsed.lastSelectedCardId || "",
      cards: parsed.cards && typeof parsed.cards === "object" ? parsed.cards : {},
    };
  } catch (_error) {
    return { cards: {} };
  }
}

export function persistDeviceStorage(role, packId, storage) {
  localStorage.setItem(getStorageKey(role, packId), JSON.stringify(storage));
}

export function defaultCardState() {
  return {
    status: "",
    choice: "",
    note: "",
    tags: [],
    completed_at: "",
    has_photo: false,
    photo_name: "",
    photo_updated_at: "",
  };
}

export function mergeCardState(previous, patch) {
  return {
    ...defaultCardState(),
    ...(previous || {}),
    ...(patch || {}),
  };
}

export function sortedCards(pack) {
  return [...(pack?.cards || [])].sort((a, b) => a.order - b.order);
}

export function getCardById(pack, cardId) {
  return sortedCards(pack).find((card) => card.id === cardId) || null;
}

export function getNextCard(pack, currentCardId) {
  const cards = sortedCards(pack);
  const index = cards.findIndex((card) => card.id === currentCardId);
  if (index === -1) {
    return cards[0] || null;
  }
  return cards[index + 1] || null;
}

export function getFirstIncompleteCard(pack, responses = {}, importedResponses = {}) {
  for (const card of sortedCards(pack)) {
    if (!isCardComplete(card, responses[card.id], importedResponses[card.id])) {
      return card;
    }
  }
  return sortedCards(pack)[0] || null;
}

export function isPhotoCard(card) {
  return card?.capture_type === "photo" || card?.capture_type === "photo-or-mark";
}

export function isChoiceCard(card) {
  return card?.capture_type === "choice";
}

export function isCardComplete(card, ownState, importedState) {
  const states = [ownState, importedState].filter(Boolean);
  if (states.some((state) => state.status === "done")) {
    return true;
  }
  if (isChoiceCard(card)) {
    return states.some((state) => Boolean(String(state.choice || "").trim()));
  }
  if (isPhotoCard(card)) {
    return states.some((state) => Boolean(state.has_photo));
  }
  return false;
}

export function countCompletedCards(pack, responses = {}, importedResponses = {}) {
  return sortedCards(pack).filter((card) => isCardComplete(card, responses[card.id], importedResponses[card.id])).length;
}

export function sumBaseScore(pack, responses = {}, importedResponses = {}) {
  return sortedCards(pack)
    .filter((card) => isCardComplete(card, responses[card.id], importedResponses[card.id]))
    .reduce((sum, card) => sum + Number(card.points || 0), 0);
}

export function makePhotoKey(packId, role, cardId) {
  return `${packId}::${role}::${cardId}`;
}

export async function openPhotoDb(dbName) {
  if (!("indexedDB" in window)) {
    throw new Error("IndexedDB is not available in this browser.");
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject(request.error || new Error("Could not open photo storage."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        db.createObjectStore(PHOTO_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function savePhotoRecord(db, key, file) {
  if (!db) {
    throw new Error("Photo persistence is not available in this browser.");
  }

  const normalized = await normalizeImageRecord(file);
  const record = {
    id: key,
    dataUrl: normalized.dataUrl,
    mimeType: normalized.mimeType,
    name: file.name || "",
    updatedAt: new Date().toISOString(),
  };

  await new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not save photo."));
    tx.objectStore(PHOTO_STORE_NAME).put(record);
  });

  return record;
}

export async function readPhotoRecord(db, key) {
  if (!db) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE_NAME, "readonly");
    const request = tx.objectStore(PHOTO_STORE_NAME).get(key);
    request.onerror = () => reject(request.error || new Error("Could not load photo."));
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function deletePhotoRecord(db, key) {
  if (!db) {
    return;
  }

  await new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not delete photo."));
    tx.objectStore(PHOTO_STORE_NAME).delete(key);
  });
}

async function normalizeImageRecord(file) {
  if (!(file instanceof Blob) || !String(file.type || "").startsWith("image/")) {
    throw new Error("The selected file is not an image.");
  }

  try {
    const image = await loadImage(file);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(1, DEFAULT_MAX_IMAGE_DIMENSION / Math.max(width, height));

    if (scale >= 1 && file.size <= 1_800_000) {
      return {
        dataUrl: await blobToDataUrl(file),
        mimeType: file.type || "image/jpeg",
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      return {
        dataUrl: await blobToDataUrl(file),
        mimeType: file.type || "image/jpeg",
      };
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.82),
      mimeType: "image/jpeg",
    };
  } catch (error) {
    console.error("Image normalization failed", error);
    return {
      dataUrl: await blobToDataUrl(file),
      mimeType: file.type || "image/jpeg",
    };
  }
}

export async function createExportPhotoDataUrl(recordOrBlob) {
  const source = recordOrBlob?.blob instanceof Blob ? recordOrBlob.blob : recordOrBlob;
  if (typeof recordOrBlob?.dataUrl === "string" && recordOrBlob.dataUrl.startsWith("data:image/")) {
    return recordOrBlob.dataUrl;
  }
  if (!(source instanceof Blob) || !String(source.type || "").startsWith("image/")) {
    return "";
  }

  try {
    const image = await loadImage(source);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(1, DEFAULT_EXPORT_IMAGE_DIMENSION / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      return "";
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.74);
  } catch (error) {
    console.error("Export photo conversion failed", error);
    return "";
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read the photo file."));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(blob);
  });
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
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

export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function uploadBundle(payload) {
  const response = await fetch("/api/walk-bundles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Upload failed (${response.status})`);
  }
  return result;
}

export function formatShortDateTime(value) {
  if (!value) {
    return "not yet";
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

export function titleCase(value) {
  return String(value || "")
    .replaceAll(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

export function createMetaChip(text) {
  const chip = document.createElement("span");
  chip.className = "meta-chip";
  chip.textContent = text;
  return chip;
}

export function createProgressCard(label, value) {
  const card = document.createElement("div");
  card.className = "progress-card";
  const strong = document.createElement("strong");
  strong.textContent = value;
  const span = document.createElement("span");
  span.textContent = label;
  card.append(strong, span);
  return card;
}

export function currentDateTimeLocal() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now - timezoneOffset).toISOString().slice(0, 16);
}

export function nowIso() {
  return new Date().toISOString();
}

export function makeRoleLabel(role) {
  return role === "kid" ? "Kid" : "Adult";
}
