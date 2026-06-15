"use client";

import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onAccept: () => void;
}

/**
 * One-time acceptable-use gate shown before the first search. The user must
 * acknowledge the permitted-use terms before the tool can be used.
 */
export default function AcceptableUseGate({ open, onAccept }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#101018] p-6 shadow-2xl">
        <h2 className="mb-3 text-xl font-semibold">{t("gate.title")}</h2>
        <p className="mb-3 text-sm text-white/70">{t("gate.intro")}</p>
        <ul className="mb-4 space-y-2 text-sm text-white/70">
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            <span dangerouslySetInnerHTML={{ __html: t("gate.allow") }} />
          </li>
          <li className="flex gap-2">
            <span className="text-rose-400">✕</span>
            {t("gate.deny1")}
          </li>
          <li className="flex gap-2">
            <span className="text-rose-400">✕</span>
            {t("gate.deny2")}
          </li>
          <li className="flex gap-2">
            <span className="text-white/50">ℹ</span>
            {t("gate.info")}
          </li>
        </ul>
        <button
          onClick={onAccept}
          className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          {t("gate.accept")}
        </button>
      </div>
    </div>
  );
}
