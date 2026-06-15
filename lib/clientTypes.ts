export interface ResultItem {
  score: number;
  sourceUrl: string;
  thumbnail: string;
  source?: string;
}

export interface SearchStartResponse {
  searchId: string;
  provider: string;
  demo: boolean;
  rateLimit?: { remaining: number; limit: number };
}

export type SearchPollResponse =
  | { status: "pending"; progress: number; message?: string }
  | {
      status: "done";
      provider: string;
      demo: boolean;
      count: number;
      items: ResultItem[];
    };

export interface HistoryEntry {
  id: string;
  date: number;
  thumbnail: string;
  resultCount: number;
  topScore: number | null;
  demo: boolean;
}

export type SearchStatus = "idle" | "searching" | "success" | "empty" | "error";
