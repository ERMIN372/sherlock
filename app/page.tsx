"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UploadCropper from "@/components/UploadCropper";
import Results from "@/components/Results";
import HistoryPanel from "@/components/HistoryPanel";
import BuyCreditsModal from "@/components/BuyCreditsModal";
import AcceptableUseGate from "@/components/AcceptableUseGate";
import LanguageToggle from "@/components/LanguageToggle";
import { useLocalState } from "@/lib/useLocalState";
import { useI18n } from "@/lib/i18n";
import {
  resolveMode,
  type HistoryEntry,
  type ResultItem,
  type SearchMode,
  type SearchPollResponse,
  type SearchStartResponse,
  type SearchStatus,
} from "@/lib/clientTypes";

const FREE_CREDITS = 3;
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 90; // ~3 min — testing-mode queues can be long
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  // Идентификаторы уже зачтённых платёжных сессий — защита от повторного начисления.
  const [paidSessions, setPaidSessions, paidReady] = useLocalState<string[]>(
    "sherlock_paid_sessions",
    [],
  );
  const [payNotice, setPayNotice] = useState<
    { type: "success" | "error" | "info"; text: string } | null
  >(null);
  const payHandledRef = useRef(false);

  const [status, setStatus] = useState<SearchStatus>("idle");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [mode, setMode] = useState<SearchMode>("demo");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBuy, setShowBuy] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [lastThumb, setLastThumb] = useState<string | null>(null);

  // Обработка возврата со страницы оплаты Stripe (?paid=<session_id> | ?canceled=1).
  useEffect(() => {
    if (!creditsReady || !paidReady || payHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("paid");
    const canceled = params.get("canceled");
    if (!paid && !canceled) return;

    payHandledRef.current = true;
    const cleanUrl = () =>
      window.history.replaceState({}, "", window.location.pathname);

    if (canceled) {
      setPayNotice({ type: "info", text: t("pay.canceled") });
      cleanUrl();
      return;
    }

    // Уже зачтено ранее — просто чистим URL.
    if (paidSessions.includes(paid!)) {
      cleanUrl();
      return;
    }

    fetch(`/api/payment/verify?session_id=${encodeURIComponent(paid!)}`)
      .then((r) => r.json())
      .then((d: { paid?: boolean; credits?: number }) => {
        if (d.paid && d.credits && d.credits > 0) {
          setCredits((c) => c + d.credits!);
          setPaidSessions((s) => [...s, paid!].slice(-50));
          setPayNotice({ type: "success", text: t("pay.success", { n: d.credits }) });
        } else {
          setPayNotice({ type: "error", text: t("pay.failed") });
        }
      })
      .catch(() => setPayNotice({ type: "error", text: t("pay.failed") }))
      .finally(cleanUrl);
  }, [creditsReady, paidReady, paidSessions, setCredits, setPaidSessions, t]);

  const runSearch = useCallback(
    async (blob: Blob, thumbnail: string) => {
      if (credits <= 0) {
        setShowBuy(true);
        return;
      }

      setStatus("searching");
      setError(null);
      setItems([]);
      setProgress(null);

      const fail = (code?: string, retryAfter?: number) => {
        if (code === "rate_limited") {
          setError(t("search.err.rate_limited", { n: retryAfter ?? 60 }));
        } else {
          setError(t(`search.err.${code || "provider_error"}`));
        }
        setStatus("error");
      };

      try {
        // Phase 1 — start the search (uploads the image, returns a handle).
        const form = new FormData();
        form.append("image", blob, "query.jpg");
        const startRes = await fetch("/api/search", { method: "POST", body: form });
        const start = (await startRes.json()) as SearchStartResponse & {
          error?: string;
          code?: string;
          retryAfter?: number;
        };
        if (!startRes.ok) {
          fail(start.code, start.retryAfter);
          return;
        }

        setMode(resolveMode(start.provider, start.demo));

        // Phase 2 — poll for progress/results.
        for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
          await sleep(POLL_INTERVAL_MS);
          const pollRes = await fetch(
            `/api/search?id=${encodeURIComponent(start.searchId)}`,
          );
          const poll = (await pollRes.json()) as SearchPollResponse & {
            error?: string;
            code?: string;
          };
          if (!pollRes.ok) {
            fail(poll.code);
            return;
          }

          if (poll.status === "pending") {
            setProgress(poll.progress);
            continue;
          }

          // Done — consume one credit and record results.
          setCredits((c) => Math.max(0, c - 1));
          setProgress(null);
          setItems(poll.items);
          setMode(resolveMode(poll.provider, poll.demo));

          const topScore = poll.items.length
            ? Math.max(...poll.items.map((i) => i.score))
            : null;
          setHistory((prev) =>
            [
              {
                id: crypto.randomUUID(),
                date: Date.now(),
                thumbnail,
                resultCount: poll.items.length,
                topScore,
                demo: poll.demo,
              },
              ...prev,
            ].slice(0, 20),
          );

          setStatus(poll.items.length ? "success" : "empty");
          return;
        }

        // Exhausted polling budget.
        fail("timeout");
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

      {/* Уведомление о результате оплаты */}
      {payNotice && (
        <div
          className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            payNotice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-200"
              : payNotice.type === "error"
                ? "border-rose-500/30 bg-rose-500/[0.08] text-rose-200"
                : "border-white/15 bg-white/[0.04] text-white/70"
          }`}
        >
          <span>{payNotice.text}</span>
          <button
            onClick={() => setPayNotice(null)}
            className="shrink-0 text-current/60 hover:opacity-70"
            aria-label="×"
          >
            ✕
          </button>
        </div>
      )}

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
            mode={mode}
            progress={progress}
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
