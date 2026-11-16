import Link from "next/link";
import { notFound } from "next/navigation";

export default function CookieNavigationFixture() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Link href="/campaign/dev-cookie-proof">Ouvrir le jeu fictif</Link>;
}
