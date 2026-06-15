"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "ru";

type Dict = Record<string, string>;

const en: Dict = {
  "app.tagline": "AI Face Search across public web sources",
  "credits.label": "Credits",
  "buyCredits": "Buy credits",
  "lang.aria": "Switch language",

  "banner.warning":
    "⚠️ Use responsibly. Only search faces you are authorized to search. Stalking, harassment, or surveillance is prohibited. Results come from a third-party Face Search API; we don't scrape platforms or store your uploads.",

  "upload.title": "Upload a face",
  "upload.dropzone": "Drop a photo here, or click to upload",
  "upload.formats": "JPEG, PNG or WebP · up to 8 MB",
  "upload.errFormat": "Please choose a JPEG, PNG or WebP image.",
  "upload.errSize": "Image is too large (max 8 MB).",
  "upload.errProcess": "Could not process the image. Try another photo.",
  "upload.zoom": "Zoom",
  "upload.search": "Search this face",
  "upload.another": "Choose another",
  "upload.hint":
    "Position the face inside the circle. The cropped image is sent for this search only and is not stored on our servers.",

  "results.idle": "Upload and crop a face to begin your search.",
  "results.searching.title": "Searching public web sources…",
  "results.searching.sub":
    "Matching the face against indexed images. This can take up to a minute.",
  "results.error.title": "Search failed",
  "results.retry": "Try again",
  "results.empty.title": "No similar faces found",
  "results.empty.sub":
    "We couldn't find visually similar public photos. Try a clearer, front-facing photo.",
  "results.demo": "Demo results",
  "results.testing": "Testing mode — placeholder photos",
  "results.testingHint":
    "In FaceCheck testing mode the matched photos are replaced with placeholders, but the source links are real. Open a link to see the actual person. Turn off testing mode (FACECHECK_TESTING_MODE=false) for real photos.",
  "results.openSource": "Open source",
  "results.source": "Source",
  "results.heading": "{n} {plural}",
  "results.plural.one": "result",
  "results.plural.other": "results",

  "history.title": "Search history",
  "history.clear": "Clear",
  "history.empty": "No searches yet.",
  "history.top": " · top {n}%",
  "history.demo": " · demo",
  "history.note":
    "History is stored only in your browser. Uploaded photos are never kept on our servers.",

  "time.justNow": "just now",
  "time.minutes": "{n}m ago",
  "time.hours": "{n}h ago",
  "time.days": "{n}d ago",

  "buy.title": "Get more credits",
  "buy.subtitle": "Each search costs 1 credit. Pick a pack below.",
  "buy.credits": "{n} credits",
  "buy.processing": "Processing…",
  "buy.demoNote":
    "Demo checkout — no real payment is processed. Credits are granted instantly for demonstration purposes.",
  "buy.payNote":
    "Secure online payment. You'll be redirected to pay; credits are added after the payment is confirmed.",
  "buy.redirecting": "Redirecting to secure checkout…",
  "buy.loadError": "Could not load credit packs.",
  "buy.payError": "Payment failed",
  "pay.success": "Payment successful — {n} credits added.",
  "pay.failed": "We couldn't confirm your payment. If you were charged, contact support.",
  "pay.canceled": "Checkout canceled — no payment was made.",

  "gate.title": "Before you search",
  "gate.intro":
    "Sherlock helps you find visually similar faces in public web sources using a third-party Face Search API. By continuing you agree to use it responsibly and lawfully.",
  "gate.allow":
    "Only search faces you are <b>authorized</b> to search (e.g. your own, or with consent).",
  "gate.deny1": "No stalking, harassment, surveillance, or unmasking of anonymous people.",
  "gate.deny2": "No use that violates privacy laws (e.g. GDPR/BIPA) or platform terms.",
  "gate.info":
    "Results come from a third-party API. We do not scrape platforms and do not store your uploaded photos.",
  "gate.accept": "I understand and agree",

  "search.err.rate_limited": "Rate limit reached. Try again in {n}s.",
  "search.err.no_face": "No face was detected in the uploaded image.",
  "search.err.timeout": "Search timed out, please try again.",
  "search.err.bad_request": "Invalid image. Use a JPEG, PNG or WebP under 8 MB.",
  "search.err.provider_error": "Search failed. Please try again.",
  "search.err.network": "Network error. Please check your connection and retry.",

  "footer":
    "Sherlock MVP · Face search powered by a third-party API · For lawful, authorized use only.",
};

const ru: Dict = {
  "app.tagline": "Поиск похожих лиц по публичным веб-источникам",
  "credits.label": "Кредиты",
  "buyCredits": "Купить кредиты",
  "lang.aria": "Сменить язык",

  "banner.warning":
    "⚠️ Используйте ответственно. Ищите только те лица, на поиск которых у вас есть право. Преследование, домогательство и слежка запрещены. Результаты приходят из стороннего Face Search API; мы не скрейпим платформы и не храним ваши загрузки.",

  "upload.title": "Загрузите лицо",
  "upload.dropzone": "Перетащите фото сюда или нажмите для загрузки",
  "upload.formats": "JPEG, PNG или WebP · до 8 МБ",
  "upload.errFormat": "Выберите изображение в формате JPEG, PNG или WebP.",
  "upload.errSize": "Изображение слишком большое (макс. 8 МБ).",
  "upload.errProcess": "Не удалось обработать изображение. Попробуйте другое фото.",
  "upload.zoom": "Масштаб",
  "upload.search": "Искать это лицо",
  "upload.another": "Выбрать другое",
  "upload.hint":
    "Поместите лицо внутрь круга. Обрезанное изображение отправляется только для этого поиска и не сохраняется на наших серверах.",

  "results.idle": "Загрузите и обрежьте лицо, чтобы начать поиск.",
  "results.searching.title": "Идёт поиск по публичным веб-источникам…",
  "results.searching.sub":
    "Сопоставляем лицо с проиндексированными изображениями. Это может занять до минуты.",
  "results.error.title": "Ошибка поиска",
  "results.retry": "Повторить",
  "results.empty.title": "Похожих лиц не найдено",
  "results.empty.sub":
    "Не удалось найти визуально похожие публичные фото. Попробуйте более чёткое фото анфас.",
  "results.demo": "Демо-результаты",
  "results.testing": "Тестовый режим — фото заглушки, ссылки настоящие",
  "results.testingHint":
    "В тестовом режиме FaceCheck заменяет фотографии найденных людей на заглушки, но ссылки на источники настоящие. Перейдите по ссылке, чтобы увидеть реального человека. Для реальных фото отключите тестовый режим (FACECHECK_TESTING_MODE=false).",
  "results.openSource": "Открыть источник",
  "results.source": "Источник",
  "results.heading": "{n} {plural}",
  "results.plural.one": "результат",
  "results.plural.few": "результата",
  "results.plural.many": "результатов",

  "history.title": "История поиска",
  "history.clear": "Очистить",
  "history.empty": "Запросов пока нет.",
  "history.top": " · топ {n}%",
  "history.demo": " · демо",
  "history.note":
    "История хранится только в вашем браузере. Загруженные фото не сохраняются на наших серверах.",

  "time.justNow": "только что",
  "time.minutes": "{n} мин назад",
  "time.hours": "{n} ч назад",
  "time.days": "{n} дн назад",

  "buy.title": "Пополнить кредиты",
  "buy.subtitle": "Каждый поиск стоит 1 кредит. Выберите пакет ниже.",
  "buy.credits": "{n} кредитов",
  "buy.processing": "Обработка…",
  "buy.demoNote":
    "Демо-оплата — реальный платёж не проводится. Кредиты начисляются мгновенно в демонстрационных целях.",
  "buy.payNote":
    "Безопасная онлайн-оплата. Вас перенаправит на оплату; кредиты начислятся после подтверждения платежа.",
  "buy.redirecting": "Перенаправляем на безопасную оплату…",
  "buy.loadError": "Не удалось загрузить пакеты кредитов.",
  "buy.payError": "Оплата не прошла",
  "pay.success": "Оплата прошла — начислено кредитов: {n}.",
  "pay.failed": "Не удалось подтвердить оплату. Если деньги списались, обратитесь в поддержку.",
  "pay.canceled": "Оплата отменена — платёж не проводился.",

  "gate.title": "Перед началом поиска",
  "gate.intro":
    "Sherlock помогает находить визуально похожие лица в публичных веб-источниках через сторонний Face Search API. Продолжая, вы соглашаетесь использовать сервис ответственно и законно.",
  "gate.allow":
    "Ищите только те лица, на поиск которых у вас есть <b>право</b> (например, своё лицо или с согласия человека).",
  "gate.deny1": "Никакого преследования, домогательств, слежки и деанонимизации.",
  "gate.deny2":
    "Запрещено использование, нарушающее законы о приватности (например, GDPR/BIPA) или правила платформ.",
  "gate.info":
    "Результаты приходят из стороннего API. Мы не скрейпим платформы и не храним ваши загруженные фото.",
  "gate.accept": "Понимаю и соглашаюсь",

  "search.err.rate_limited": "Лимит запросов исчерпан. Повторите через {n} с.",
  "search.err.no_face": "На загруженном изображении не обнаружено лицо.",
  "search.err.timeout": "Поиск занял слишком долго, попробуйте ещё раз.",
  "search.err.bad_request":
    "Некорректное изображение. Используйте JPEG, PNG или WebP до 8 МБ.",
  "search.err.provider_error": "Поиск не удался. Попробуйте ещё раз.",
  "search.err.network": "Ошибка сети. Проверьте соединение и повторите.",

  "footer":
    "Sherlock MVP · Поиск лиц через сторонний API · Только для законного, авторизованного использования.",
};

const DICTS: Record<Lang, Dict> = { en, ru };

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] != null ? String(params[key]) : `{${key}}`,
  );
}

/** Russian pluralization (one / few / many). */
function ruPlural(n: number): "one" | "few" | "many" {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "few";
  return "many";
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Pluralized word for the current language (uses results.plural.* keys). */
  plural: (n: number, base: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("sherlock_lang") as Lang | null;
    if (stored === "en" || stored === "ru") {
      setLangState(stored);
    } else if (navigator.language?.toLowerCase().startsWith("ru")) {
      setLangState("ru");
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("sherlock_lang", l);
    } catch {
      /* ignore */
    }
  };

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = DICTS[lang];
      const template = dict[key] ?? en[key] ?? key;
      return interpolate(template, params);
    },
    [lang],
  );

  const plural = useCallback(
    (n: number, base: string) => {
      if (lang === "ru") {
        const form = ruPlural(n);
        return t(`${base}.${form}`);
      }
      return t(n === 1 ? `${base}.one` : `${base}.other`);
    },
    [lang, t],
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t, plural }), [lang, t, plural]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
