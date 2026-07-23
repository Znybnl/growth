"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/brand-mark";
import { LocationSwitcher } from "@/components/merchant/location-switcher";
import { Button } from "@/components/ui/button";
import { APP_NAME_CAPITALIZED } from "@/lib/branding";
import { getMerchantBillingSummary } from "@/lib/billing";
import { Merchant, MerchantLocationAccess, MerchantUser } from "@/lib/types";

type MerchantShellProps = {
  children: React.ReactNode;
  merchant: Merchant;
  user: MerchantUser;
  locations: MerchantLocationAccess[];
  activeLocationId: string;
  isSaasAdmin: boolean;
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campagnes" },
  { href: "/caisse", label: "Caisse" },
  { href: "/data", label: "Données" },
  { href: "/account", label: "Compte" },
  { href: "/locations", label: "Multi-sites" },
];

const adminNavItems = [
  { href: "/admin", label: "Pilotage" },
  { href: "/admin/prize-suggestions", label: "Suggestions de lots" },
  { href: "/backgrounds", label: "Bibliothèque" },
  { href: "/affiliates", label: "Affiliation" },
  { href: "/support", label: "Supervision" },
];

export function MerchantShell({ children, merchant, user, locations, activeLocationId, isSaasAdmin }: MerchantShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [merchantAlerts, setMerchantAlerts] = useState({
    emailCount: 0,
    emailCampaignId: null as string | null,
    lowStockCount: 0,
    exhaustedStockCount: 0,
  });
  const failedRewardEmails = merchantAlerts.emailCount;
  const billing = useMemo(() => getMerchantBillingSummary(merchant), [merchant]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      return;
    }

    posthog.identify(`${merchant.id}:${user.id}`, {
      merchantId: merchant.id,
      merchantUserId: user.id,
      email: user.email,
      companyName: merchant.companyName,
      isSaasAdmin,
      billingStatus: billing.isSubscribed
        ? "subscribed"
        : billing.isTrialActive
          ? "trial"
          : "locked",
    });
  }, [
    billing.isSubscribed,
    billing.isTrialActive,
    isSaasAdmin,
    merchant.companyName,
    merchant.id,
    user.email,
    user.id,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadMerchantAlerts() {
      try {
        const response = await fetch("/api/merchant/email-alerts");
        if (!response.ok) return;
        const payload = (await response.json()) as {
          emailCount?: number;
          emailCampaignId?: string | null;
          lowStockCount?: number;
          exhaustedStockCount?: number;
        };
        if (!cancelled) {
          setMerchantAlerts({
            emailCount: payload.emailCount ?? 0,
            emailCampaignId: payload.emailCampaignId ?? null,
            lowStockCount: payload.lowStockCount ?? 0,
            exhaustedStockCount: payload.exhaustedStockCount ?? 0,
          });
        }
      } catch {
        // Alerts are non-blocking and must never affect navigation.
      }
    }

    void loadMerchantAlerts();
    const handleAlertsRefresh = () => {
      void loadMerchantAlerts();
    };
    window.addEventListener("merchant-alerts-refresh", handleAlertsRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("merchant-alerts-refresh", handleAlertsRefresh);
    };
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    // The administration overview must not remain active on its child pages.
    return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="h-screen overflow-hidden bg-linen-canvas text-midnight-ink">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-30 bg-midnight-ink/20 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[288px] border-r border-border bg-linen-canvas/92 backdrop-blur-sm transition-transform duration-200 lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col px-4 py-5">
          <div className="px-2 py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-primary-action-accent text-xs font-semibold uppercase tracking-[0.18em] text-white">
                <Star className="h-5 w-5 fill-white text-white" aria-hidden="true" />
              </div>
              <h1 className="truncate text-[22px] font-semibold leading-none tracking-[-0.05em] text-midnight-ink">
                {APP_NAME_CAPITALIZED}
              </h1>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`flex h-9 items-center justify-between rounded-full px-3 text-sm transition ${
                    active
                      ? "bg-sky-wash font-medium text-graphite"
                      : "text-slate hover:bg-sky-wash/70 hover:text-graphite"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{item.label}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${active ? "bg-signal-blue" : "bg-border"}`}
                  />
                </Link>
              );
            })}
          </nav>
          <Link
            href="/caisse"
            prefetch={false}
            className="mt-5 flex items-center justify-center rounded-[8px] bg-[#111827] px-4 py-3 text-sm font-semibold !text-white transition hover:bg-[#273142]"
          >
            Ouvrir la caisse
          </Link>

          <Button asChild className="okado-primary-action mt-5 h-11 px-4">
            <Link href="/campaigns/new" prefetch={false}>
              Créer une campagne
            </Link>
          </Button>
          <Link
            href="/campaigns/new/guided"
            prefetch={false}
            className="mt-2 flex h-10 items-center justify-center rounded-[8px] border border-border bg-white px-4 text-sm font-medium text-graphite transition hover:bg-linen-canvas"
          >
            Assistant guidé
          </Link>

          {isSaasAdmin ? (
            <div className="mt-5 rounded-[8px] border border-border bg-white p-2 shadow-[var(--shadow-product-card)]">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.13px] text-ash">
                Administration
              </p>
              <nav className="space-y-1">
                {adminNavItems.map((item) => {
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={`flex h-8 items-center justify-between rounded-full px-3 text-sm transition ${
                        active
                          ? "bg-primary-action-accent text-white"
                          : "text-midnight-ink hover:bg-sky-wash hover:text-graphite"
                      }`}
                      style={active ? { color: "#ffffff" } : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span style={active ? { color: "#ffffff" } : undefined}>{item.label}</span>
                      <span
                        className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-border"}`}
                        style={active ? { backgroundColor: "#ffffff" } : undefined}
                      />
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : null}

          <div className="mt-auto rounded-[8px] border border-border bg-white p-3 shadow-[var(--shadow-product-card)]">
            <p className="text-[10px] uppercase tracking-[0.13px] text-fog">Compte</p>
            <div className="mt-3 flex items-center gap-3">
              <BrandMark logoText={merchant.logoText} logoUrl={merchant.logoUrl} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-graphite">
                  {`${user.firstName} ${user.lastName}`.trim()}
                </p>
              </div>
            </div>

            {billing.isSubscribed ? (
              <div className="mt-4 rounded-[4px] bg-[#16ca2e]/10 px-2 py-2 text-xs font-medium text-[#16ca2e]">
                Abonnement actif
              </div>
            ) : billing.isTrialActive ? (
              <div className="mt-4 rounded-[4px] bg-[#145aff]/10 px-2 py-2 text-xs font-medium text-signal-blue">
                Essai gratuit :
                <span className="font-semibold"> {billing.daysLeftInTrial} jour(s) restants</span>
              </div>
            ) : (
              <div className="mt-4 rounded-[4px] bg-[#f26052]/10 px-2 py-2 text-xs font-medium text-coral-alert">
                Votre période d&apos;essai est terminée. Activez votre abonnement pour relancer vos
                jeux.
              </div>
            )}

            {merchantAlerts.exhaustedStockCount > 0 ? (
              <Link
                href="/data"
                className="mt-3 block rounded-[4px] bg-[#f26052]/10 px-2 py-2 text-xs font-medium text-coral-alert"
              >
                {merchantAlerts.exhaustedStockCount} lot
                {merchantAlerts.exhaustedStockCount > 1 ? "s" : ""} epuise
                {merchantAlerts.exhaustedStockCount > 1 ? "s" : ""}
              </Link>
            ) : null}

            {merchantAlerts.lowStockCount > 0 ? (
              <Link
                href="/data"
                className="mt-3 block rounded-[4px] bg-[#f59e0b]/10 px-2 py-2 text-xs font-medium text-[#a15c00]"
              >
                Stock faible sur {merchantAlerts.lowStockCount} lot
                {merchantAlerts.lowStockCount > 1 ? "s" : ""}
              </Link>
            ) : null}

            {merchantAlerts.emailCount > 0 ? (
              <Link
                href={
                  merchantAlerts.emailCampaignId
                    ? `/data?campaign=${encodeURIComponent(merchantAlerts.emailCampaignId)}&emailStatus=attention`
                    : "/data?emailStatus=attention"
                }
                className="mt-3 block rounded-[4px] bg-[#f59e0b]/10 px-2 py-2 text-xs font-medium text-[#a15c00]"
              >
                {failedRewardEmails} e-mail{failedRewardEmails > 1 ? "s" : ""} de gain à vérifier
              </Link>
            ) : null}

            <div className="mt-4">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex h-screen min-w-0 flex-col lg:ml-[288px]">
        <header className="sticky top-0 z-30 border-b border-border bg-linen-canvas/84 backdrop-blur-sm">
          <div className="flex min-h-[56px] items-center gap-4 px-4 py-3 lg:px-7">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-border bg-white lg:hidden"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <span className="space-y-1">
                <span className="block h-0.5 w-4 bg-graphite" />
                <span className="block h-0.5 w-4 bg-graphite" />
                <span className="block h-0.5 w-4 bg-graphite" />
              </span>
            </button>
            <div className="flex-1" />
            <LocationSwitcher locations={locations} activeLocationId={activeLocationId} />
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
