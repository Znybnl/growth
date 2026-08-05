import Link from "next/link";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export function LegalPage({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-10 text-[#0f172b] md:py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex rounded-[8px] border border-[#dbe3ef] bg-white px-4 py-2 text-sm font-semibold text-[#0f172b] shadow-sm transition hover:border-[#6c00f6] hover:text-[#6c00f6]"
        >
          Retour à Okado
        </Link>

        <header className="mt-8 rounded-[24px] border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,43,0.08)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c00f6]">
            Cadre juridique
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-base leading-7 text-[#475569]">{subtitle}</p>
          <p className="mt-6 text-sm text-[#90a1b9]">Dernière mise à jour : 2 juillet 2026</p>
        </header>

        <section className="mt-6 space-y-4">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-[0_14px_40px_rgba(15,23,43,0.05)]"
            >
              <h2 className="text-xl font-bold tracking-[-0.03em] text-[#0f172b]">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-[#475569]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
