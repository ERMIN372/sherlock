import type { Currency } from "@/lib/packs";

export interface CheckoutParams {
  packId: string;
  credits: number;
  /** Цена в валюте провайдера. */
  price: number;
  label: string;
  /** URL возврата после оплаты (успех/отмена обрабатываются на клиенте). */
  returnUrl: string;
  /** Кошелёк, которому начислить кредиты (кладётся в metadata платежа). */
  walletId?: string;
}

export interface CheckoutResult {
  /** Идентификатор платежа/сессии у провайдера. */
  id: string;
  /** URL, куда нужно перенаправить пользователя для оплаты. */
  url: string;
}

export interface VerifyResult {
  paid: boolean;
  credits: number;
  packId?: string;
  /** Кошелёк из metadata платежа (для серверного начисления). */
  walletId?: string;
}

/** Абстракция платёжного провайдера: Stripe, ЮKassa и т.д. */
export interface PaymentProvider {
  readonly id: "stripe" | "yookassa";
  readonly currency: Currency;
  /** Создать платёж/сессию и вернуть URL для редиректа. */
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  /** Проверить статус платежа по его id (серверная, неподделываемая проверка). */
  verify(id: string): Promise<VerifyResult>;
  /**
   * Разобрать входящий вебхук и вернуть id платежа, если уведомление подлинное
   * и относится к завершённой оплате, иначе null. Сумму/кошелёк роут получает
   * через verify(id) (повторный запрос к провайдеру).
   */
  parseWebhookId(rawBody: string, headers: Headers): Promise<string | null>;
}
