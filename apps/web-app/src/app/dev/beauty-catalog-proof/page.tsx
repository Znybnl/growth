import { notFound } from "next/navigation";
import { BeautyCatalogProof } from "@/components/dev/beauty-catalog-proof";

export default function BeautyCatalogProofPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <BeautyCatalogProof />;
}
