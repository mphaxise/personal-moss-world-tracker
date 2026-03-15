# Founder MVP Decision Memo

Date: 2026-03-14

## Decision

The recommended MVP is `Bernal Heights Moss Atlas`.

This should not launch as:
- a citywide community submission app
- a generic Bay Area trails directory
- an iNaturalist-style citizen science product

It should launch as:
- a founder-led editorial atlas of one San Francisco neighborhood
- one curated walk
- 8 to 12 editorial stops
- a simple public-facing `moss` brand backed by broader internal research across mosses, liverworts, and lichens

## Product thesis

`Bernal Heights Moss Atlas` should be a neighborhood guide to the hidden fog-fed texture of San Francisco: walls, bark, exposed slopes, and wet soil habitats where mosses, liverworts, and lichens become legible through place-based stories.

Publicly, the product can stay simple and memorable:
- `moss atlas`

Internally, the editorial model should be broader:
- mosses
- liverworts
- lichens

That broader frame better matches actual San Francisco ecology and creates a richer product than a strict moss-only interpretation.

## Why this wedge

Bernal Heights is the right starting unit because it is:
- local and walkable
- dense enough to curate by hand
- distinct enough to carry a neighborhood identity
- connected to larger fog-belt and trail expansion paths later

The strongest reference point remains `SF Trees for moss`, not `Instagram for moss` and not `iNaturalist-lite`.

What makes the concept strong is not raw observations alone. It is:
- editorial point of view
- neighborhood specificity
- walking routes
- provenance and habitat detective work

## Evidence summary

### Seasonal signal

The spring-vs-late-summer comparison around Bernal-centered coordinates suggests that post-rain season is useful as an editorial frame, but not strong enough to define the entire product as spring-only.

At a 5 km scouting radius around Bernal Hill:
- `2024-02-20` to `2024-04-10`: 15 moss observations
- `2024-08-01` to `2024-09-15`: 9 moss observations
- `2025-02-20` to `2025-04-10`: 18 moss observations
- `2025-08-01` to `2025-09-15`: 19 moss observations
- `2026-02-20` to `2026-03-14`: 5 moss observations
- `2025-02-20` to `2025-03-14`: 5 moss observations

Interpretation:
- spring is a good launch season
- spring is not a strong enough exclusive claim to define the product
- the better framing is year-round atlas, with post-rain season as the sharpest editorial chapter

### Species broadening

San Francisco observation data supports widening the research frame beyond strict moss.

Citywide, the strongest moss candidates include:
- `Alsia californica`
- `Tortula muralis`
- `Syntrichia ruralis`
- `Bryum argenteum`
- `Dicranoweisia cirrata`
- `Homalothecium nuttallii`

Citywide liverworts are led by:
- `Lunularia cruciata`
- `Marchantia polymorpha`
- `Radula complanata`
- `Lophocolea bidentata`

Citywide lichens are especially strong and visually distinctive:
- `Xanthoria parietina`
- `Ramalina menziesii`
- `Niebla cephalota`
- `Flavoparmelia caperata`
- `Usnea rubicunda`
- `Niebla homalea`

For the Bernal scouting radius, the most relevant starter taxa look like:
- walls and concrete: `Tortula muralis`, `Bryum argenteum`, `Grimmia laevigata`
- bark and trees: `Alsia californica`, `Homalothecium nuttallii`, `Ulota crispa`, `Ramalina`
- exposed foggy slopes: `Niebla`, `Xanthoria`, `Polytrichum juniperinum`
- wet soil and seep zones: `Lunularia cruciata`, `Marchantia polymorpha`, `Fossombronia`

## MVP scope

Build:
- one Bernal Heights chapter
- one curated walk
- 8 to 12 stops
- one stop template with photo, place context, habitat notes, and why-this-spot matters
- one homepage narrative that explains why Bernal is a good lens on San Francisco's fog-fed urban texture

Do not build yet:
- open submissions as a primary surface
- full citywide coverage
- regional trail catalog
- route generator
- social features
- taxonomy-heavy UI

## Scale path

The most credible scale path is:
1. `Bernal Heights Moss Atlas`
2. more San Francisco neighborhood chapters
3. seasonal city walks
4. fog-belt trail guides within roughly one hour of San Francisco

This means the product can eventually scale to:
- Presidio
- Glen Canyon
- San Bruno Mountain
- Muir Woods
- Mount Tam
- Huddart Park
- Purisima Creek Redwoods

But that trail layer should be an expansion format, not the MVP.

The right product story is:
- neighborhood first
- trails second

## Risks

The main risks are:
- widening scope before the editorial format is proven
- treating public observation data as the product instead of a scouting layer
- building submission and infrastructure surfaces before proving that the curated walk and story format is compelling

## Kill criteria

This wedge is not working if:
- Bernal cannot produce 8 to 12 genuinely distinct, worth-walking stops
- the stories collapse into generic taxonomy blurbs
- the walk feels like a map of coordinates rather than a place-based narrative
- the broader moss plus liverwort plus lichen frame still does not make Bernal feel editorially rich

## Next move

The next workflow step should be `plan-eng-review`.

Reason:
- product direction is now chosen
- the remaining work is to convert this founder decision into a disciplined implementation plan
- the engineering review should define the thinnest useful MVP shape without reopening the product thesis

## Source notes

Reference products and ecology sources used in this decision:
- `https://www.sftrees.com/`
- `https://www.sftrees.com/walking-tours`
- `https://meep-lab.com/allprojects/fog/`
- `https://www.smcgov.org/parks/san-bruno-mountain-park-natural-features`
- `https://www.mountainwatch.org/mountain-journal/2019/4/4/bryophytes`
- `https://www.cnps-scv.org/events/calendar/eventdetail/2915/-/joint-chapter-hike-to-south-slope-walk-on-san-bruno-mountain-south-sf`

Key data sources:
- iNaturalist observations and species-counts API queries for Bernal-centered scouting windows and San Francisco County taxon distributions
