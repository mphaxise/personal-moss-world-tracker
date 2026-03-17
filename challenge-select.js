import {
  buildPackLink,
  createMetaChip,
  fetchManifest,
  getRequestedPackId,
  rememberLastPackId,
  resolvePackId,
} from "./challenge-core.js";

const state = {
  manifest: null,
  selectedPackId: "",
  requestedPackId: getRequestedPackId(),
};

const dom = {
  status: document.querySelector("#statusText"),
  packGrid: document.querySelector("#packGrid"),
  lastPack: document.querySelector("#lastPack"),
  heroAdultLink: document.querySelector("#heroAdultLink"),
  heroKidLink: document.querySelector("#heroKidLink"),
};

boot();

async function boot() {
  try {
    state.manifest = await fetchManifest();
    state.selectedPackId = resolvePackId(state.manifest, state.requestedPackId);
    if (state.selectedPackId) {
      rememberLastPackId(state.selectedPackId);
    }
    render();
  } catch (error) {
    console.error(error);
    dom.status.textContent = `Could not load challenge packs: ${error.message}`;
  }
}

function render() {
  const packs = state.manifest?.packs || [];
  if (packs.length === 0) {
    dom.status.textContent = "No challenge packs are available yet.";
    return;
  }

  const activePack = packs.find((pack) => pack.id === state.selectedPackId) || packs[0];
  if (activePack?.id !== state.selectedPackId) {
    state.selectedPackId = activePack?.id || "";
  }
  dom.status.textContent = "Pick a challenge before the walk, then open adult mode on the phone and kid mode on the iPad.";
  dom.lastPack.textContent = activePack ? `Selected challenge: ${activePack.title}` : "No challenge selected yet.";
  if (activePack) {
    dom.heroAdultLink.href = buildPackLink("collect.html", activePack.id);
    dom.heroKidLink.href = buildPackLink("kid-collect.html", activePack.id);
  }
  dom.packGrid.replaceChildren(...packs.map(createPackCard));
}

function createPackCard(pack) {
  const article = document.createElement("article");
  article.className = "pack-card";
  if (pack.id === state.selectedPackId) {
    article.classList.add("is-last-used");
  }

  const eyebrow = document.createElement("p");
  eyebrow.className = "card-eyebrow";
  eyebrow.textContent = pack.play_style === "parallel" ? "Play side by side" : "Shared family walk";

  const title = document.createElement("h2");
  title.textContent = pack.title;

  const tagline = document.createElement("p");
  tagline.className = "card-tagline";
  tagline.textContent = pack.tagline;

  const summary = document.createElement("p");
  summary.className = "card-summary";
  summary.textContent = pack.summary;

  const meta = document.createElement("div");
  meta.className = "meta-row";
  meta.append(
    createMetaChip(`${pack.estimated_minutes} min`),
    createMetaChip(pack.difficulty),
    createMetaChip(`ages ${pack.age_band}`)
  );

  const tagRow = document.createElement("div");
  tagRow.className = "meta-row";
  for (const tag of pack.theme_tags || []) {
    tagRow.append(createMetaChip(tag));
  }

  const actionRow = document.createElement("div");
  actionRow.className = "action-row";

  const useButton = document.createElement("button");
  useButton.type = "button";
  useButton.className = "primary-btn";
  useButton.textContent = "Choose this challenge";
  useButton.addEventListener("click", () => {
    rememberLastPackId(pack.id);
    state.selectedPackId = pack.id;
    render();
  });

  const adultLink = document.createElement("a");
  adultLink.className = "ghost-link";
  adultLink.href = buildPackLink("collect.html", pack.id);
  adultLink.textContent = "Open adult mode";
  adultLink.addEventListener("click", () => rememberLastPackId(pack.id));

  const kidLink = document.createElement("a");
  kidLink.className = "ghost-link";
  kidLink.href = buildPackLink("kid-collect.html", pack.id);
  kidLink.textContent = "Open kid mode";
  kidLink.addEventListener("click", () => rememberLastPackId(pack.id));

  actionRow.append(useButton, adultLink, kidLink);
  article.append(eyebrow, title, tagline, summary, meta, tagRow, actionRow);
  return article;
}
