export interface ResultItem {
  score: number;
  sourceUrl: string;
  thumbnail: string;
  source?: string;
}

export interface SearchResponse {
  provider: string;
  demo: boolean;
  count: number;
  items: ResultItem[];
  rateLimit?: { remaining: number; limit: number };
}

export interface HistoryEntry {
  id: string;
  date: number;
  thumbnail: string;
  resultCount: number;
  topScore: number | null;
  demo: boolean;
}

export type SearchStatus = "idle" | "searching" | "success" | "empty" | "error";
