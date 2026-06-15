"use client";

import { useEffect, useState } from "react";

interface Pack {
  id: string;
  credits: number;
  price: number;
  label: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPurchased: (credits: number) => void;
}

export default function BuyCreditsModal({ open, onClose, onPurchased }: Props) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/payment")
      .then((r) => r.json())
      .then((d) => setPacks(d.packs || []))
      .catch(() => setError("Could not load credit packs."));
  }, [open]);

  if (!open) return null;

  const buy = async (packId: string) => {
    setBusy(packId);
    setError(null);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Payment failed");
      }
      onPurchased(data.granted as number);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
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
          <h2 className="text-lg font-semibold">Get more credits</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-white/50">
          Each search costs 1 credit. Pick a pack below.
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
                <p className="text-sm text-white/50">{p.credits} credits</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-indigo-300">${p.price}</p>
                {busy === p.id && (
                  <p className="text-xs text-white/40">Processing…</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200/80">
          Demo checkout — no real payment is processed. Credits are granted
          instantly for demonstration purposes.
        </p>
      </div>
    </div>
  );
}
