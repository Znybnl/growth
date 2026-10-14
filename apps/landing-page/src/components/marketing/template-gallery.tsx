import Image from "next/image";
import Link from "next/link";

const templates = [
  { id: "beauty-nude-elegance", name: "Nude Élégance" },
  { id: "beauty-botanical-premium", name: "Botanique Premium" },
  { id: "beauty-noir-or", name: "Noir & Or Signature" },
  { id: "beauty-lilas-soin-doux", name: "Lilas Soin Doux" },
  { id: "beauty-corail-lumiere", name: "Corail Lumière" },
];

export function TemplateGallery() {
  return (
    <section
      aria-labelledby="templates-title"
      className="mx-auto max-w-[1200px] px-5 py-16"
    >
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">
        Modèles inclus
      </p>
      <h2
        id="templates-title"
        className="mt-4 text-3xl font-bold tracking-[-0.03em]"
      >
        Les fonds de votre prochain ticket.
      </h2>
      <p className="mt-4 max-w-2xl leading-7 text-[#475569]">
        Ces décors proviennent des modèles disponibles dans Okado. Vous ajoutez
        votre logo et vos textes ; les possibilités de couleur et de fond
        dépendent du modèle.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {templates.map((template) => (
          <figure
            key={template.id}
            className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white"
          >
            <div className="relative aspect-[3/4]">
              <Image
                src={`/images/sample-${template.id}.webp`}
                alt={`Fond du template de ticket à gratter ${template.name}`}
                fill
                sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
                className="object-cover"
              />
            </div>
            <figcaption className="p-4 text-sm font-semibold text-[#0f172b]">
              {template.name}
            </figcaption>
          </figure>
        ))}
      </div>
      <Link
        href="/ticket-a-gratter"
        className="mt-6 inline-block font-semibold text-[#6c00f6] underline underline-offset-4"
      >
        Découvrir le ticket à gratter et ses réglages
      </Link>
    </section>
  );
}
