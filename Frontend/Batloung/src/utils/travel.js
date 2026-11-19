// Travel helpers: exact-place Google Maps directions + local travel estimate.
// Estimates use free no-key services (Nominatim geocode, OSRM routing) with
// graceful fallbacks so the UI never breaks if they are unavailable.

const geocodeCache = new Map();

export function directionsUrl(destination) {
  const value = typeof destination === "object" && destination
    ? `${destination.lat},${destination.lon}`
    : destination;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(value)}&travelmode=driving`;
}

function geocode(query) {
  if (!geocodeCache.has(query)) {
    const promise = fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } }
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => (rows[0] ? { lat: Number(rows[0].lat), lon: Number(rows[0].lon) } : null))
      .catch(() => null);
    geocodeCache.set(query, promise);
  }
  return geocodeCache.get(query);
}

/**
 * Geocodes the full address first, then progressively drops leading segments
 * (street -> suburb/city -> region) so a partially fictional address still
 * resolves to the nearest real place instead of failing.
 */
export async function resolveDestination(query) {
  const parts = String(query || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  for (let drop = 0; drop < parts.length; drop++) {
    const candidate = parts.slice(drop).join(", ");
    if (!candidate) break;
    const hit = await geocode(candidate);
    if (hit) return hit;
  }
  return null;
}

function currentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function routeKm(a, b) {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&alternatives=false`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return { km: route.distance / 1000, seconds: route.duration };
  } catch {
    return null;
  }
}

export async function estimateTravel(destinationQuery) {
  const dest = await resolveDestination(destinationQuery);
  if (!dest) return null;
  const origin = await currentLocation();
  if (!origin) return { dest, unavailable: true };
  const routed = await routeKm(origin, dest);
  if (routed) return { dest, km: routed.km, seconds: routed.duration, straight: false };
  return { dest, km: haversineKm(origin, dest), seconds: null, straight: true };
}

export function formatDuration(seconds) {
  const totalMin = Math.max(1, Math.round(seconds / 60));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatKm(km) {
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
