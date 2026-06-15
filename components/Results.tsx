"use client";

import type { ResultItem, SearchStatus } from "@/lib/clientTypes";

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-white/60";
}

function ResultCard({ item }: { item: ResultItem }) {
  return (
    <a
      href={item.sourceUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-indigo-400/50 hover:bg-white/[0.06]"
    >
      <div className="relative aspect-square w-full bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail}
          alt="Matching result"
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-bold backdrop-blur">
          <span className={scoreColor(item.score)}>{item.score}%</span>
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-white/90">
          {item.source || "Source"}
        </p>
        <p className="truncate text-xs text-indigo-300/80 group-hover:text-indigo-200">
          {item.sourceUrl}
        </p>
      </div>
    </a>
  );
}

interface Props {
  status: SearchStatus;
  items: ResultItem[];
  error: string | null;
  demo: boolean;
  onRetry?: () => void;
}

export default function Results({ status, items, error, demo, onRetry }: Props) {
  if (status === "idle") {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50">
        <div className="mb-3 text-3xl">🧩</div>
        <p>Upload and crop a face to begin your search.</p>
      </div>
    );
  }

  if (status === "searching") {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <div className="spinner mb-4 h-10 w-10 rounded-full border-4 border-white/15 border-t-indigo-400" />
        <p className="font-medium">Searching public web sources…</p>
        <p className="mt-1 text-sm text-white/50 pulse-soft">
          Matching the face against indexed images. This can take up to a minute.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
        <div className="mb-3 text-3xl">⚠️</div>
        <p className="font-medium text-rose-300">Search failed</p>
        <p className="mt-1 max-w-sm text-sm text-white/60">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <div className="mb-3 text-3xl">🤷</div>
        <p className="font-medium">No similar faces found</p>
        <p className="mt-1 max-w-sm text-sm text-white/50">
          We couldn&apos;t find visually similar public photos. Try a clearer,
          front-facing photo.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {items.length} result{items.length === 1 ? "" : "s"}
        </h2>
        {demo && (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
            Demo results
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, i) => (
          <ResultCard key={`${item.sourceUrl}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}
