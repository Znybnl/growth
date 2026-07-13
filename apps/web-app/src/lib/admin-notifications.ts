import { Resend } from "resend";

import { Merchant, MerchantUser } from "@/lib/types";

const DEFAULT_ADMIN_RECIPIENTS = ["pierreh.brunelle@gmail.com"];

function getRecipients() {
  const configured = process.env.OKADO_ADMIN_NOTIFICATION_EMAILS
    ?.split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return configured?.length ? configured : DEFAULT_ADMIN_RECIPIENTS;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

export async function notifyAdministratorsOfMerchantSignup(input: {
  merchant: Merchant;
  user: MerchantUser;
  origin: string;
  provider: "email" | "google";
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false, reason: "missing_config" } as const;

  const merchantName = input.merchant.companyName || "Nouveau commerce";
  const contactName = `${input.user.firstName} ${input.user.lastName}`.trim();
  const accountUrl = `${input.origin}/admin?q=${encodeURIComponent(input.user.email)}`;
  const safeMerchantName = escapeHtml(merchantName);
  const safeContactName = escapeHtml(contactName || "Non renseigne");
  const safeEmail = escapeHtml(input.user.email);

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: `Okado <${from}>`,
    to: getRecipients(),
    subject: `Nouvelle inscription Okado - ${merchantName}`,
    text: [
      "Un nouveau compte marchand vient d'etre cree.",
      `Commerce : ${merchantName}`,
      `Contact : ${contactName || "Non renseigne"}`,
      `Email : ${input.user.email}`,
      `Inscription : ${input.provider}`,
      `Pilotage : ${accountUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#101828;line-height:1.5">
        <h1 style="font-size:20px">Nouvelle inscription Okado</h1>
        <p><strong>Commerce :</strong> ${safeMerchantName}</p>
        <p><strong>Contact :</strong> ${safeContactName}</p>
        <p><strong>Email :</strong> ${safeEmail}</p>
        <p><strong>Inscription :</strong> ${input.provider}</p>
        <p><a href="${accountUrl}">Voir le compte dans le pilotage</a></p>
      </div>`,
  });

  return { sent: true } as const;
}
