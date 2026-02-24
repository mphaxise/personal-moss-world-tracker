# Idea Strategy

## Project context

- Title: Personal Moss World Tracker
- Rank: 3
- Priority: 5
- Source: Manual backlog (user idea)
- Source files:
  - `/Users/praneet/PraneetIdeas/manual_ideas.json`
  - `/Users/praneet/PraneetIdeas/memory.md`
- Idea link: https://github.com/manual/manual
- Review date: 2026-02-24

## Extracted canonical fields

From `manual_ideas.json`:
- Status: active
- Impact: 4
- Effort: 3
- Momentum: 4
- Last touched: 2026-02-24
- Rationale: Turns everyday moss sightings into a lightweight community discovery product with visual browsing and location context.
- First milestone: Ship a single-page prototype with one photo submission flow and toggleable card and map views.
- End-of-day outcome: Working one-page moss tracker with seeded entries and an iNaturalist enrichment spike documented.
- Notes: Users upload moss photos from daily life; page displays all moss worlds in card and map views. Explore optional iNaturalist lookup for species/observation context when photos include useful metadata.

From `memory.md` (Daily GitHub Review 2026-02-24 22:41 UTC):
- Idea appears in shortlist at rank 3 with priority 5.
- Current focus in that snapshot favored another idea, so this project is positioned as the selected build candidate for this run.

## Problem statement

People notice small moss habitats in daily life but have no lightweight, local-first place to publish and browse these discoveries visually with location context.

## Strategic intent

- Create a low-friction community discovery surface for moss sightings.
- Combine visual browsing (cards) with spatial browsing (map) in one page.
- Keep the first release simple enough to ship quickly while leaving room for enrichment via iNaturalist.

## Why now

- High momentum from multiple moss-related ideas in the backlog.
- Priority score is strong enough (5) for an immediate prototype.
- Existing rationale and milestone are concrete and implementation-ready.

## Success criteria

- A working one-page prototype exists.
- User can submit at least one photo entry through a single flow.
- User can switch between card and map views.
- Seeded entries are visible in both views.
- Public-facing entries never reveal contributor identity.
- iNaturalist enrichment feasibility is documented from a quick spike.

## Build reflection (2026-02-24)

Delivered against milestone:
- One-page prototype shipped.
- Submission flow, card view, and map view are functional.
- Seeded entries are included.
- iNaturalist enrichment spike is documented and wired to UI.
- Public display enforces anonymous contributor labels.

Remaining to fully mature product:
- Durable storage beyond in-memory session state.
- Privacy hardening around uploaded media metadata and payload controls.
- Small test suite for core form and rendering behavior.

## Risks and mitigations

- Risk: Incomplete location metadata from user photos.
  - Mitigation: Allow manual location entry and clear unknown-location fallback.
- Risk: iNaturalist lookup may be noisy for low-metadata photos.
  - Mitigation: Keep enrichment optional and non-blocking.
- Risk: Map UX may add complexity too early.
  - Mitigation: Scope map to simple markers and reuse same entry model as cards.
- Risk: Contributor privacy could be violated through accidental identity fields.
  - Mitigation: Enforce anonymous-only public labels and avoid collecting public identity fields in MVP.

## Out of scope for milestone 1

- Social graph, moderation workflows, and advanced trust systems.
- Full mobile app packaging.
- Complex taxonomy pipelines beyond a lightweight enrichment spike.
