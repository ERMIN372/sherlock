/**
 * Shared types for the Face Search provider abstraction.
 *
 * The app talks to face-search backends only through the `FaceSearchProvider`
 * interface, so we can swap a real third-party API (FaceCheck.ID) for a local
 * demo adapter without touching the UI or API routes.
 */

export interface FaceSearchResultItem {
  /** Visual-similarity score, 0-100. */
  score: number;
  /** Public URL of the source where the matching photo was found. */
  sourceUrl: string;
  /** Thumbnail of the matching photo (remote URL or data URL). */
  thumbnail: string;
  /** Optional human-friendly host/source label. */
  source?: string;
}

export interface FaceSearchOutcome {
  items: FaceSearchResultItem[];
  /** Identifier of the provider that produced the results. */
  provider: string;
  /** True when results come from the demo adapter (not a live API). */
  demo: boolean;
}

/** Handle returned by `start()` — used to poll for results. */
export interface FaceSearchStart {
  /** Opaque search id understood by the provider's `poll()`. */
  searchId: string;
  /** Identifier of the provider handling the search. */
  provider: string;
  /** True when the search runs against the demo adapter or testing mode. */
  demo: boolean;
}

/** Result of a single `poll()` call. */
export type FaceSearchPoll =
  | { status: "pending"; progress: number; message?: string }
  | {
      status: "done";
      items: FaceSearchResultItem[];
      provider: string;
      demo: boolean;
    };

export interface FaceSearchInput {
  /** Raw bytes of the (already cropped) query image. */
  bytes: Buffer;
  /** Original mime type of the image, e.g. "image/jpeg". */
  mimeType: string;
  /** Optional file name for multipart uploads. */
  fileName?: string;
}

export interface FaceSearchProvider {
  /** Stable identifier, e.g. "facecheck" or "demo". */
  readonly id: string;
  /** Whether this provider returns synthetic/demo data. */
  readonly isDemo: boolean;
  /**
   * Phase 1 — upload the (cropped) query image and return a handle. The search
   * runs asynchronously on the provider side; this call must stay short so it
   * fits within serverless time limits. Implementations MUST NOT persist the
   * uploaded image beyond the lifetime of this call.
   */
  start(input: FaceSearchInput): Promise<FaceSearchStart>;
  /**
   * Phase 2 — poll for progress/results using the handle from `start()`.
   * Returns quickly with either a pending progress update or the final items.
   */
  poll(searchId: string): Promise<FaceSearchPoll>;
}

export class FaceSearchError extends Error {
  constructor(
    message: string,
    readonly code:
      | "no_face"
      | "rate_limited"
      | "provider_error"
      | "timeout"
      | "bad_request" = "provider_error",
    readonly status = 502,
  ) {
    super(message);
    this.name = "FaceSearchError";
  }
}
