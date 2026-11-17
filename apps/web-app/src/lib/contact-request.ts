export const CONTACT_SUBJECT_MAX_LENGTH = 120;
export const CONTACT_MESSAGE_MAX_LENGTH = 4000;

export type ContactRequest = { subject: string; message: string; requestId: string };

export function parseContactRequest(value: unknown): ContactRequest | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.subject !== "string" || typeof input.message !== "string" ||
      typeof input.requestId !== "string") return null;

  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!subject || subject.length > CONTACT_SUBJECT_MAX_LENGTH || /[\r\n\x00-\x1f\x7f]/.test(subject) ||
      !message || message.length > CONTACT_MESSAGE_MAX_LENGTH ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    return null;
  }
  return { subject, message, requestId: input.requestId };
}

export function contactEmailText(input: ContactRequest, replyTo: string) {
  return [
    `Objet : ${input.subject}`,
    `Adresse de réponse : ${replyTo}`,
    "",
    input.message,
  ].join("\n");
}
