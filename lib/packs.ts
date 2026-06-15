/** Пакеты кредитов для покупки. Общий модуль для API-роутов и UI. */

export type Currency = "rub" | "usd";

export interface Pack {
  id: string;
  credits: number;
  /** Цена в выбранной валюте (целое число денежных единиц). */
  price: number;
  currency: Currency;
  label: string;
}

interface PackDef {
  credits: number;
  label: string;
  /** Цена в рублях (для ЮKassa). */
  priceRub: number;
  /** Цена в долларах (для Stripe). */
  priceUsd: number;
}

const PACKS: Record<string, PackDef> = {
  starter: { credits: 10, label: "Starter", priceRub: 490, priceUsd: 5 },
  plus: { credits: 30, label: "Plus", priceRub: 1190, priceUsd: 12 },
  pro: { credits: 100, label: "Pro", priceRub: 2990, priceUsd: 30 },
};

function priceFor(def: PackDef, currency: Currency): number {
  return currency === "rub" ? def.priceRub : def.priceUsd;
}

export function listPacks(currency: Currency): Pack[] {
  return Object.entries(PACKS).map(([id, def]) => ({
    id,
    credits: def.credits,
    label: def.label,
    currency,
    price: priceFor(def, currency),
  }));
}

export function getPack(id: string, currency: Currency): Pack | null {
  const def = PACKS[id];
  if (!def) return null;
  return { id, credits: def.credits, label: def.label, currency, price: priceFor(def, currency) };
}
