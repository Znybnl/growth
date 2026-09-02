"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, BriefcaseBusiness, CircleDollarSign, Gamepad2, Gauge, HandCoins, LayoutDashboard, Settings2, Star, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { MerchantSessionGuard } from "@/components/merchant/merchant-session-guard";
import { MerchantPageSkeleton } from "@/components/merchant/merchant-page-skeleton";
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

const navItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Accueil", icon: LayoutDashboard },
  { href: "/campaigns", label: "Mes jeux", icon: Gamepad2 },
  { href: "/data", label: "Résultats", icon: BarChart3 },
  { href: "/account", label: "Mon compte", icon: UserRound },
];

const prefetchedNavRoutes = new Set(["/", "/campaigns", "/data", "/account"]);

const adminNavItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin", label: "Pilotage", icon: Gauge },
  { href: "/admin/prize-suggestions", label: "Suggestions de lots", icon: HandCoins },
  { href: "/backgrounds", label: "Bibliothèque", icon: BookOpen },
  { href: "/affiliates", label: "Affiliation", icon: BriefcaseBusiness },
  { href: "/support", label: "Supervision", icon: Settings2 },
];

export function MerchantShell({ children, merchant, user, locations, activeLocationId, isSaasAdmin }: MerchantShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [locationChangeTarget, setLocationChangeTarget] = useState<string | null>(null);
  const [campaignsVersion, setCampaignsVersion] = useState<string | null>(null);
  const [merchantAlerts, setMerchantAlerts] = useState({
    emailCount: 0,
    emailCampaignId: null as string | null,
    lowStockCount: 0,
    exhaustedStockCount: 0,
  });
  const failedRewardEmails = merchantAlerts.emailCount;
  const billing = useMemo(() => getMerchantBillingSummary(merchant), [merchant]);
  const accountInitials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "OK";

  useEffect(() => {
    if (!menuOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const focusableSelector = "a[href], button:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";

    function handleMenuKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !menuRef.current) return;

      const focusable = Array.from(menuRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleMenuKeyDown);
    const animationFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleMenuKeyDown);
      previousActiveElement?.focus();
    };
  }, [menuOpen]);

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

    // Alerts are secondary navigation data. Let the first page paint and hydrate before
    // competing with its server-rendered payload and critical client chunks.
    const timeoutId = window.setTimeout(() => {
      void loadMerchantAlerts();
    }, 700);
    const handleAlertsRefresh = () => {
      void loadMerchantAlerts();
    };
    window.addEventListener("merchant-alerts-refresh", handleAlertsRefresh);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("merchant-alerts-refresh", handleAlertsRefresh);
    };
  }, []);

  useEffect(() => {
    const handleCampaignsUpdated = () => {
      // /campaigns is prefetched by the shell. A versioned URL prevents the
      // next navigation from reusing the snapshot captured before a save.
      setCampaignsVersion(String(Date.now()));
    };

    window.addEventListener("campaigns-updated", handleCampaignsUpdated);
    return () => window.removeEventListener("campaigns-updated", handleCampaignsUpdated);
  }, []);

  useEffect(() => {
    const handleLocationChanging = (event: Event) => {
      const target = (event as CustomEvent<{ locationId?: string }>).detail?.locationId;
      if (target) setLocationChangeTarget(target);
    };
    const handleLocationChangeError = () => setLocationChangeTarget(null);
    window.addEventListener("merchant-location-changing", handleLocationChanging);
    window.addEventListener("merchant-location-change-error", handleLocationChangeError);
    return () => {
      window.removeEventListener("merchant-location-changing", handleLocationChanging);
      window.removeEventListener("merchant-location-change-error", handleLocationChangeError);
    };
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    // The administration overview must not remain active on its child pages.
    return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="okado-workspace-shell h-screen overflow-hidden bg-soft-white text-carbon">
      <MerchantSessionGuard userId={user.id} />
      {menuOpen ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-30 bg-midnight-ink/20 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        ref={menuRef}
        id="merchant-navigation"
        aria-label="Navigation de l’espace de travail"
        className={`fixed inset-y-0 left-0 z-40 w-[248px] border-r border-white/10 bg-deep-plum text-white shadow-[8px_0_32px_rgba(72,26,84,0.12)] transition-transform duration-200 lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col px-4 py-5">
          <div className="px-2 py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-primary-action-accent text-xs font-semibold uppercase tracking-[0.18em] text-white">
                <Star className="h-5 w-5 fill-white text-white" aria-hidden="true" />
              </div>
              <h1 className="truncate text-[22px] font-semibold leading-none tracking-[-0.05em] text-white">
                {APP_NAME_CAPITALIZED}
              </h1>
            </div>
          </div>

          <p className="mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Navigation</p>
          <nav className="mt-2 space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const href =
                item.href === "/campaigns" && campaignsVersion
                  ? `/campaigns?updated=${campaignsVersion}`
                  : item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={href}
                  prefetch={prefetchedNavRoutes.has(item.href)}
                  className={`flex h-9 items-center gap-3 rounded-[4px] border-l-2 px-3 text-sm transition ${
                    active
                      ? "border-white bg-white/12 font-medium text-white"
                      : "border-transparent text-white/72 hover:bg-white/8 hover:text-white"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <p className="mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Outils marchand</p>
          <Link
            href="/caisse"
            prefetch={false}
            className={`mt-2 flex h-9 items-center gap-3 rounded-[4px] border-l-2 px-3 text-sm transition ${isActive("/caisse") ? "border-white bg-white/12 font-medium text-white" : "border-transparent text-white/72 hover:bg-white/8 hover:text-white"}`}
            onClick={() => setMenuOpen(false)}
          >
            <CircleDollarSign className="size-4 shrink-0" aria-hidden="true" />
            <span>Caisse</span>
          </Link>
          <Button asChild variant="primary" className="okado-sidebar-cta mt-5 h-10 px-4">
            <Link href="/campaigns/new/guided" prefetch={false} onClick={() => setMenuOpen(false)}>
              Créer une campagne
            </Link>
          </Button>

          {isSaasAdmin ? (
            <div className="mt-7 border-t border-white/12 pt-5">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/55">
                Administration plateforme
              </p>
              <nav className="space-y-0.5">
                {adminNavItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={`flex h-8 items-center gap-3 rounded-[4px] border-l-2 px-3 text-sm transition ${
                        active
                          ? "border-white bg-white/12 text-white"
                          : "border-transparent text-white/72 hover:bg-white/8 hover:text-white"
                      }`}
                      style={active ? { color: "#ffffff" } : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate" style={active ? { color: "#ffffff" } : undefined}>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : null}

          <Link
            href="/caisse"
            prefetch={false}
            className="mt-auto mb-3 flex h-10 items-center justify-center rounded-[4px] border border-white/20 bg-white/10 px-4 text-sm font-semibold !text-white transition hover:bg-white hover:!text-aubergine"
            onClick={() => setMenuOpen(false)}
          >
            Valider un retrait
          </Link>

          <div className="mt-0 border-t border-white/12 pt-4">
            <p className="text-[10px] uppercase tracking-[0.13em] text-white/55">Mon compte</p>
            <div className="mt-3 flex items-center gap-3">
              {user.authProvider === "google" && user.avatarUrl ? (
                <div
                  role="img"
                  aria-label="Photo de profil Google"
                  className="h-10 w-10 rounded-full border border-white/20 object-cover"
                  style={{ backgroundImage: `url(${user.avatarUrl})`, backgroundPosition: "center", backgroundSize: "cover" }}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-aubergine text-xs font-semibold tracking-[0.08em] text-white">
                  {accountInitials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  {`${user.firstName} ${user.lastName}`.trim()}
                </p>
              </div>
            </div>

            {billing.isSubscribed ? (
              <div className="mt-4 rounded-[4px] bg-[#16ca2e]/10 px-2 py-2 text-xs font-medium text-[#16ca2e]">
                Abonnement actif
              </div>
            ) : billing.isTrialActive ? (
              <div className="mt-4 rounded-[4px] bg-white/10 px-2 py-2 text-xs font-medium text-white/80">
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
                onClick={() => setMenuOpen(false)}
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
                onClick={() => setMenuOpen(false)}
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
                onClick={() => setMenuOpen(false)}
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

      <div className="flex h-screen min-w-0 flex-col lg:ml-[248px]">
        <header className="sticky top-0 z-30 border-b border-fog bg-soft-white/92 backdrop-blur-sm">
          <div className="flex min-h-[56px] items-center gap-4 px-4 py-3 lg:px-7">
            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-border bg-white lg:hidden"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-controls="merchant-navigation"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <span className="space-y-1">
                <span className="block h-0.5 w-4 bg-graphite" />
                <span className="block h-0.5 w-4 bg-graphite" />
                <span className="block h-0.5 w-4 bg-graphite" />
              </span>
            </button>
            <div className="flex-1" />
            <LocationSwitcher key={activeLocationId} locations={locations} activeLocationId={activeLocationId} />
          </div>
        </header>

        <main aria-busy={locationChangeTarget !== null && locationChangeTarget !== activeLocationId} className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-6 lg:px-6">
          {locationChangeTarget !== null && locationChangeTarget !== activeLocationId ? <MerchantPageSkeleton /> : children}
        </main>
      </div>
    </div>
  );
}
