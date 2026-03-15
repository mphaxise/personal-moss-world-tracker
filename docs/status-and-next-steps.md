# Status and Next Steps

Date: 2026-03-15
Status: atlas shell started, field verification still pending

## Current state

The repo has moved from broad idea exploration into a defined Bernal implementation plan.

Completed in this planning phase:
- founder MVP decision memo written
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
- Legacy tracker prototype preserved at `legacy-tracker.html`

Current reality of the codebase:
- a legacy community-tracker prototype still exists in the app code
- the next implementation pass should treat that tracker surface as reference material, not as the MVP contract

## Current blockers

The main blockers are content and field truth, not backend infrastructure.

Blocking items:
- candidate Bernal stops still need field verification
- first image set still needs to be gathered
- exact walk start/end still needs to be chosen
- stop coordinates are provisional scouting anchors and hero images are still placeholders in the atlas JSON

## Recommended execution order

1. Field pass
   - verify candidate stop clusters
   - drop weak stops
   - keep the best 8 to 12
2. Asset pass
   - capture neighborhood cover image
   - capture stop hero images
   - create concise field notes for each verified stop
3. Implementation pass
   - tighten the atlas shell against real field-verified stop data
   - keep one canonical content file
4. Review pass
   - run `review` on the first implementation branch

## What is no longer the active gate

The earlier persistence-testing gate applied to the legacy tracker MVP.

That work is still useful historical context, but it is no longer the main gating item for the current Bernal atlas direction.

## Next decisions to make during implementation

These can be decided while building:
- stop detail as modal or side panel
- whether to keep a read-only helper in `server.py`
- whether approximate coordinates are better than exact coordinates for certain stops
