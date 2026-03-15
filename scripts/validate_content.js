#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const target = process.argv[2] || path.join(process.cwd(), "content", "bernal-heights-atlas.json");
const requiredTopLevel = ["meta", "neighborhood", "walk", "stops", "sources"];
const requiredStopFields = [
  "id",
  "slug",
  "title",
  "walk_order",
  "location_hint",
  "latitude",
  "longitude",
  "hero_image",
  "short_summary",
  "why_here",
  "habitat_type",
  "seasonality",
  "species_notes",
  "source_ids",
  "status",
];

function fail(message) {
  console.error(`Content validation failed: ${message}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(target, "utf8"));
} catch (error) {
  fail(error.message);
}

for (const key of requiredTopLevel) {
  if (!(key in payload)) {
    fail(`missing top-level key '${key}'`);
  }
}

if (!Array.isArray(payload.stops) || payload.stops.length === 0) {
  fail("stops must be a non-empty array");
}

const seenIds = new Set();
const seenSlugs = new Set();

payload.stops.forEach((stop, index) => {
  requiredStopFields.forEach((field) => {
    if (!(field in stop)) {
      fail(`stop ${index + 1} is missing '${field}'`);
    }
  });

  if (seenIds.has(stop.id)) {
    fail(`duplicate stop id '${stop.id}'`);
  }
  seenIds.add(stop.id);

  if (seenSlugs.has(stop.slug)) {
    fail(`duplicate stop slug '${stop.slug}'`);
  }
  seenSlugs.add(stop.slug);

  if (!Array.isArray(stop.source_ids)) {
    fail(`stop '${stop.id}' source_ids must be an array`);
  }
});

console.log(`Content validation passed: ${target}`);
