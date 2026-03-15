# Founder MVP Pivot Memo

Date: 2026-03-15

## Decision

The next founder-quality move is to pivot the MVP from `Bernal Heights Moss Atlas` toward a simpler and more resilient product:

- `parent-child neighborhood nature challenges`

The Bernal atlas should not be discarded.
It should be repositioned as a themed content pack or later editorial mode, not the first product surface.

## Why this memo exists

The first real Bernal field walk invalidated the weakest assumption in the current plan:

- nearby iNaturalist evidence is not the same thing as a publishable public stop

More importantly, the walk surfaced a stronger product signal than the atlas route:

- the child-facing page felt exciting
- the two-device format felt natural
- the shared parent-child activity felt rewarding even when the route itself failed

That is the signal to follow.

## New product thesis

Build a lightweight, mobile-first app for `shared neighborhood nature challenges` that a parent and child can do together on a walk.

The core value is:

- make an everyday walk feel like a discovery game
- keep the child interaction simple and satisfying
- give the parent enough structure to make the walk feel intentional
- produce a shared recap at the end

This is a better first product than a fragile location-specific moss route.

## Target user

Primary user:

- one parent or caregiver walking with one child, roughly elementary-school age

Secondary users:

- families doing local walks
- teachers, camp leaders, or neighborhood groups using a challenge as a simple activity format

## Core product loop

1. Before the walk, choose a challenge.
2. Each person uses their own device or a shared device.
3. During the walk, take photos and complete small tasks.
4. The app tracks progress simply and visibly.
5. At the end, upload or merge the two bundles.
6. The walk ends with a shared recap of what was found.

## Why this is stronger than the Bernal atlas MVP

This direction is:

- less brittle
- more repeatable
- more fun for a child
- less dependent on exact geolocation
- more likely to work in any neighborhood
- closer to what the current kid page already does well

It also keeps the strongest emotional part of the original idea:

- helping people notice overlooked nature

## What the moss atlas becomes

The atlas should become a later experience layer, such as:

- a challenge pack
- an editorial field guide
- a founder-led expert mode

Examples:

- `Tiny Green Worlds`
- `Find Three Bark Textures`
- `Lichens, Moss, and Microhabitats`

This preserves the original taste while giving the product a sturdier first use case.

## First challenge set for MVP

### 1. Rainbow Hunt

Goal:

- find nature photos that match the colors of the rainbow

Why first:

- easy for a child to understand
- works in many environments
- visually rewarding
- collaborative by default

### 2. Pick Your Color

Goal:

- each player picks a color and tries to collect the best matching nature photos

Why early:

- lightweight and highly replayable
- personal without needing complex rules
- works on a short neighborhood walk

### 3. Tiny Worlds

Goal:

- find close-up textures such as bark, moss, lichen, leaf veins, seed heads, or stone patterns

Why it matters:

- this is the bridge back to the original moss sensibility
- it teaches noticing, not just collecting

## What to keep from the current code

Keep:

- the adult page concept
- the kid page concept
- photo capture
- local save
- local network upload
- simple end-of-walk handoff

Repurpose:

- stop forms into challenge cards
- route structure into challenge progress
- atlas content JSON into challenge-pack JSON

## What to stop building right now

Do not invest further in:

- 10-stop speculative Bernal routes
- raw iNaturalist-based public waypoints
- exact stop generation from nearby observations
- atlas-first narrative polish
- citywide moss expansion

## Risks

The main risks are:

- making the challenges too taxonomy-heavy
- turning the product into a generic scavenger hunt clone
- adding points and gamification before the core walk experience feels good
- keeping too much of the brittle route logic around the new product

## Kill criteria

This pivot is not working if:

- a child loses interest within the first few tasks
- the parent feels like the app creates work instead of reducing it
- the challenge structure feels interchangeable with any generic scavenger-hunt app
- the product loses its nature-first, noticing-first character

## Recommended next move

The next product step should be:

- define three MVP challenge templates
- define a challenge-pack content schema
- refactor the current walk pages around challenge mode rather than route mode

## Bottom line

The moss route failed.
The product idea improved.

The strongest wedge now is:

- `simple neighborhood nature challenges for a parent and child`

The moss atlas remains valuable, but as a later layer built on top of a better first product.
