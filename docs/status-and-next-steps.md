# Status and Next Steps

Date: 2026-03-15
Status: challenge-first pivot accepted; implementation planning complete

## Current state

The repo has moved from broad idea exploration into a Bernal atlas plan, through a real-world field test, and now into a clearer challenge-first product direction.

Completed in this planning phase:
- founder MVP decision memo written
- founder MVP pivot memo written
- challenge-pack schema written
- challenge-first implementation spec written
- Bernal wedge selected
- engineering review completed
- runtime boundary selected as `static-first`
- Bernal implementation spec written
- Bernal content pack drafted
- Bernal field worksheet written
- Bernal field checklist written
- Bernal atlas candidate content scaffold written
- Bernal atlas shell implemented at repo root
- Bernal walk capture page implemented at `collect.html`
- Bernal walk capture enriched with Google Maps route handoff and iNaturalist photo previews
- Legacy tracker prototype preserved at `legacy-tracker.html`
- landscape research added for parent-child nature challenge products and adjacent offerings
- first three challenge-pack scaffolds added under `content/challenges/`

Current reality of the codebase:
- a legacy community-tracker prototype still exists in the app code
- the atlas shell and walk-capture surfaces are useful prototypes
- the next implementation pass should treat those surfaces as reusable interaction patterns, not as fixed MVP contract

## Current blockers

The product framing blocker is now resolved.
The next blockers are implementation and cleanup.

Blocking items:
- the current app still thinks in terms of route stops instead of challenge cards
- recap and merged-results rendering still need to be implemented
- legacy route-specific UI needs to be removed or isolated during the pivot

## Recommended execution order

1. Product decision pass
   - completed
   - MVP is `challenge-first`
2. Challenge definition pass
   - challenge-pack schema is written
   - first challenge templates are defined
   - first three sample packs are scaffolded
3. Implementation pass
   - reuse the adult and kid capture flows
   - replace stop-route logic with challenge logic
4. Review pass
   - run `review` on the first implementation branch

## What is no longer the active gate

The earlier Bernal atlas field-verification sequence is no longer the active gate.

That work remains useful as product history and future content inspiration, but it is not the current implementation path.

## Next decisions to make during implementation

These can be decided while building:
- whether the adult and kid pages stay separate or become two modes of one page
- whether points appear in v1 or remain hidden behind simple progress
- whether challenge packs are neighborhood-specific or place-agnostic by default
