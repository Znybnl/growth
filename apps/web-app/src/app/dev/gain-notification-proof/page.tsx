import { notFound } from "next/navigation";
import { GainNotificationProof } from "./proof";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  // Synthetic UI only; tests intercept requests. No session or access granted.
  return <GainNotificationProof />;
}
