/**
 * Provider factory.
 *
 * Selects the active FaceSearchProvider based on environment configuration:
 *   - FACE_SEARCH_PROVIDER=demo            -> always use the demo adapter
 *   - FACECHECK_API_TOKEN set (+ not demo) -> use the live FaceCheck.ID adapter
 *   - otherwise                            -> fall back to the demo adapter
 */
import { DemoProvider } from "./demo";
import { FaceCheckProvider } from "./facecheck";
import type { FaceSearchProvider } from "./types";

export function getProvider(): FaceSearchProvider {
  const selected = (process.env.FACE_SEARCH_PROVIDER || "").toLowerCase();
  const token = process.env.FACECHECK_API_TOKEN;

  if (selected === "demo") return new DemoProvider();
  if (selected === "facecheck" || (!selected && token)) {
    if (!token) {
      throw new Error("FACE_SEARCH_PROVIDER=facecheck but FACECHECK_API_TOKEN is not set");
    }
    return new FaceCheckProvider(token);
  }
  return new DemoProvider();
}

export * from "./types";
