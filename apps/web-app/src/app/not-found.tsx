import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6efe5] px-4">
      <div className="max-w-xl rounded-[32px] border border-black/10 bg-white p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <p className="text-xs uppercase tracking-[0.35em] text-black/45">404</p>
        <h1 className="mt-4 font-display text-5xl leading-none text-black">
          Campagne introuvable
        </h1>
        <p className="mt-4 text-base leading-7 text-black/65">
          La campagne n&apos;est pas active, ou son lien public a ete retire.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-black px-5 py-3 text-sm font-semibold !text-white"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/merchant"
            className="rounded-full border border-black/12 px-5 py-3 text-sm font-semibold"
          >
            Ouvrir le dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
