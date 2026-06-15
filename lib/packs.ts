/** Credit packs offered for purchase. Shared by the API routes. */

export interface Pack {
  id: string;
  credits: number;
  /** Price in whole USD. */
  price: number;
  label: string;
}

const PACKS: Record<string, Omit<Pack, "id">> = {
  starter: { credits: 10, price: 5, label: "Starter" },
  plus: { credits: 30, price: 12, label: "Plus" },
  pro: { credits: 100, price: 30, label: "Pro" },
};

export function listPacks(): Pack[] {
  return Object.entries(PACKS).map(([id, p]) => ({ id, ...p }));
}

export function getPack(id: string): Pack | null {
  const p = PACKS[id];
  return p ? { id, ...p } : null;
}

/** True when real Stripe payments are configured. */
export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
