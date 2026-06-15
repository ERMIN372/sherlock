// Face matching: compare 128-dimensional face descriptors produced by face-api.js.
// Everything here is pure math on vectors — no images, no ML on the server.

// A descriptor distance below this is considered the same person (face-api convention).
export const MATCH_THRESHOLD = 0.6;
// Only surface results scoring at least this percent.
export const MIN_SCORE = 50;

export function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// Map a raw distance to a friendly 0–100 "match %".
// distance 0.2 -> 100%, 0.6 -> 50%, 1.0 -> 0%.
export function distanceToScore(distance) {
  const score = (1 - (distance - 0.2) / 0.8) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Rank candidate profiles against a query descriptor.
 * @param {number[]} query - 128-d descriptor of the searched face.
 * @param {Array<{descriptor:number[]}>} profiles - candidate profiles.
 * @param {number} [limit=20]
 */
export function rankMatches(query, profiles, limit = 20) {
  return profiles
    .map((p) => {
      const distance = euclideanDistance(query, p.descriptor);
      return {
        ...p,
        descriptor: undefined, // don't leak raw biometrics back to the client
        distance,
        score: distanceToScore(distance),
        strong: distance < 0.45,
      };
    })
    .filter((m) => Number.isFinite(m.distance) && m.score >= MIN_SCORE)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
