"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { BackgroundLibraryAsset } from "@/lib/types";

type BackgroundLibraryManagerProps = {
  initialItems: BackgroundLibraryAsset[];
};

export function BackgroundLibraryManager({
  initialItems,
}: BackgroundLibraryManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Général");
  const [file, setFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  async function submitAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!file) {
      setMessage("Ajoutez une image.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("label", label);
      formData.set("category", category);
      formData.set("file", file);

      const response = await fetch("/api/background-library", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        item?: BackgroundLibraryAsset;
      };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "Création impossible.");
      }

      setItems((current) => [payload.item!, ...current]);
      setLabel("");
      setCategory("Général");
      setFile(null);
      setLocalPreviewUrl(null);
      setMessage("Image ajoutée et optimisée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeAsset(asset: BackgroundLibraryAsset) {
    if (asset.source === "built-in") {
      return;
    }

    setMessage(null);

    try {
      const response = await fetch(`/api/background-library/${asset.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Suppression impossible.");
      }

      setItems((current) => current.filter((item) => item.id !== asset.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Suppression impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Bibliothèque</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#111827]">
          Gérer les images de fond
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5c6577]">
          Chaque image ajoutée est automatiquement réduite et convertie en WebP pour la page de
          jeu.
        </p>

        <form
          onSubmit={submitAsset}
          className="mt-6 grid gap-4 rounded-[24px] border border-[#e4ebf5] bg-[#f8fafc] p-4 xl:grid-cols-[0.95fr_1.05fr]"
        >
          <div className="grid gap-4">
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Nom</span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                placeholder="Sunset Cocktail"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Catégorie</span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                placeholder="Food"
                required
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[18px] bg-[#111827] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? "Optimisation..." : "Ajouter à la bibliothèque"}
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="group relative flex min-h-[232px] cursor-pointer flex-col justify-between overflow-hidden rounded-[24px] border border-dashed border-[#cfd9ea] bg-white p-4 transition hover:border-[#2f6df6] hover:bg-[#eef4ff]">
              <div>
                <span className="mb-2 block text-sm text-[#616b7c]">Image</span>
                <p className="max-w-md text-sm leading-6 text-[#516073]">
                  Ajoutez un fond vertical. Il sera optimisé automatiquement pour l’éditeur et la
                  page de jeu.
                </p>
              </div>

              {localPreviewUrl ? (
                <div
                  className="mt-4 min-h-[140px] rounded-[20px] border border-white bg-cover bg-center shadow-inner"
                  style={{ backgroundImage: `url("${localPreviewUrl}")` }}
                />
              ) : (
                <div className="mt-4 flex min-h-[140px] items-center justify-center rounded-[20px] border border-dashed border-[#dbe4f0] bg-[#f8fafc] text-sm font-medium text-[#748095]">
                  Aperçu du visuel importé
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-2 text-xs font-semibold text-[#214ccf] shadow-sm">
                  {file ? file.name : "Aucun fichier"}
                </span>
                <span className="rounded-[16px] bg-[#2f6df6] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_18px_rgba(47,109,246,0.2)]">
                  Choisir un fichier
                </span>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setFile(nextFile);
                  setLocalPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                required
              />
            </label>
          </div>
        </form>

        {message ? (
          <div className="mt-4 rounded-[18px] border border-[#dbe4f0] bg-[#f7f9fc] px-4 py-3 text-sm font-medium text-[#182033]">
            {message}
          </div>
        ) : null}
      </section>

      <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Catalogue</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              {items.length} visuels disponibles
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-[24px] border border-[#e3e9f3] bg-[#f8fafc]"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#e8eef8]">
                <Image
                  src={item.thumbnailUrl}
                  alt={item.label}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#111827]">{item.label}</h3>
                    <p className="text-sm text-[#64748b]">{item.category}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                    {item.source === "built-in" ? "Base" : "Upload"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <a
                    href={item.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[16px] border border-[#2f6df6] bg-white px-4 py-2 text-sm font-semibold text-[#2f6df6]"
                  >
                    Ouvrir
                  </a>
                  {item.source === "uploaded" ? (
                    <button
                      type="button"
                      onClick={() => removeAsset(item)}
                      className="rounded-[16px] border border-[#111827] bg-[#111827] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
