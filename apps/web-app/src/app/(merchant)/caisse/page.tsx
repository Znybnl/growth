import { CashierScreen } from "@/components/merchant/cashier-screen";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function CashierPage() {
  await requireAuthenticatedSession();

  return <CashierScreen />;
}
