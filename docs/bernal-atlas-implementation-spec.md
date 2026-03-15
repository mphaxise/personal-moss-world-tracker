# Bernal Heights Moss Atlas Implementation Spec

Date: 2026-03-15
Status: accepted planning spec

## Goal

Build the first product-shaped version of `Bernal Heights Moss Atlas` as a static-first editorial experience for one San Francisco neighborhood.

This spec turns the founder decision in `docs/founder-mvp-decision-memo.md` into an implementable engineering shape.

## Product summary

The MVP is not a community tracker.

The MVP is:
- one Bernal Heights neighborhood chapter
- one curated walk
- 8 to 12 stops
- one clear editorial frame: hidden fog-fed urban texture
- a simple public-facing `moss atlas` brand backed by research across mosses, liverworts, and lichens

## Runtime decision

Selected runtime boundary: `static-first`.

Why:
- The MVP is curated, not user-generated.
- A database and write API add complexity without increasing product truth.
- A static build is easier to ship, easier to test, and easier to change while the content model is still being proven.

Implications:
- No public submissions in MVP.
- No SQLite dependency in MVP.
- No `POST` or `PATCH` endpoints required for MVP.
- No runtime iNaturalist lookup in the user-facing experience.
- All story content ships as local files in the repo.

Allowed optional runtime support:
- local static serving for development
- optional read-only JSON fetch if we want to keep content loading asynchronous

## UX surfaces

The atlas should remain intentionally small.

Required surfaces:
1. Home narrative
   - title, deck, Bernal framing, season note, start-walk CTA
2. Walk overview
   - route summary, stop list, map, walk notes, expected duration, terrain notes
3. Stop detail
   - hero image, short summary, habitat notes, `why this spot matters`, location hint, source notes

Preferred interaction model:
- single-page static app
- home + walk overview visible on initial load
- stop detail opens as an in-page detail panel or modal
- deep-link support via hash, for example `#stop=bernal-north-slope-wall`

This is smaller and safer than building full multi-page routing for v1.

## Content model

Use one canonical content file for the first implementation:
- `content/bernal-heights-atlas.json`

This keeps the MVP easy to reason about.

Recommended top-level shape:

```json
{
  "meta": {
    "title": "Bernal Heights Moss Atlas",
    "season": "post-rain",
    "version": 1,
    "updated_at": "2026-03-15"
  },
  "neighborhood": {
    "name": "Bernal Heights",
    "summary": "...",
    "why_here": "..."
  },
  "walk": {
    "id": "bernal-post-rain-loop",
    "title": "Post-Rain Bernal Loop",
    "duration_minutes": 75,
    "distance_miles": 2.2,
    "terrain": "hilly sidewalks, stairs, park paths",
    "start_label": "Bernal Heights Park base",
    "end_label": "Cortland corridor"
  },
  "stops": [],
  "sources": []
}
```

Required fields for each stop:
- `id`
- `slug`
- `title`
- `walk_order`
- `location_hint`
- `latitude`
- `longitude`
- `hero_image`
- `short_summary`
- `why_here`
- `habitat_type`
- `seasonality`
- `species_notes`
- `source_ids`
- `status`

Field notes:
- `location_hint` should be public-safe and readable. It does not need to be a precise street address.
- `species_notes` can be broad and honest. It is acceptable to say `candidate wall mosses and lichens` before exact field confirmation.
- `status` should be one of `candidate`, `field-verified`, or `published`.

## Asset model

Store assets locally.

Recommended structure:

```text
images/
  bernal/
    hero-cover.jpg
    stop-01-north-slope-wall.jpg
    stop-02-stair-edge.jpg
    ...
```

Image rules:
- one hero image per stop is required
- one neighborhood cover image is required
- optimized web images only
- avoid embedding large base64 image blobs in content files

## Recommended file layout

```text
personal-moss-world-tracker/
  index.html
  styles.css
  atlas.js
  content/
    bernal-heights-atlas.json
  images/
    bernal/
  scripts/
    validate_content.js
  docs/
    founder-mvp-decision-memo.md
    bernal-atlas-implementation-spec.md
    bernal-content-pack.md
```

Notes:
- `atlas.js` should replace the current all-purpose tracker state as the MVP client entrypoint.
- The older tracker code can remain temporarily during transition, but it should not define the new architecture.

## Rendering responsibilities

`atlas.js` should be responsible for:
- loading the atlas JSON
- rendering hero and walk metadata
- rendering stop cards/list
- rendering the stop detail panel
- syncing selected stop state to the map
- handling hash-based deep linking

Avoid adding support for:
- write APIs
- account state
- import/export
- generalized content editing
- dynamic taxonomy lookup during page use

## Map behavior

Map is supportive, not primary.

Requirements:
- show all stops with markers
- highlight selected stop
- fit to walk bounds on first open
- support `focus selected stop`
- gracefully handle any stop that is deliberately approximate

Map should load lazily when the walk section enters view or when the user opens the map.

## Accessibility and mobile constraints

Requirements:
- readable on phone while walking outdoors
- large tap targets for stop selection
- clear contrast for labels and route order
- stop detail panel must be dismissible without precision gestures
- source notes and habitat labels must remain legible on small screens

## Validation and tests

Minimum automated checks before calling MVP implementation complete:
- content schema validation for `content/bernal-heights-atlas.json`
- smoke test that all published stops render
- smoke test that selected stop and map marker stay in sync
- smoke test that missing images fail loudly in development
- mobile viewport smoke test for home, walk overview, and stop detail

Minimum manual checks:
- one complete Bernal walk on phone
- one desktop pass for readability and scanability
- one offline load test from a local static server

## Non-goals

Not in scope for this build:
- public submissions
- contributor profiles
- anonymity system changes
- moderation UI
- regional trail expansion
- route generation
- full species browser
- full CMS

## Open decisions that do not block implementation

These can wait until after the first Bernal implementation exists:
- whether stop detail is a side panel or modal
- whether to keep a tiny read-only helper in `server.py`
- whether future neighborhoods live in one content file each or one multi-neighborhood manifest

## Acceptance criteria

The implementation is good enough when:
- Bernal has one coherent home narrative
- one walk is visible and understandable without explanation
- 8 to 12 stops feel distinct and worth visiting
- each stop has an image, a place-based story, and a map location
- the UI feels like an atlas, not a database tool
