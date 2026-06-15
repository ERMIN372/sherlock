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
  type FaceSearchPoll,
  type FaceSearchProvider,
  type FaceSearchResultItem,
  type FaceSearchStart,
} from "./types";

const BASE_URL = process.env.FACECHECK_API_URL || "https://facecheck.id";

interface FaceCheckItem {
  guid: string;
  score: number;
  group?: number;
  base64?: string;
  url?: string;
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

  async start(input: FaceSearchInput): Promise<FaceSearchStart> {
    const searchId = await this.upload(input);
    return { searchId, provider: this.id, demo: this.testingMode };
  }

  async poll(searchId: string): Promise<FaceSearchPoll> {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/search`, {
        method: "POST",
        headers: this.headers({ "content-type": "application/json" }),
        body: JSON.stringify({
          id_search: searchId,
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
      throw new FaceSearchError(
        data.message || data.error!,
        res.status === 429 ? "rate_limited" : "provider_error",
        res.status === 429 ? 429 : 502,
      );
    }

    if (data.output?.items) {
      return {
        status: "done",
        items: data.output.items.map(this.mapItem),
        provider: this.id,
        demo: this.testingMode,
      };
    }

    return {
      status: "pending",
      progress: typeof data.progress === "number" ? data.progress : 0,
      message: data.message,
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
}
