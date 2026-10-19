import { notFound } from "next/navigation";
import { SupportDashboard } from "@/components/merchant/support-dashboard";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { BrevoSyncButton } from "@/components/merchant/brevo-sync-button";
import { parseSupportFilters, unavailableSlice } from "@/lib/support-monitoring";
import type { SupportMonitoring, SupportParams } from "@/lib/support-monitoring";

export default async function Page({ searchParams }: { searchParams: Promise<SupportParams> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const filters = parseSupportFilters(params);
  const data: SupportMonitoring = {
    updatedAt: "2026-10-11T12:00Z", locations: [{ id: "demo", name: "Institut de démonstration" }],
    locationsAvailable: true,
    sections: {
      emails: {available:true,total:58,page:Math.min(3,filters.pages.emails),stats:{incidents:55,queued:2,jobsWaiting:4,jobsRetry:1,jobsReview:3,eventsWaiting:8,oldestEvent:"2026-10-10T10:00Z"},rows:[
        {id:"11111111-1111-4111-8111-111111111111",kind:"reward",at:"2026-10-11T12:00Z",status:"failed",title:"Jeu de démonstration",
          merchant:"Institut de démonstration",participant:"Camille",recipient:"camille@example.test",
          detail:"Erreur synthétique. "+"UneErreurSansEspaces".repeat(20),eventAt:"2026-06-30T09:05:00.123456+00:00",canHandle:true},
        {id:"job-demo",kind:"notification",at:"2026-10-11T12:00Z",status:"needs_review",title:"weekly",
          merchant:"Institut de démonstration",attempts:6,periodStart:"2026-10-01T00:00Z",periodEnd:"2026-10-08T00:00Z"},
      ]},
      webhooks:{available:true,total:1,page:1,stats:{latestWebhook:"2026-06-18T18:10Z"},rows:[
        {id:"webhook",kind:"webhook",at:"2026-06-18T18:10Z",status:"email.delivered",providerId:"provider-demo"}]},
      claims:{available:true,total:1,page:1,stats:{},rows:[
        {id:"lead-demo",kind:"claim",at:"2026-10-11T12:00Z",status:"claimed",title:"Jeu de démonstration",merchant:"Institut de démonstration",
          participant:"Camille",recipient:"camille@example.test",detail:"Un soin offert",code:"DEMO-NON-VALIDE",expiresAt:"2026-11-11T12:00Z"}]},
      logs:{available:true,total:1,page:1,stats:{errorLogs:0,lastRun:{at:"2026-10-11T10:00Z",status:"info",event:"gain_notification_scheduled_run",detail:"Acceptés : 3 ; échecs : 0."}},rows:[
        {id:"log-demo",kind:"log",at:"2026-10-11T10:00Z",status:"info",title:"gain_notification_scheduled_run",detail:"Acceptés : 3 ; échecs : 0."}]},
    },
  };
  if (params.unavailable === "1") data.sections.logs = unavailableSlice();
  if (params.empty === "1") for (const slice of Object.values(data.sections)) { slice.rows=[];slice.total=0;slice.page=1; }
  if (params.handled === "1") { data.sections.emails.rows=[{...data.sections.emails.rows[0],canHandle:false,handled:true,handledAt:"2026-10-11T12:00Z"}]; }
  const content = <div className="min-w-0 space-y-6">
    <h1 className="okado-page-title">Supervision — démonstration synthétique</h1>
    <SupportDashboard data={data} filters={filters} base="/dev/support-monitoring" />
    <BrevoSyncButton />
  </div>;
  if (params.shell === "1") {
    const merchant = { id: "demo", companyName: "Institut de démonstration", logoText: "Démo",
      onboardingCompleted: true, createdAt: "2026-10-01T12:00Z" };
    return <MerchantShell merchant={merchant}
      user={{ id: "support-fixture", merchantId: "demo", firstName: "Camille", lastName: "Démo",
        email: "camille@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant, role: "owner" }]} activeLocationId="demo" isSaasAdmin>
      {content}
    </MerchantShell>;
  }
  return <main className="okado-workspace-shell mx-auto min-w-0 max-w-[1400px] p-4 sm:p-8">
    {content}
  </main>;
}
