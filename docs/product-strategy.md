# Product Strategy

Date: 2026-03-15
Status: current strategy

## Current product direction

The active product direction is `parent-child neighborhood nature challenges`.

This supersedes the earlier `Bernal Heights Moss Atlas` interpretation for MVP scope.

The product is now defined as:
- one adult mode and one kid mode used together on a walk
- lightweight challenge packs chosen before the walk
- photo-first collection during the walk
- a shared recap at the end
- a product that teaches noticing nature without depending on fragile waypoint truth

## Product vision

Build a simple, beautiful way for a parent and child to turn an everyday neighborhood walk into a nature discovery game.

The core experience is not `upload and browse`.
The core experience is `choose a challenge, walk, notice, capture, recap`.

## Wedge

Start with one parent and one child on a local walk because it is:
- emotionally strong
- easy to test repeatedly
- resilient across neighborhoods
- already validated by the strongest signal from the first real field test

## Primary users and jobs

Primary users:
- one parent or caregiver
- one elementary-school-age child
- families who want a simple, repeatable outdoor activity

Core jobs:
- `give us an easy nature challenge for this walk`
- `help my child stay engaged`
- `make our walk feel shared and memorable`

## MVP experience

Required MVP surfaces:
1. challenge select
2. adult challenge page
3. kid challenge page
4. end-of-walk recap

Each challenge should provide:
- title
- one-line goal
- estimated time
- a small set of photo-first cards
- simple progress
- recap output

## Editorial model

Public-facing challenge styles for v1:
- rainbow hunt
- pick your color
- tiny worlds

The original moss sensibility remains valuable inside `tiny worlds` and later nature-specific challenge packs.

## Runtime and architecture choice

Selected runtime boundary:
- static-first

Reasoning:
- challenge-pack content does not need a write path
- static delivery keeps the family walk flow light and robust
- public submissions and sync are intentionally deferred

## Success criteria

The MVP is working if:
- a parent and child can start a challenge in under one minute
- the child can complete tasks without needing long reading
- the two-device flow feels fun instead of burdensome
- the family wants to do a second challenge on another walk

## Scale path

If the challenge format works, scale in this order:
1. more challenge packs
2. neighborhood-specific themed packs
3. founder-led atlas or guide layers on top of the challenge engine
4. wider family and education use cases

## Out of scope

Not in scope for this MVP:
- public submissions
- contributor identity systems
- moderation workflows
- live sync
- route generation
- citywide content marketplace
- full species-identification workflow

## Legacy prototype note

The repository still contains earlier atlas and tracker prototypes.

Those implementations remain useful as references, but they are no longer the product definition for MVP.
