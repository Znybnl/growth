"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SectionCard, StatusNotice } from "@/components/ui/workspace";
import { CONTACT_MESSAGE_MAX_LENGTH, CONTACT_SUBJECT_MAX_LENGTH } from "@/lib/contact-request";

export function ContactForm({ email }: { email: string }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const requestId = useRef<string | null>(null);
  const sending = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setError(null);
    setSent(false);
    requestId.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/merchant/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ subject, message, requestId: requestId.current }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Envoi impossible. Réessayez.");
      setSubject("");
      setMessage("");
      setSent(true);
      requestId.current = null;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Envoi impossible. Réessayez.");
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  return (
    <SectionCard className="max-w-2xl">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm leading-6 text-ash">
          Nous répondrons à <strong className="break-all font-medium text-carbon">{email}</strong>. Ne communiquez pas de mot de passe ni de données personnelles de joueurs.
        </p>
        <div>
          <label htmlFor="contact-subject" className="mb-2 block text-sm font-medium text-carbon">Objet</label>
          <input id="contact-subject" type="text" required maxLength={CONTACT_SUBJECT_MAX_LENGTH} disabled={pending}
            value={subject} onChange={(event) => { setSubject(event.target.value); setSent(false); requestId.current = null; }}
            autoComplete="off" className="min-h-11 w-full rounded-[4px] border border-fog bg-white px-3 py-2.5 text-carbon outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60" />
        </div>
        <div>
          <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-carbon">Message</label>
          <textarea id="contact-message" required maxLength={CONTACT_MESSAGE_MAX_LENGTH} rows={8} disabled={pending}
            value={message} onChange={(event) => { setMessage(event.target.value); setSent(false); requestId.current = null; }}
            className="w-full resize-y rounded-[4px] border border-fog bg-white px-3 py-2.5 text-carbon outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60" />
        </div>
        {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}
        {sent ? <StatusNotice tone="success">Votre demande a été envoyée. Vous pouvez nous écrire à nouveau si besoin.</StatusNotice> : null}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Envoi en cours…" : "Envoyer la demande"}
        </Button>
        <p className="text-xs text-ash">En cas de difficulté, écrivez à <a className="underline" href="mailto:contact@okado.app">contact@okado.app</a>.</p>
      </form>
    </SectionCard>
  );
}
