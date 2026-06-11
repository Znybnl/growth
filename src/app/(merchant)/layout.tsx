import { MerchantShell } from "@/components/merchant/merchant-shell";
import { getMerchantProfile } from "@/lib/store";

export default function MerchantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const merchant = getMerchantProfile();

  return <MerchantShell merchant={merchant}>{children}</MerchantShell>;
}
