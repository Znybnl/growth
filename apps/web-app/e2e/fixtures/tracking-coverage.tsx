"use client";

import { useState } from "react";
import { useProductStepTracking } from "@/components/analytics/product-step-tracking";
import { MerchantAnalyticsIdentity } from "@/components/merchant/merchant-analytics-identity";
import { DataCampaignSelector } from "@/components/merchant/data-campaign-selector";
import { DownloadFeedbackDialog, useDownloadTask } from "@/components/merchant/download-feedback";
import { GainNotificationSettings } from "@/components/merchant/gain-notification-settings";
import { RewardReminderSettings } from "@/components/merchant/reward-reminder-settings";
import { uploadMerchantImageFile } from "@/lib/client-merchant-image-upload";

function CurrentStep() {
  const [step, setStep] = useState("game");
  const [render, setRender] = useState(0);
  useProductStepTracking("campaign_wizard_step_viewed", step, { wizardMode: "fixture", render });
  return <section>
    <p>Étape fictive : {step}</p>
    <button onClick={() => setStep(step === "game" ? "prizes" : "game")}>Changer d’étape fictive</button>
    <button onClick={() => setRender(value => value + 1)}>Actualiser le rendu fictif</button>
  </section>;
}

export function TrackingCoverageFixture() {
  const task = useDownloadTask();
  const [uploadStatus, setUploadStatus] = useState("");
  const prepare = (mode: "success" | "error" | "slow") => void task.start(async signal => {
    if (mode === "error") throw Error("private@example.test failure");
    if (mode === "slow") await new Promise<void>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(Error("aborted")), { once: true });
    });
    return "Préparation fictive terminée";
  }, "Préparation fictive…", { fileKind: "qr", operation: "download" });
  return <main className="mx-auto max-w-3xl space-y-6 p-6">
    <MerchantAnalyticsIdentity accountMerchantId="merchant-tracking-fixture" userId="user-tracking-fixture" activeMerchantId="merchant-tracking-fixture" email="tracking-fixture@example.test" />
    <h1>Vérification de tracking — données fictives</h1>
    <CurrentStep />
    <label>Logo fictif<input type="file" onChange={event => {
      const file = event.target.files?.[0];
      if (file) void uploadMerchantImageFile(file, "logo").then(() => setUploadStatus("Import fictif réussi"), () => setUploadStatus("Import fictif refusé"));
    }} /></label>
    <p>{uploadStatus}</p>
    <button onClick={() => prepare("success")}>Préparation réussie</button>
    <button onClick={() => prepare("error")}>Préparation échouée</button>
    <button onClick={() => prepare("slow")}>Préparation à annuler</button>
    <DownloadFeedbackDialog state={task.state} title="QR fictif" onClose={task.close} onRetry={() => prepare("success")} />
    <DataCampaignSelector campaigns={[{ id: "campaign-one", title: "Jeu fictif A", scans: 1 }, { id: "campaign-two", title: "Jeu fictif B", scans: 1 }]} selectedCampaignId="campaign-one" />
    <GainNotificationSettings locationId="merchant-tracking-fixture" merchantName="Commerce fictif" email="tracking-fixture@example.test" timeZone="Europe/Paris" />
    <RewardReminderSettings accountKey="account-tracking-fixture" />
  </main>;
}
