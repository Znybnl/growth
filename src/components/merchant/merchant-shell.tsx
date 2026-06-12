"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/brand-mark";
import { Merchant } from "@/lib/types";

type MerchantShellProps = {
  children: React.ReactNode;
  merchant: Merchant;
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campagnes" },
  { href: "/data", label: "Données" },
];

export function MerchantShell({ children, merchant }: MerchantShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="h-screen overflow-hidden bg-[#edf2f8] text-[#10131a]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[304px] border-r border-[#dfe6f0] bg-white shadow-[0_20px_60px_rgba(120,132,158,0.14)] transition-transform duration-200 md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col px-5 py-5">
          <div className="flex items-center gap-3 rounded-[26px] bg-[#f7f9fc] p-3">
            <BrandMark logoText={merchant.logoText} logoUrl={merchant.logoUrl} size="md" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8c93a4]">
                Espace marchand
              </p>
              <h1 className="truncate text-base font-semibold">{merchant.companyName}</h1>
              <p className="mt-1 text-sm text-[#98a0b0]">Activation locale</p>
            </div>
          </div>

          <form
            onSubmit={submitSearch}
            className="mt-5 rounded-[22px] border border-[#e6ebf4] bg-[#fbfcfe] px-4 py-3"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une campagne, un lead ou un lot"
              className="w-full bg-transparent text-sm text-[#10131a] outline-none placeholder:text-[#9aa1b1]"
            />
          </form>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-[20px] px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-[#eff4ff] text-[#214ccf]"
                      : "text-[#5d6577] hover:bg-[#f5f7fb] hover:text-[#141821]"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{item.label}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      active ? "bg-[#2f6df6]" : "bg-[#d9deea]"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <Link
            href="/campaigns/new"
            className="mt-6 inline-flex items-center justify-center rounded-[22px] bg-[#2f6df6] px-4 py-4 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.24)]"
          >
            Créer une campagne
          </Link>

          <div className="mt-auto rounded-[24px] border border-[#e6ebf4] bg-[#fbfcfe] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#8c93a4]">Compte</p>
            <div className="mt-3 flex items-center gap-3">
              <BrandMark logoText={merchant.logoText} logoUrl={merchant.logoUrl} size="sm" />
              <div>
                <p className="text-sm font-semibold text-[#141821]">Admin magasin</p>
                <p className="text-sm text-[#9aa1b1]">{merchant.companyName}</p>
              </div>
            </div>
            <div className="mt-4">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex h-screen flex-col md:ml-[304px]">
        <header className="sticky top-0 z-30 border-b border-[#dfe6f0] bg-white/92 backdrop-blur">
          <div className="flex items-center gap-4 px-4 py-4 md:px-7">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-[#e4e9f2] bg-[#f7f9fc] md:hidden"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <span className="space-y-1">
                <span className="block h-0.5 w-4 bg-[#11131a]" />
                <span className="block h-0.5 w-4 bg-[#11131a]" />
                <span className="block h-0.5 w-4 bg-[#11131a]" />
              </span>
            </button>

            <form
              onSubmit={submitSearch}
              className="hidden min-w-0 flex-1 items-center rounded-[20px] border border-[#edf1f6] bg-[#f7f9fc] px-4 py-3 md:flex"
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une campagne, un lead ou un lot"
                className="w-full bg-transparent text-sm text-[#10131a] outline-none placeholder:text-[#a0a7b7]"
              />
            </form>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
