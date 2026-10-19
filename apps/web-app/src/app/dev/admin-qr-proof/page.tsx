import { notFound } from "next/navigation";
import { AdminQrProof } from "@/components/dev/admin-qr-proof";

export default function AdminQrProofPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AdminQrProof />;
}
