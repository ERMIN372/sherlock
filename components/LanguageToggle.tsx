"use client";

import { useI18n, type Lang } from "@/lib/i18n";

const OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
];

export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("lang.aria")}
      className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-0.5 text-sm"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.code}
          onClick={() => setLang(opt.code)}
          aria-pressed={lang === opt.code}
          className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
            lang === opt.code
              ? "bg-indigo-500 text-white"
              : "text-white/60 hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
