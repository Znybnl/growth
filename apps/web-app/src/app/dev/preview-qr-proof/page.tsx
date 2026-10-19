import { notFound } from "next/navigation";
import { PreviewQrProof } from "../../../../e2e/fixtures/preview-qr";

export default function PreviewQrProofPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PreviewQrProof />;
}
