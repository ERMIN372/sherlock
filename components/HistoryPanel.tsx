"use client";

import type { HistoryEntry } from "@/lib/clientTypes";
import { useI18n } from "@/lib/i18n";

interface Props {
  history: HistoryEntry[];
  onClear: () => void;
}

function timeAgo(ts: number, t: (key: string, p?: Record<string, string | number>) => string): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return t("time.justNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("time.minutes", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("time.hours", { n: h });
  return t("time.days", { n: Math.floor(h / 24) });
}

export default function HistoryPanel({ history, onClear }: Props) {
  const { t, plural } = useI18n();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">{t("history.title")}</h3>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-white/50 transition hover:text-rose-300"
          >
            {t("history.clear")}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-white/40">{t("history.empty")}</p>
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
                  {h.resultCount} {plural(h.resultCount, "results.plural")}
                  {h.topScore != null && (
                    <span className="text-white/50">{t("history.top", { n: h.topScore })}</span>
                  )}
                </p>
                <p className="text-xs text-white/40">
                  {timeAgo(h.date, t)}
                  {h.demo && t("history.demo")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-white/30">
        {t("history.note")}
      </p>
    </div>
  );
}
