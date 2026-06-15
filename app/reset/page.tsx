"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function ResetPage() {
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t(data.code ? `auth.err.${data.code}` : "auth.err.generic"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("auth.err.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <span className="text-indigo-400">🔎</span> Sherlock
      </h1>
      <h2 className="mb-4 text-lg font-semibold">{t("reset.title")}</h2>

      {done ? (
        <div className="space-y-4">
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-200">
            {t("reset.success")}
          </p>
          <Link
            href="/"
            className="block w-full rounded-xl bg-indigo-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            {t("reset.home")}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("reset.password")}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-indigo-400/50"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {t("reset.submit")}
          </button>
        </form>
      )}
    </main>
  );
}
