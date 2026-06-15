/**
 * Demo / mock Face Search provider.
 *
 * Used automatically when no FaceCheck.ID API token is configured, so the MVP
 * is fully runnable and demonstrable without credentials or network calls.
 *
 * It produces deterministic, synthetic results (generated SVG thumbnails and
 * example source URLs) and simulates provider latency. It does NOT contact any
 * external service and does NOT scrape any platform — every result is fake.
 */
import crypto from "node:crypto";
import {
  type FaceSearchInput,
  type FaceSearchPoll,
  type FaceSearchProvider,
  type FaceSearchResultItem,
  type FaceSearchStart,
} from "./types";

/** How long the demo pretends to "search" before returning results. */
const DEMO_DURATION_MS = 1500;

const DEMO_SOURCES = [
  { host: "example-social.test", path: "/u/" },
  { host: "demo-profiles.test", path: "/p/" },
  { host: "sample-news.test", path: "/article/" },
  { host: "placeholder-forum.test", path: "/member/" },
  { host: "mock-blog.test", path: "/author/" },
  { host: "test-directory.test", path: "/listing/" },
];

function svgThumb(seed: string, label: string): string {
  // Deterministic pastel gradient avatar so the demo looks plausible offline.
  const hash = crypto.createHash("md5").update(seed).digest("hex");
  const h1 = parseInt(hash.slice(0, 2), 16) % 360;
  const h2 = (h1 + 60 + (parseInt(hash.slice(2, 4), 16) % 120)) % 360;
  const initials = label.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="hsl(${h1},70%,55%)"/>
    <stop offset="100%" stop-color="hsl(${h2},65%,45%)"/>
  </linearGradient></defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <circle cx="100" cy="78" r="38" fill="rgba(255,255,255,0.85)"/>
  <rect x="46" y="120" width="108" height="70" rx="40" fill="rgba(255,255,255,0.85)"/>
  <text x="100" y="92" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="hsl(${h1},60%,35%)" text-anchor="middle">${initials}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export class DemoProvider implements FaceSearchProvider {
  readonly id = "demo";
  readonly isDemo = true;

  async start(input: FaceSearchInput): Promise<FaceSearchStart> {
    // Seed off the image bytes so the same photo yields stable results, and
    // embed a start timestamp so poll() can simulate progress without any
    // server-side state (works on stateless serverless).
    const seed = crypto.createHash("sha1").update(input.bytes).digest("hex");
    return {
      searchId: `demo:${seed}:${Date.now()}`,
      provider: this.id,
      demo: true,
    };
  }

  async poll(searchId: string): Promise<FaceSearchPoll> {
    const [, seed, startedAt] = searchId.split(":");
    const elapsed = Date.now() - Number(startedAt || 0);

    if (elapsed < DEMO_DURATION_MS) {
      return {
        status: "pending",
        progress: Math.min(95, Math.round((elapsed / DEMO_DURATION_MS) * 100)),
      };
    }

    return {
      status: "done",
      items: this.buildItems(seed || "0"),
      provider: this.id,
      demo: true,
    };
  }

  private buildItems(seed: string): FaceSearchResultItem[] {
    const count = 3 + (parseInt(seed.slice(0, 2), 16) % 4); // 3-6 results
    return Array.from({ length: count }, (_, i) => {
      const src = DEMO_SOURCES[(parseInt(seed.slice(i * 2, i * 2 + 2), 16) + i) % DEMO_SOURCES.length];
      const userId = seed.slice(i * 4, i * 4 + 8);
      // Descending plausible similarity scores.
      const score = Math.max(42, 96 - i * 9 - (parseInt(seed.slice(i + 4, i + 6), 16) % 5));
      return {
        score,
        sourceUrl: `https://${src.host}${src.path}${userId}`,
        thumbnail: svgThumb(seed + i, src.host),
        source: src.host,
      };
    });
  }
}
