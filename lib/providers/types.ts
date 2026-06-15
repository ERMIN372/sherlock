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
   * Run a face search. Implementations MUST NOT persist the uploaded image
   * beyond the lifetime of this call; any remote-side copy must be deleted
   * once results are obtained.
   */
  search(input: FaceSearchInput): Promise<FaceSearchOutcome>;
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
