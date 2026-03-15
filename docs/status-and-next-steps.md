# Status and Next Steps

Date: 2026-03-15
Status: Bernal atlas field-tested; product pivot now under review

## Current state

The repo has moved from broad idea exploration into a defined Bernal implementation plan, and then through a real-world field test that challenged the current MVP wedge.

Completed in this planning phase:
- founder MVP decision memo written
- founder MVP pivot memo written
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

Current reality of the codebase:
- a legacy community-tracker prototype still exists in the app code
- the atlas shell and walk-capture surfaces are useful prototypes
- the next implementation pass should treat those surfaces as reusable interaction patterns, not as fixed MVP contract

## Current blockers

The main blockers are no longer just content and field truth.
The larger blocker is product framing.

Blocking items:
- the first Bernal field walk invalidated the current stop-generation confidence
- candidate Bernal stops are still provisional scouting leads, not trustworthy public walk stops
- the team now needs to choose between `atlas-first` and `challenge-first`
- if the pivot is accepted, the content model needs to move from stop-oriented atlas JSON toward challenge-pack JSON

## Recommended execution order

1. Product decision pass
   - review the founder pivot memo
   - review the landscape research
   - choose whether the MVP is `challenge-first`
2. Challenge definition pass
   - define the first three challenge templates
   - define progress, scoring, and recap rules
   - define a challenge-pack content schema
3. Implementation pass
   - reuse the adult and kid capture flows
   - replace stop-route logic with challenge logic
4. Review pass
   - run `review` on the first implementation branch

## What is no longer the active gate

The earlier Bernal atlas field-verification sequence is no longer the only active gate.

That work is still useful, but the next true gate is product choice:

- keep pushing the Bernal atlas
- or pivot to a neighborhood nature challenge product that uses the same interaction foundation

## Next decisions to make during implementation

If the challenge pivot is accepted, these can be decided while building:
- whether the adult and kid pages stay separate or become two modes of one page
- whether points appear in v1 or remain hidden behind simple progress
- whether challenge packs are neighborhood-specific or place-agnostic by default
