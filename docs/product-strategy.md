# Product Strategy

Date: 2026-03-15
Status: current strategy

## Current product direction

The active product direction is `Bernal Heights Moss Atlas`.

This supersedes the earlier tracker-first interpretation for MVP scope.

The product is now defined as:
- a founder-led editorial atlas of one San Francisco neighborhood
- one curated Bernal walk
- 8 to 12 stops
- a simple public-facing `moss atlas` brand backed by research across mosses, liverworts, and lichens

## Product vision

Build a neighborhood-scale guide to the hidden fog-fed texture of San Francisco.

The core experience is not `upload and browse`.
The core experience is `walk, notice, and understand why this patch exists here`.

## Wedge

Start with Bernal Heights because it is:
- walkable
- geographically legible
- rich in walls, slopes, stairs, bark, and edge habitats
- a strong test of whether the atlas format is compelling enough to scale

## Primary users and jobs

Primary users:
- curious neighborhood walkers
- design-minded local naturalists
- people who like place-based stories and urban texture

Core jobs:
- `show me a good Bernal walk`
- `teach me what to notice`
- `make this neighborhood feel more legible and interesting`

## MVP experience

Required MVP surfaces:
1. home narrative
2. walk overview with route summary and map
3. stop detail for each published stop

Each stop should provide:
- image
- location hint
- habitat type
- short summary
- `why this spot matters`
- seasonality note
- source note

## Editorial model

Public brand:
- moss atlas

Internal research model:
- mosses
- liverworts
- lichens

This keeps the product simple in public while preserving ecological richness in the content.

## Runtime and architecture choice

Selected runtime boundary:
- static-first

Reasoning:
- curated editorial content does not need a write path
- static delivery matches the product size and reduces maintenance burden
- public submissions are intentionally deferred

## Success criteria

The MVP is working if:
- Bernal can support 8 to 12 distinct, worth-walking stops
- the walk feels coherent without explanation from the founder
- the stop pages read like place-based stories rather than taxonomy blurbs
- the UI feels like an atlas instead of a generic map database

## Scale path

If Bernal works, scale in this order:
1. more San Francisco neighborhood chapters
2. seasonal city walks
3. fog-belt trail guides within roughly one hour of San Francisco

## Out of scope

Not in scope for this MVP:
- public submissions
- contributor identity systems
- moderation workflows
- route generation
- citywide coverage at launch
- regional trails directory at launch
- full citizen-science workflow

## Legacy prototype note

The repository still contains the earlier community tracker prototype.

That implementation remains useful as a reference, but it is no longer the product definition for MVP.
