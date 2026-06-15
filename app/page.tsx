"use client";

import { useCallback, useState } from "react";
import UploadCropper from "@/components/UploadCropper";
import Results from "@/components/Results";
import HistoryPanel from "@/components/HistoryPanel";
import BuyCreditsModal from "@/components/BuyCreditsModal";
import AcceptableUseGate from "@/components/AcceptableUseGate";
import LanguageToggle from "@/components/LanguageToggle";
import { useLocalState } from "@/lib/useLocalState";
import { useI18n } from "@/lib/i18n";
import type {
  HistoryEntry,
  ResultItem,
  SearchResponse,
  SearchStatus,
} from "@/lib/clientTypes";

const FREE_CREDITS = 3;

export default function Home() {
  const { t } = useI18n();
  const [credits, setCredits, creditsReady] = useLocalState<number>(
    "sherlock_credits",
    FREE_CREDITS,
  );
  const [history, setHistory] = useLocalState<HistoryEntry[]>(
    "sherlock_history",
    [],
  );
  const [accepted, setAccepted] = useLocalState<boolean>(
    "sherlock_accepted_use",
    false,
  );

  const [status, setStatus] = useState<SearchStatus>("idle");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBuy, setShowBuy] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [lastThumb, setLastThumb] = useState<string | null>(null);

  const runSearch = useCallback(
    async (blob: Blob, thumbnail: string) => {
      if (credits <= 0) {
        setShowBuy(true);
        return;
      }

      setStatus("searching");
      setError(null);
      setItems([]);

      const form = new FormData();
      form.append("image", blob, "query.jpg");

      try {
        const res = await fetch("/api/search", { method: "POST", body: form });
        const data = (await res.json()) as SearchResponse & {
          error?: string;
          code?: string;
          retryAfter?: number;
        };

        if (!res.ok) {
          if (data.code === "rate_limited") {
            setError(t("search.err.rate_limited", { n: data.retryAfter ?? 60 }));
          } else {
            const key = `search.err.${data.code || "provider_error"}`;
            setError(t(key));
          }
          setStatus("error");
          return;
        }

        // Successful search consumes one credit.
        setCredits((c) => Math.max(0, c - 1));

        setItems(data.items);
        setDemo(data.demo);
        const topScore = data.items.length
          ? Math.max(...data.items.map((i) => i.score))
          : null;

        setHistory((prev) =>
          [
            {
              id: crypto.randomUUID(),
              date: Date.now(),
              thumbnail,
              resultCount: data.items.length,
              topScore,
              demo: data.demo,
            },
            ...prev,
          ].slice(0, 20),
        );

        setStatus(data.items.length ? "success" : "empty");
      } catch {
        setError(t("search.err.network"));
        setStatus("error");
      }
    },
    [credits, setCredits, setHistory, t],
  );

  const handleSearch = useCallback(
    (blob: Blob, thumbnail: string) => {
      setLastBlob(blob);
      setLastThumb(thumbnail);
      runSearch(blob, thumbnail);
    },
    [runSearch],
  );

  const retry = useCallback(() => {
    if (lastBlob && lastThumb) runSearch(lastBlob, lastThumb);
  }, [lastBlob, lastThumb, runSearch]);

  const searching = status === "searching";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <AcceptableUseGate open={creditsReady && !accepted} onAccept={() => setAccepted(true)} />
      <BuyCreditsModal
        open={showBuy}
        onClose={() => setShowBuy(false)}
        onPurchased={(c) => setCredits((prev) => prev + c)}
      />

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <span className="text-indigo-400">🔎</span> Sherlock
          </h1>
          <p className="mt-1 text-sm text-white/50">{t("app.tagline")}</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm">
            <span className="text-white/50">{t("credits.label")}</span>{" "}
            <span className="font-semibold text-indigo-300">{credits}</span>
          </div>
          <button
            onClick={() => setShowBuy(true)}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            {t("buyCredits")}
          </button>
        </div>
      </header>

      {/* Acceptable use banner */}
      <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-200/80">
        {t("banner.warning")}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Left column: upload + history */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-4 text-lg font-semibold">{t("upload.title")}</h2>
            <UploadCropper disabled={searching} onSearch={handleSearch} />
          </section>

          <HistoryPanel history={history} onClear={() => setHistory([])} />
        </div>

        {/* Right column: results */}
        <section>
          <Results
            status={status}
            items={items}
            error={error}
            demo={demo}
            onRetry={retry}
          />
        </section>
      </div>

      <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/30">
        {t("footer")}
      </footer>
    </main>
  );
}
