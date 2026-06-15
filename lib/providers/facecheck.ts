/**
 * FaceCheck.ID adapter.
 *
 * Implements the official FaceCheck.ID REST flow:
 *   1. POST /api/upload_pic  (multipart) -> id_search
 *   2. POST /api/search      (json, poll with_progress) -> output.items
 *
 * We rely only on the documented public API and never scrape any platform.
 * The uploaded image lives only on FaceCheck's side for the duration of the
 * search; we never write it to our own disk.
 *
 * Docs: https://facecheck.id/Face-Search-API
 */
import {
  FaceSearchError,
  type FaceSearchInput,
  type FaceSearchOutcome,
  type FaceSearchProvider,
  type FaceSearchResultItem,
} from "./types";

const BASE_URL = process.env.FACECHECK_API_URL || "https://facecheck.id";
const MAX_POLLS = 60; // ~ up to 60 * 2s = 2 min
const POLL_INTERVAL_MS = 2000;

interface FaceCheckItem {
  guid: string;
  score: number;
  group?: number;
  base64?: string;
  url?: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

export class FaceCheckProvider implements FaceSearchProvider {
  readonly id = "facecheck";
  readonly isDemo = false;

  constructor(
    private readonly token: string,
    /** When true, FaceCheck returns canned demo results without spending credits. */
    private readonly testingMode = process.env.FACECHECK_TESTING_MODE === "true",
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      accept: "application/json",
      Authorization: this.token,
      ...extra,
    };
  }

  async search(input: FaceSearchInput): Promise<FaceSearchOutcome> {
    const idSearch = await this.upload(input);
    const items = await this.poll(idSearch);

    return {
      items: items.map(this.mapItem),
      provider: this.id,
      demo: this.testingMode,
    };
  }

  private mapItem(item: FaceCheckItem): FaceSearchResultItem {
    const sourceUrl = item.url || "";
    return {
      score: Math.round(item.score),
      sourceUrl,
      thumbnail: item.base64 || "",
      source: sourceUrl ? hostLabel(sourceUrl) : undefined,
    };
  }

  private async upload(input: FaceSearchInput): Promise<string> {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(input.bytes)], { type: input.mimeType });
    form.append("images", blob, input.fileName || "query.jpg");

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/upload_pic`, {
        method: "POST",
        headers: this.headers(),
        body: form,
      });
    } catch {
      throw new FaceSearchError("Could not reach FaceCheck.ID", "provider_error");
    }

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      id_search?: string;
    };

    if (!res.ok || data.error) {
      throw new FaceSearchError(
        data.message || data.error || "Upload failed",
        res.status === 429 ? "rate_limited" : "provider_error",
        res.status === 429 ? 429 : 502,
      );
    }
    if (!data.id_search) {
      throw new FaceSearchError("No search id returned by provider", "provider_error");
    }
    return data.id_search;
  }

  private async poll(idSearch: string): Promise<FaceCheckItem[]> {
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/api/search`, {
          method: "POST",
          headers: this.headers({ "content-type": "application/json" }),
          body: JSON.stringify({
            id_search: idSearch,
            with_progress: true,
            status_only: false,
            demo: this.testingMode,
          }),
        });
      } catch {
        throw new FaceSearchError("Lost connection to FaceCheck.ID", "provider_error");
      }

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        progress?: number;
        output?: { items?: FaceCheckItem[] };
      };

      if (data.error) {
        const msg = (data.message || data.error || "").toLowerCase();
        if (msg.includes("no face") || msg.includes("face not")) {
          throw new FaceSearchError(
            "No face was detected in the uploaded image.",
            "no_face",
            422,
          );
        }
        throw new FaceSearchError(data.message || data.error!, "provider_error");
      }

      if (data.output?.items) {
        return data.output.items;
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new FaceSearchError("Search timed out, please try again.", "timeout", 504);
  }
}
