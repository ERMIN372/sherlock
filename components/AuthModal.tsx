"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Вызывается после успешного входа/регистрации. */
  onAuthed: (email: string, searches: number | null) => void;
}

type Mode = "login" | "register" | "forgot";

export default function AuthModal({ open, onClose, onAuthed }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [providers, setProviders] = useState<{ yandex: boolean; vk: boolean }>({
    yandex: false,
    vk: false,
  });

  useEffect(() => {
    if (!open) return;
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d) => setProviders({ yandex: !!d.yandex, vk: !!d.vk }))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setError(null);
    setNotice(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    reset();
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(t(data.code ? `auth.err.${data.code}` : "auth.err.generic"));
          return;
        }
        setNotice(t("auth.forgotSent"));
        return;
      }

      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t(data.code ? `auth.err.${data.code}` : "auth.err.generic"));
        return;
      }
      onAuthed(data.email as string, (data.searches ?? null) as number | null);
    } catch {
      setError(t("auth.err.generic"));
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "login" ? t("auth.title.login") : mode === "register" ? t("auth.title.register") : t("auth.title.forgot");
  const submitLabel =
    mode === "login" ? t("auth.submit.login") : mode === "register" ? t("auth.submit.register") : t("auth.submit.forgot");

  const hasOAuth = providers.yandex || providers.vk;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101018] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white" aria-label="×">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-white/50">{t("auth.subtitle")}</p>

        {/* OAuth (только на входе/регистрации, если настроено) */}
        {mode !== "forgot" && hasOAuth && (
          <div className="mb-4 space-y-2">
            {providers.yandex && (
              <a
                href="/api/auth/oauth/yandex"
                className="block w-full rounded-xl bg-[#fc3f1d] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                {t("auth.oauth.yandex")}
              </a>
            )}
            {providers.vk && (
              <a
                href="/api/auth/oauth/vk"
                className="block w-full rounded-xl bg-[#0077ff] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                {t("auth.oauth.vk")}
              </a>
            )}
            <div className="flex items-center gap-3 py-1 text-xs text-white/40">
              <span className="h-px flex-1 bg-white/10" />
              {t("auth.or")}
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.email")}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-indigo-400/50"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.password")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-indigo-400/50"
            />
          )}
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {notice && <p className="text-sm text-emerald-300">{notice}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-1 text-xs text-white/50">
          {mode === "login" && (
            <>
              <button onClick={() => { setMode("register"); reset(); }} className="hover:text-white">
                {t("auth.toggleToRegister")}
              </button>
              <button onClick={() => { setMode("forgot"); reset(); }} className="hover:text-white">
                {t("auth.forgot")}
              </button>
            </>
          )}
          {mode === "register" && (
            <button onClick={() => { setMode("login"); reset(); }} className="hover:text-white">
              {t("auth.toggleToLogin")}
            </button>
          )}
          {mode === "forgot" && (
            <button onClick={() => { setMode("login"); reset(); }} className="hover:text-white">
              {t("auth.backToLogin")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
