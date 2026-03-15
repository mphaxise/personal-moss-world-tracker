# Challenge Pack Schema

Date: 2026-03-15
Status: proposed source of truth

## Goal

Define one canonical content model for the new `challenge-first` product direction.

The schema should support:

- one adult and one child using separate devices
- lightweight neighborhood nature challenges
- photo-first progress
- offline-friendly local collection
- end-of-walk merge, upload, and recap

## Product rule

A `challenge pack` is not a route.

It is:

- a small set of prompts
- one shared theme
- simple completion rules
- optional neighborhood framing

This is the key shift from the Bernal atlas content model.

## File location

Recommended structure:

```text
content/
  challenges/
    rainbow-hunt-v1.json
    pick-your-color-v1.json
    tiny-worlds-v1.json
```

Optional future manifest:

```text
content/
  challenges/
    manifest.json
```

## Top-level shape

```json
{
  "meta": {},
  "pack": {},
  "participants": {},
  "rules": {},
  "cards": [],
  "recap": {}
}
```

## Required top-level fields

### `meta`

Required:

- `id`
- `slug`
- `title`
- `version`
- `updated_at`
- `status`

Example:

```json
{
  "id": "rainbow-hunt-v1",
  "slug": "rainbow-hunt",
  "title": "Rainbow Hunt",
  "version": 1,
  "updated_at": "2026-03-15",
  "status": "active"
}
```

### `pack`

Required:

- `title`
- `tagline`
- `summary`
- `estimated_minutes`
- `difficulty`
- `age_band`
- `play_style`
- `theme_tags`

Notes:

- `play_style` should be one of `shared`, `parallel`, or `hybrid`
- `difficulty` should be one of `easy`, `medium`, or `stretch`

### `participants`

Required:

- `adult_label`
- `kid_label`
- `device_mode`

Recommended:

- `adult_role`
- `kid_role`

Example:

```json
{
  "adult_label": "Parent",
  "kid_label": "Kid explorer",
  "device_mode": "two-device-preferred",
  "adult_role": "guide and recorder",
  "kid_role": "scout and photographer"
}
```

### `rules`

Required:

- `completion_target`
- `photo_required`
- `scoring_mode`
- `allow_shared_completion`
- `allow_duplicate_subjects`

Recommended:

- `bonus_rules`
- `safety_note`
- `weather_note`

### `cards`

Each card is one collectible unit in the walk.

Required fields per card:

- `id`
- `order`
- `title`
- `prompt`
- `capture_type`
- `assigned_to`
- `completion_rule`
- `points`
- `tags`

Recommended:

- `hint`
- `examples`
- `kid_prompt`
- `adult_prompt`
- `options`
- `photo_required`
- `min_count`
- `max_count`
- `color`
- `texture`

Allowed values:

- `capture_type`: `photo`, `photo-or-mark`, `count`, `choice`
- `assigned_to`: `either`, `adult`, `kid`, `both`, `shared`
- `options`: required when `capture_type` is `choice`

### `recap`

Required:

- `title`
- `success_message`
- `partial_message`
- `empty_message`

Recommended:

- `group_by`
- `highlight_rules`

## Runtime collection shape

Each device should store progress separately, then merge by `card_id`.

Recommended saved shape:

```json
{
  "pack_id": "rainbow-hunt-v1",
  "participant_role": "adult",
  "updated_at": "2026-03-15T16:40:00-07:00",
  "cards": {
    "rainbow-red": {
      "status": "done",
      "completed_at": "2026-03-15T16:21:00-07:00",
      "photo_captured": true,
      "photo_export_data_url": "data:image/jpeg;base64,...",
      "note": "",
      "tags": ["flower", "red"]
    }
  }
}
```

## Merge rules

The merge behavior should be deterministic and simple.

For v1:

- merge by `card_id`
- if either participant marks a shared card complete, it counts as complete
- if both submit photos for the same card, keep both in recap
- adult export remains the final merge surface
- kid export or upload should not overwrite adult data silently

## First three challenge packs

## 1. Rainbow Hunt

### Product role

This should be the headline challenge.

### Pack rules

- `completion_target`: all 6 rainbow colors
- `photo_required`: true
- `scoring_mode`: fixed-points-plus-bonus
- `allow_shared_completion`: true
- `allow_duplicate_subjects`: false across color cards

### Card structure

Use 6 cards:

- red
- orange
- yellow
- green
- blue
- purple

Each card should:

- require one photo
- accept completion by either participant
- allow simple tags such as `flower`, `leaf`, `bark`, `stone`, `sky`, `lichen`

### Scoring

- 10 points per completed color
- 20 point bonus for full rainbow
- 10 point bonus if at least 4 colors came from living things rather than paint or signage

### Recap

Group recap by color and show:

- best photo
- who found it
- what it was

## 2. Pick Your Color

### Product role

This should be the most replayable challenge.

### Pack rules

- adult chooses one color
- kid chooses one color
- each participant tries to collect 3 strong matches
- `photo_required`: true
- `scoring_mode`: count-based
- `allow_shared_completion`: false
- `allow_duplicate_subjects`: true

### Card structure

Use 6 setup cards:

- adult color choice
- kid color choice
- adult capture 1
- adult capture 2
- adult capture 3
- kid capture 1
- kid capture 2
- kid capture 3

For v1, the chosen colors should come from a small preset:

- red
- orange
- yellow
- green
- blue
- purple
- white
- pink

### Scoring

- 10 points per completed photo slot
- 10 point bonus if all three photos for a participant are unique subjects
- recap should compare the two colors side by side

## 3. Tiny Worlds

### Product role

This is the bridge back to the original moss sensibility.

### Pack rules

- `completion_target`: find 3 of 5 texture cards
- `photo_required`: true
- `scoring_mode`: milestone
- `allow_shared_completion`: true
- `allow_duplicate_subjects`: false

### Card structure

Use 5 cards:

- bark texture
- leaf detail
- stone pattern
- tiny green world
- seed, flower, or pod detail

`tiny green world` should intentionally allow:

- moss
- lichen
- liverwort
- small green texture that feels micro-scale

This keeps the challenge accessible even when exact taxonomy is unclear.

### Scoring

- 15 points per completed card
- 15 point bonus for 3 different substrate types

## Authoring constraints

For v1 challenge packs:

- no freeform mission logic
- no nested branching
- no map-required waypoints
- no live species identification dependency
- no long text prompts for kids

## Validation rules

Every pack should validate:

- all required top-level fields exist
- `meta.id` matches filename
- card IDs are unique
- card order is unique and sequential
- `assigned_to` is valid
- `capture_type` is valid
- points are integers
- recap messages exist

## Bottom line

The schema should optimize for:

- simple authoring
- light runtime logic
- repeatable neighborhood walks
- strong adult and kid coordination

This is the content contract the app should now pivot toward.
