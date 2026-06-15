/** Пакеты для покупки. Общий модуль для API-роутов и UI. */

import { SEARCH_COST } from "./config";

export type Currency = "rub" | "usd";

export interface Pack {
  id: string;
  /** Сколько поисков даёт пакет (основная единица для пользователя). */
  searches: number;
  /** Внутренние кредиты (= searches * SEARCH_COST). Скрыто от пользователя. */
  credits: number;
  /** Цена в выбранной валюте (целое число денежных единиц). */
  price: number;
  currency: Currency;
  label: string;
}

interface PackDef {
  searches: number;
  label: string;
  /** Цена в рублях (для ЮKassa). */
  priceRub: number;
  /** Цена в долларах (для Stripe). */
  priceUsd: number;
}

const PACKS: Record<string, PackDef> = {
  starter: { searches: 3, label: "Starter", priceRub: 149, priceUsd: 2 },
  plus: { searches: 10, label: "Plus", priceRub: 399, priceUsd: 5 },
  pro: { searches: 33, label: "Pro", priceRub: 1290, priceUsd: 15 },
};

function priceFor(def: PackDef, currency: Currency): number {
  return currency === "rub" ? def.priceRub : def.priceUsd;
}

function toPack(id: string, def: PackDef, currency: Currency): Pack {
  return {
    id,
    searches: def.searches,
    credits: def.searches * SEARCH_COST,
    label: def.label,
    currency,
    price: priceFor(def, currency),
  };
}

export function listPacks(currency: Currency): Pack[] {
  return Object.entries(PACKS).map(([id, def]) => toPack(id, def, currency));
}

export function getPack(id: string, currency: Currency): Pack | null {
  const def = PACKS[id];
  return def ? toPack(id, def, currency) : null;
}
