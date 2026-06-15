"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SEARCH_COST } from "@/lib/config";

interface Pack {
  id: string;
  credits: number;
  price: number;
  currency: "rub" | "usd";
  label: string;
}

function formatPrice(price: number, currency: "rub" | "usd"): string {
  return currency === "rub" ? `${price} ₽` : `$${price}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPurchased: (credits: number) => void;
}

export default function BuyCreditsModal({ open, onClose, onPurchased }: Props) {
  const { t, plural } = useI18n();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/payment")
      .then((r) => r.json())
      .then((d) => {
        setPacks(d.packs || []);
        setPaid(Boolean(d.enabled));
      })
      .catch(() => setError(t("buy.loadError")));
  }, [open, t]);

  if (!open) return null;

  const buy = async (packId: string) => {
    setBusy(packId);
    setError(null);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("buy.payError"));
      }

      if (data.mode === "checkout" && data.url) {
        // Запоминаем id платежа и уходим на страницу оплаты;
        // кредиты начислятся после проверки на возврате.
        window.localStorage.setItem("sherlock_pending_payment", String(data.id || ""));
        window.location.href = data.url as string;
        return;
      }

      // Demo fallback — grant instantly.
      setBusy(null);
      onPurchased(data.granted as number);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("buy.payError"));
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101018] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("buy.title")}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-white/50">
          {t("buy.subtitle", {
            n: SEARCH_COST,
            plural: plural(SEARCH_COST, "credits.plural"),
          })}
        </p>

        <div className="space-y-3">
          {packs.map((p) => (
            <button
              key={p.id}
              onClick={() => buy(p.id)}
              disabled={busy !== null}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-indigo-400/50 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <div>
                <p className="font-semibold">{p.label}</p>
                <p className="text-sm text-white/50">{t("buy.credits", { n: p.credits })}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-indigo-300">{formatPrice(p.price, p.currency)}</p>
                {busy === p.id && (
                  <p className="text-xs text-white/40">
                    {paid ? t("buy.redirecting") : t("buy.processing")}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200/80">
          {paid ? t("buy.payNote") : t("buy.demoNote")}
        </p>
      </div>
    </div>
  );
}
