"use client";
import { useState } from "react";
import { GainNotificationSettings } from "@/components/merchant/gain-notification-settings";

export function GainNotificationProof() {
  const [site, setSite] = useState("site-a");
  return <main className="mx-auto max-w-4xl space-y-5 p-4">
    <h1 className="text-xl font-semibold">Fixture — Notifications de gains</h1>
    <label className="block">Établissement de test
      <select className="ml-2 rounded border p-2" value={site} onChange={event => setSite(event.target.value)}>
        <option value="site-a">Atelier Lumière Centre</option><option value="site-b">Atelier Lumière Nord</option>
      </select>
    </label>
    <GainNotificationSettings key={site} locationId={site} merchantName={`Atelier Lumière ${site === "site-a" ? "Centre" : "Nord"}`}
      email="compte@example.test" timeZone="Europe/Paris" />
  </main>;
}
