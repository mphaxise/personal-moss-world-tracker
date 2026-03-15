# iNaturalist Research Note

Date: 2026-03-15
Status: retained as research input, not active MVP feature work

## Why this doc still matters

This repo originally used iNaturalist as a per-entry enrichment spike for the tracker prototype.

For the current Bernal atlas direction, iNaturalist remains useful in a different role:
- scouting support
- species-distribution context
- seasonal observation-window comparison

It is no longer an active user-facing MVP requirement.

## Legacy spike summary

The earlier prototype validated that iNaturalist could be queried from the client and attached to individual user entries.

That work proved:
- API access was straightforward
- lightweight context could be shown without blocking the UI
- match quality depended heavily on coordinates and photo context

## Current use in the atlas plan

For `Bernal Heights Moss Atlas`, iNaturalist should be used as:
- a research and scouting layer during content development
- a way to identify likely taxa and habitat patterns
- a way to compare seasonal observation windows around Bernal-centered coordinates

It should not be used as:
- a live runtime dependency for the public MVP
- a substitute for Bernal field verification
- the main product surface

## Practical guidance

Use iNaturalist to help answer:
- what moss, liverwort, and lichen groups are common in San Francisco
- what looks plausible in the Bernal scouting radius
- whether post-rain windows produce stronger observation density than dry-season windows

Do not use iNaturalist alone to claim:
- exact species at a Bernal stop without field confidence
- that a specific candidate stop is strong enough to publish
- that the atlas should be defined as a citizen-science product

## Current recommendation

Keep iNaturalist in the planning stack as a background research source.

Do not include live enrichment in the first Bernal MVP.
