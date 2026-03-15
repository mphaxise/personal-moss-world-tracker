#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = process.cwd();
const CONTENT_PATH = path.join(ROOT, 'content', 'bernal-heights-atlas.json');
const USER_AGENT = 'personal-moss-world-tracker/1.0 (local enrichment script)';
const TAXON_IDS = '311249,64615,54743';
const PRIMARY_RADIUS_KM = 0.35;
const FALLBACK_RADIUS_KM = 0.8;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

function photoUrlForSize(url, size = 'medium') {
  return String(url || '').replace('/square.', `/${size}.`);
}

function buildGoogleDirectionsUrl(content) {
  const start = `${content.collection.start_point.latitude},${content.collection.start_point.longitude}`;
  const orderedStops = [...content.stops].sort((a, b) => a.walk_order - b.walk_order);
  const destination = orderedStops[orderedStops.length - 1];
  const waypoints = orderedStops.slice(0, -1).map((stop) => `${stop.latitude},${stop.longitude}`).join('|');
  const params = new URLSearchParams({
    api: '1',
    origin: start,
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: 'walking',
    waypoints,
    dir_action: 'navigate',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

async function fetchRecentPhotos(stop) {
  const queries = [PRIMARY_RADIUS_KM, FALLBACK_RADIUS_KM];

  for (const radius of queries) {
    const url = new URL('https://api.inaturalist.org/v1/observations');
    url.searchParams.set('lat', String(stop.latitude));
    url.searchParams.set('lng', String(stop.longitude));
    url.searchParams.set('radius', String(radius));
    url.searchParams.set('photos', 'true');
    url.searchParams.set('taxon_id', TAXON_IDS);
    url.searchParams.set('order_by', 'observed_on');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('per_page', '8');

    const payload = await fetchJson(url.toString());
    const photos = (payload.results || [])
      .filter((result) => Array.isArray(result.photos) && result.photos.length > 0)
      .slice(0, 2)
      .map((result) => ({
        observation_id: result.id,
        observed_on: result.observed_on || '',
        taxon_name: result.taxon?.name || '',
        common_name: result.taxon?.preferred_common_name || '',
        place_guess: result.place_guess || '',
        observation_url: result.uri || `https://www.inaturalist.org/observations/${result.id}`,
        photo_url: photoUrlForSize(result.photos[0]?.url, 'medium'),
        thumbnail_url: photoUrlForSize(result.photos[0]?.url, 'square'),
        attribution: result.photos[0]?.attribution || '',
        radius_km: radius,
      }));

    if (photos.length >= 2 || radius === FALLBACK_RADIUS_KM) {
      return photos;
    }
  }

  return [];
}

async function reverseGeocode(stop) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(stop.latitude));
  url.searchParams.set('lon', String(stop.longitude));

  const payload = await fetchJson(url.toString());
  return {
    display_name: payload.display_name || '',
    road: payload.address?.road || '',
    house_number: payload.address?.house_number || '',
    neighbourhood: payload.address?.neighbourhood || payload.address?.suburb || '',
    postcode: payload.address?.postcode || '',
  };
}

async function main() {
  const content = JSON.parse(await fs.readFile(CONTENT_PATH, 'utf8'));

  content.collection.google_maps_route_url = buildGoogleDirectionsUrl(content);

  for (const stop of content.stops) {
    const [address, photos] = await Promise.all([
      reverseGeocode(stop),
      fetchRecentPhotos(stop),
    ]);

    stop.reverse_geocode = address;
    stop.google_maps_address = address.display_name || stop.location_hint;
    stop.google_maps_stop_url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stop.latitude},${stop.longitude}`)}`;
    stop.inat_recent_photos = photos;
  }

  content.meta.updated_at = new Date().toISOString().slice(0, 10);
  await fs.writeFile(CONTENT_PATH, `${JSON.stringify(content, null, 2)}\n`);
  console.log(`Updated ${CONTENT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
