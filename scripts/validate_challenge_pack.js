#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const targets = argv.length ? argv : collectDefaultTargets();

if (targets.length === 0) {
  console.error("No challenge pack files found.");
  process.exit(1);
}

let hadError = false;
for (const target of targets) {
  try {
    validateFile(resolveTarget(target));
    console.log(`ok ${target}`);
  } catch (error) {
    hadError = true;
    console.error(`error ${target}: ${error.message}`);
  }
}

if (hadError) {
  process.exit(1);
}

function collectDefaultTargets() {
  const dir = path.join(ROOT, "content", "challenges");
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => name !== "manifest.json")
    .map((name) => path.join("content", "challenges", name));
}

function resolveTarget(target) {
  return path.isAbsolute(target) ? target : path.join(ROOT, target);
}

function validateFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const requiredTop = ["meta", "pack", "participants", "rules", "cards", "recap"];
  for (const key of requiredTop) {
    if (!(key in raw)) {
      throw new Error(`Missing top-level key ${key}`);
    }
  }

  const filename = path.basename(filePath, ".json");
  requireFields(raw.meta, ["id", "slug", "title", "version", "updated_at", "status"], "meta");
  requireFields(raw.pack, ["title", "tagline", "summary", "estimated_minutes", "difficulty", "age_band", "play_style", "theme_tags"], "pack");
  requireFields(raw.participants, ["adult_label", "kid_label", "device_mode"], "participants");
  requireFields(raw.rules, ["completion_target", "photo_required", "scoring_mode", "allow_shared_completion", "allow_duplicate_subjects"], "rules");
  requireFields(raw.recap, ["title", "success_message", "partial_message", "empty_message"], "recap");

  if (raw.meta.id !== filename) {
    throw new Error(`meta.id ${raw.meta.id} does not match filename ${filename}`);
  }
  if (!Array.isArray(raw.cards) || raw.cards.length === 0) {
    throw new Error("cards must be a non-empty array");
  }
  if (!Array.isArray(raw.pack.theme_tags)) {
    throw new Error("pack.theme_tags must be an array");
  }

  const ids = new Set();
  const orders = new Set();
  const allowedAssigned = new Set(["either", "adult", "kid", "both", "shared"]);
  const allowedCapture = new Set(["photo", "photo-or-mark", "count", "choice"]);

  for (const card of raw.cards) {
    requireFields(card, ["id", "order", "title", "prompt", "capture_type", "assigned_to", "completion_rule", "points", "tags"], `card ${card.id || "unknown"}`);
    if (ids.has(card.id)) {
      throw new Error(`Duplicate card id ${card.id}`);
    }
    if (orders.has(card.order)) {
      throw new Error(`Duplicate card order ${card.order}`);
    }
    ids.add(card.id);
    orders.add(card.order);

    if (!allowedAssigned.has(card.assigned_to)) {
      throw new Error(`Invalid assigned_to on ${card.id}: ${card.assigned_to}`);
    }
    if (!allowedCapture.has(card.capture_type)) {
      throw new Error(`Invalid capture_type on ${card.id}: ${card.capture_type}`);
    }
    if (!Number.isInteger(card.points)) {
      throw new Error(`points must be an integer on ${card.id}`);
    }
    if (!Array.isArray(card.tags)) {
      throw new Error(`tags must be an array on ${card.id}`);
    }
    if (card.capture_type === "choice" && (!Array.isArray(card.options) || card.options.length === 0)) {
      throw new Error(`choice card ${card.id} must include a non-empty options array`);
    }
  }
}

function requireFields(obj, fields, label) {
  for (const field of fields) {
    if (!(field in obj)) {
      throw new Error(`Missing ${label}.${field}`);
    }
  }
}
