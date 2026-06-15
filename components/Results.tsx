"use client";

import type { ResultItem, SearchMode, SearchStatus } from "@/lib/clientTypes";
import { useI18n } from "@/lib/i18n";

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-white/60";
}

function ResultCard({
  item,
  sourceFallback,
  showOpenButton,
  openLabel,
}: {
  item: ResultItem;
  sourceFallback: string;
  showOpenButton: boolean;
  openLabel: string;
}) {
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
          {item.source || sourceFallback}
        </p>
        <p className="truncate text-xs text-indigo-300/80 group-hover:text-indigo-200">
          {item.sourceUrl}
        </p>
        {showOpenButton && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200 group-hover:bg-indigo-500/25">
            {openLabel} ↗
          </span>
        )}
      </div>
    </a>
  );
}

interface Props {
  status: SearchStatus;
  items: ResultItem[];
  error: string | null;
  mode: SearchMode;
  progress?: number | null;
  onRetry?: () => void;
}

export default function Results({ status, items, error, mode, progress, onRetry }: Props) {
  const { t, plural } = useI18n();

  if (status === "idle") {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50">
        <div className="mb-3 text-3xl">🧩</div>
        <p>{t("results.idle")}</p>
      </div>
    );
  }

  if (status === "searching") {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <div className="spinner mb-4 h-10 w-10 rounded-full border-4 border-white/15 border-t-indigo-400" />
        <p className="font-medium">{t("results.searching.title")}</p>
        <p className="mt-1 text-sm text-white/50 pulse-soft">
          {t("results.searching.sub")}
        </p>
        {progress != null && (
          <div className="mt-4 w-full max-w-xs">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                style={{ width: `${Math.max(3, progress)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-white/40">{progress}%</p>
          </div>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
        <div className="mb-3 text-3xl">⚠️</div>
        <p className="font-medium text-rose-300">{t("results.error.title")}</p>
        <p className="mt-1 max-w-sm text-sm text-white/60">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
          >
            {t("results.retry")}
          </button>
        )}
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <div className="mb-3 text-3xl">🤷</div>
        <p className="font-medium">{t("results.empty.title")}</p>
        <p className="mt-1 max-w-sm text-sm text-white/50">{t("results.empty.sub")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {t("results.heading", { n: items.length, plural: plural(items.length, "results.plural") })}
        </h2>
        {mode === "testing" && (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
            {t("results.testing")}
          </span>
        )}
        {mode === "demo" && (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
            {t("results.demo")}
          </span>
        )}
      </div>
      {mode === "testing" && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-200/80">
          {t("results.testingHint")}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, i) => (
          <ResultCard
            key={`${item.sourceUrl}-${i}`}
            item={item}
            sourceFallback={t("results.source")}
            showOpenButton={mode === "testing"}
            openLabel={t("results.openSource")}
          />
        ))}
      </div>
    </div>
  );
}
