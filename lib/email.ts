/**
 * Отправка писем через Resend (https://resend.com).
 *
 * Если RESEND_API_KEY не задан — письмо не отправляется, а ссылка/контент
 * логируются в консоль (для локальной разработки). EMAIL_FROM — адрес
 * отправителя (например "Sherlock <noreply@your-domain.com>").
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (!emailConfigured()) {
    console.log(`[email:dev] To: ${opts.to} | ${opts.subject}\n${opts.text || opts.html}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.text ? { text: opts.text } : {}),
    }),
  });
  if (!res.ok) {
    const data = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${data}`);
  }
}
