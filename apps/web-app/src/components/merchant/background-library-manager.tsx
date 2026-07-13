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
      <section className="px-1 py-2">
        <p className="okado-label">Bibliothèque</p>
        <h1 className="okado-page-title mt-3">
          Gérer les images de fond
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-ash">
          Chaque image ajoutée est automatiquement réduite et convertie en WebP pour la page de
          jeu.
        </p>

        <form
          onSubmit={submitAsset}
          className="okado-card mt-6 grid gap-4 p-4 xl:grid-cols-[0.95fr_1.05fr]"
        >
          <div className="grid gap-4">
            <label className="text-sm">
              <span className="mb-2 block text-ash">Nom</span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 outline-none"
                placeholder="Sunset Cocktail"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-ash">Catégorie</span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 outline-none"
                placeholder="Food"
                required
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="okado-primary-action w-full px-5 py-3 disabled:opacity-60"
              >
                {isSubmitting ? "Optimisation..." : "Ajouter à la bibliothèque"}
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="group relative flex min-h-[232px] cursor-pointer flex-col justify-between overflow-hidden rounded-[8px] border border-dashed border-[#cfd9ea] bg-white p-4 transition hover:border-signal-blue hover:bg-sky-wash">
              <div>
                <span className="mb-2 block text-sm text-ash">Image</span>
                <p className="max-w-md text-sm leading-6 text-slate">
                  Ajoutez un fond vertical. Il sera optimisé automatiquement pour l’éditeur et la
                  page de jeu.
                </p>
              </div>

              {localPreviewUrl ? (
                <div
                  className="mt-4 min-h-[140px] rounded-[8px] border border-white bg-cover bg-center shadow-inner"
                  style={{ backgroundImage: `url("${localPreviewUrl}")` }}
                />
              ) : (
                <div className="mt-4 flex min-h-[140px] items-center justify-center rounded-[8px] border border-dashed border-border bg-sky-wash text-sm font-medium text-ash">
                  Aperçu du visuel importé
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="okado-status-badge okado-status-muted">
                  {file ? file.name : "Aucun fichier"}
                </span>
                <span className="okado-filled-action px-4 py-2 text-xs">
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
          <div className="mt-4 rounded-[8px] border border-border bg-sky-wash px-4 py-3 text-sm font-medium text-graphite">
            {message}
          </div>
        ) : null}
      </section>

      <section className="okado-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="okado-label">Catalogue</p>
            <h2 className="okado-section-title mt-2">
              {items.length} visuels disponibles
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="okado-compact-card overflow-hidden"
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
                    <h3 className="text-lg font-semibold text-graphite">{item.label}</h3>
                    <p className="text-sm text-ash">{item.category}</p>
                  </div>
                  <span className="okado-status-badge okado-status-muted">
                    {item.source === "built-in" ? "Base" : "Upload"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <a
                    href={item.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="okado-primary-action px-4 py-2"
                  >
                    Ouvrir
                  </a>
                  {item.source === "uploaded" ? (
                    <button
                      type="button"
                      onClick={() => removeAsset(item)}
                      className="rounded-[12px] border border-[#b42318] bg-white px-4 py-2 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff7f7]"
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
