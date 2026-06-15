"use client";

import type { HistoryEntry } from "@/lib/clientTypes";

interface Props {
  history: HistoryEntry[];
  onClear: () => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HistoryPanel({ history, onClear }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Search history</h3>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-white/50 transition hover:text-rose-300"
          >
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-white/40">No searches yet.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={h.thumbnail}
                alt="Query"
                className="h-10 w-10 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {h.resultCount} result{h.resultCount === 1 ? "" : "s"}
                  {h.topScore != null && (
                    <span className="text-white/50"> · top {h.topScore}%</span>
                  )}
                </p>
                <p className="text-xs text-white/40">
                  {timeAgo(h.date)}
                  {h.demo && " · demo"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-white/30">
        History is stored only in your browser. Uploaded photos are never kept
        on our servers.
      </p>
    </div>
  );
}
