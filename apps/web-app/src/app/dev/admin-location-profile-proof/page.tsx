import { notFound } from "next/navigation";
import { AdminEstablishmentProfileButton } from "@/components/merchant/admin-establishment-profile-button";

export default function AdminLocationProfileProofPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main className="min-h-screen bg-[#fbf7fc] p-6">
      <h1 className="mb-6 text-2xl font-semibold">Pilotage · fiche établissement (données de test)</h1>
      <AdminEstablishmentProfileButton merchantId="profile-fixture" />
    </main>
  );
}
