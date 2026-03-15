# Status and Next Steps

Date: 2026-03-15
Status: planning complete, implementation not yet started for atlas pivot

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

Current reality of the codebase:
- a legacy community-tracker prototype still exists in the app code
- the next implementation pass should treat that tracker surface as reference material, not as the MVP contract

## Current blockers

The main blockers are content and field truth, not backend infrastructure.

Blocking items:
- candidate Bernal stops still need field verification
- first image set still needs to be gathered
- exact walk start/end still needs to be chosen
- implementation has not yet been aligned to the new static-first atlas shape

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
   - build the static-first atlas shell against the Bernal spec
   - load one canonical content file
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
