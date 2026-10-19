"use client";
import { useState } from "react";
import { RewardReminderSettings } from "@/components/merchant/reward-reminder-settings";
export function RewardReminderProof() {
  const [site, setSite] = useState("1");
  const [account, setAccount] = useState("demo");
  const [otherSaved, setOtherSaved] = useState(false);
  return <>
    <div className="mb-5 flex flex-wrap gap-3">
      <button onClick={() => setSite("1")}>Établissement 1</button>
      <button onClick={() => setSite("2")}>Établissement 2</button>
      <button onClick={() => setAccount("other")}>Autre compte</button>
      <span>Compte {account} · Site {site}</span>
    </div>
    <form id="demo-account-form" onSubmit={event => { event.preventDefault(); setOtherSaved(true); }}>
      <RewardReminderSettings key={account} accountKey={account} />
      <button type="submit">Enregistrer les autres informations</button>
    </form>
    {otherSaved ? <p role="status">Autres informations enregistrées</p> : null}
  </>;
}
