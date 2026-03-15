# Challenge-First Implementation Spec

Date: 2026-03-15
Status: accepted planning spec

## Mode

`SCOPE REDUCTION`

This is the right mode because the current repo already has more runtime machinery than the new product needs.

The smallest valuable move is not to build a bigger system.
It is to reuse the working adult and kid flows and replace the brittle route-specific content model with a challenge-pack model.

## Step 0 Scope Challenge

What already exists:

- a working adult page with photo capture, local save, upload, and kid import
- a working kid page with simple tap targets, photo capture, local save, and upload
- an upload receiver in `server.py`
- local/offline preparation patterns

What is overbuilt for the new goal:

- route map dependency
- stop-by-stop Bernal wayfinding
- reverse-geocoded addresses
- iNaturalist image enrichment as a public-facing mechanic
- field-verification logic for public route publishing

Minimum change that achieves the new goal:

- keep the two-device model
- keep photo capture and local storage
- keep local-network upload
- replace `stops` with `challenge cards`
- add a lightweight recap
- make map and geolocation optional or remove them from v1

## Goal

Build the first product-shaped version of `family neighborhood nature challenges` using the current adult and kid surfaces as the base.

This spec turns the founder pivot into an implementable engineering plan.

## Product summary

The MVP is:

- one adult page
- one kid page
- one challenge selection step
- three challenge packs
- one end-of-walk recap

The MVP is not:

- a city guide
- a waypoint app
- a species ID product
- a social scavenger-hunt platform

## Runtime decision

Selected runtime boundary:

- `static-first`

Why:

- challenge packs are static content
- the current local upload handoff already works well enough for family testing
- no backend state is required for MVP truth

Implications:

- no accounts
- no sync server requirement
- no database dependency
- no runtime third-party data fetches in the user flow

Allowed support:

- local static server
- optional local upload endpoint for bundle handoff

## Smallest safe architecture

```text
content/challenges/*.json
          |
          v
  shared challenge loader
      /            \
     v              v
adult page      kid page
     \              /
      v            v
    local exports / upload bundles
             |
             v
         recap merge
```

## Recommended file layout

```text
personal-moss-world-tracker/
  challenge-select.html
  challenge-adult.html
  challenge-kid.html
  challenge-core.js
  challenge-adult.js
  challenge-kid.js
  challenge.css
  content/
    challenges/
      rainbow-hunt-v1.json
      pick-your-color-v1.json
      tiny-worlds-v1.json
  scripts/
    validate_challenge_pack.js
  docs/
    challenge-pack-schema.md
    challenge-first-implementation-spec.md
```

## Reuse plan from current code

Keep as-is or lightly adapt:

- photo capture and compression logic from `collect.js`
- kid-friendly quick-tap patterns from `kid-collect.js`
- local save by device
- upload bundle path in `server.py`
- service-worker preparation affordances

Replace or remove:

- route map
- stop markers
- arrival capture
- exact latitude and longitude forms
- Google Maps route handoff
- iNaturalist preview section

## UX surfaces

### 1. Challenge select

Purpose:

- choose the pack before the walk

Requirements:

- show 3 challenge cards
- show title, duration, difficulty, and one-line summary
- allow launching adult or kid mode with a selected pack

### 2. Adult challenge page

Purpose:

- guide the walk
- track progress
- optionally merge kid results
- upload final bundle

Requirements:

- selected challenge summary
- progress bar or progress chips
- challenge card list
- per-card photo capture
- lightweight notes only where necessary
- import kid export
- upload to laptop
- end-of-walk recap button

### 3. Kid challenge page

Purpose:

- make the child interaction obvious and fun

Requirements:

- big task cards
- one photo per card
- simple done state
- maybe one to three simple tags depending on the pack
- next-card CTA
- export or upload

### 4. Recap view

Purpose:

- create a satisfying ending

Requirements:

- completed cards
- total score or progress summary
- best photos grouped by challenge card
- show who found what when relevant

## Challenge logic

The app should no longer think in terms of location-bound stops.

The primary runtime entity should be:

- `challenge card`

Each card should have:

- completion state
- one optional photo per device
- optional tags
- completed timestamp
- participant role

## Merge behavior

Adult merge should remain the final integration point for v1.

Rules:

- adult device can import kid export
- adult device can upload final merged bundle
- kid device can upload directly if needed
- merge should preserve both participants' photos when both exist
- shared card completion should count once in progress and twice in recap attribution only if both contributed

## Why separate adult and kid pages should stay for v1

Do not unify the pages yet.

Reason:

- the adult and kid interaction models are already meaningfully different
- each page has proven value in the walk test
- merging them too early would create extra complexity and extra compromise

Keep:

- `challenge-adult.html`
- `challenge-kid.html`

## Performance

The challenge-first product should be lighter than the current route prototype.

That means:

- no map required on first paint
- no external data requests in the challenge flow
- lazy photo previews
- compact JSON packs

## Tests

Required automated checks:

- challenge pack validation for all files in `content/challenges/`
- smoke test that challenge select loads all packs
- smoke test that adult page renders cards for a selected pack
- smoke test that kid page renders the same pack with simplified controls
- export/import smoke test for adult and kid bundles
- recap smoke test with merged sample data

Required manual checks:

- one parent and child walk using two devices
- one child-only usability pass indoors
- one offline-ish test where both pages are opened before leaving home
- one upload-to-laptop roundtrip from both devices

## Not in scope

Not in scope for v1:

- live multiplayer sync
- leaderboards
- open-ended challenge authoring UI
- community packs
- third-party species recognition in the core loop
- map-based route generation
- neighborhood-specific publishing logic

## Acceptance criteria

The challenge-first MVP is working if:

- a parent and child can pick a challenge in under one minute
- the child can complete cards without reading long instructions
- the adult can merge or upload both bundles without confusion
- the end recap feels satisfying enough to justify doing another walk
- the same system can support all three first challenge packs without special-case code

## Recommended execution order

1. Define and validate the challenge-pack schema.
2. Create the first three pack JSON files.
3. Extract shared runtime logic from current adult and kid pages.
4. Replace stop-route UI with challenge-card UI.
5. Add recap.
6. Run `review` on the implementation branch before more polish.
