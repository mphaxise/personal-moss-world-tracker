# iNaturalist Enrichment Spike

## Pause checkpoint (2026-02-24)

Project is currently paused pending validation of persistence behavior.
Next mandatory step before advancing this spike work:
- Confirm latest entries/photos persist and reload correctly across refresh/reopen sessions.

## Spike date

- 2026-02-24

## Goal

Validate a lightweight enrichment path that can attach optional species context to a moss entry without blocking core submission and browsing flows.

## What was implemented

- Added per-entry action in UI: `Try iNaturalist enrichment`.
- Added client-side lookup path to iNaturalist observations API:
  - Endpoint: `https://api.inaturalist.org/v1/observations`
  - Query mode A (preferred): `lat`, `lng`, `radius=2` for location-based nearest result.
  - Query mode B (fallback): `q=<title>` and optional `place_guess=<location_label>`.
- Persisted two optional entry fields in local app state:
  - `inat_observation_id`
  - `inat_summary`

## Results

- Integration path is wired into the MVP and non-blocking.
- If a result exists, UI shows a short summary (taxon, quality grade, observed date).
- If no result exists, UI shows a clear no-match message.
- Failures are surfaced per entry and do not break card/map rendering.

## Constraints and caveats

- This prototype performs direct client-side API calls; rate limits and network conditions are unmanaged.
- Match quality can be weak when entries lack coordinates or when title text is ambiguous.
- No server-side cache, retries, or confidence scoring in MVP scope.

## Recommendation for next increment

- Add confidence metadata and a small "why this match" explanation.
- Prefer location-based lookups whenever coordinates are present.
- Add optional backend proxy for caching and request controls if public traffic increases.
