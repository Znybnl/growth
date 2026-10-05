import { getSupabaseAdmin, supabaseUrl } from "@/lib/supabase";
import { MERCHANT_IMAGE_BUCKET, MERCHANT_IMAGE_ORPHAN_AGE_MS } from "@/lib/merchant-image-constants";
import type { MerchantImageKind } from "@/lib/merchant-image-processing";

const MAX_STORED_IMAGE_BYTES = 1024 * 1024;
const LIST_PAGE_SIZE = 500;

type CampaignMediaRow = {
  logo_url: string | null;
  background_image_url: string | null;
  campaign_local_settings: unknown;
};

function collectStrings(value: unknown, result: Set<string>) {
  if (typeof value === "string") {
    result.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, result));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, result));
  }
}

function getManagedObjectPath(imageUrl: string, merchantId?: string) {
  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${MERCHANT_IMAGE_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0 || url.search || url.hash) return null;

    const objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    const [owner, fileName, ...rest] = objectPath.split("/");
    if (
      !owner || !fileName || rest.length > 0 ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(owner) ||
      !/^[0-9a-f-]{36}_\d{1,5}x\d{1,5}\.webp$/i.test(fileName) ||
      (merchantId && owner !== merchantId)
    ) return null;
    return { owner, path: `${owner}/${fileName}` };
  } catch {
    return null;
  }
}

function getOwnedManagedImageObjectPath(imageUrl: string, merchantId: string) {
  const object = getManagedObjectPath(imageUrl, merchantId);
  if (!object || !supabaseUrl) return null;

  try {
    if (new URL(imageUrl).origin !== new URL(supabaseUrl).origin) return null;
  } catch {
    return null;
  }

  return object;
}

/**
 * Read a merchant-owned optimized logo and inline it as PNG for SVG renderers.
 * SVG rasterizers do not reliably load remote WebP resources; embedding the
 * bytes also keeps the browser preview and server PNG export consistent.
 */
export async function getMerchantPosterLogoDataUrl(imageUrl: string, merchantId: string) {
  const object = getOwnedManagedImageObjectPath(imageUrl, merchantId);
  if (!object) throw new Error("Le logo de l’affiche n’est pas une image autorisée.");

  const { data, error } = await getSupabaseAdmin().storage
    .from(MERCHANT_IMAGE_BUCKET)
    .download(object.path);
  if (error || !data) throw new Error("Impossible de charger le logo de l’affiche.");
  if (data.size === 0 || data.size > MAX_STORED_IMAGE_BYTES) {
    throw new Error("Le fichier du logo de l’affiche dépasse la taille autorisée.");
  }

  const imageBuffer = Buffer.from(await data.arrayBuffer());
  const { default: sharp } = await import("sharp");
  const pngBuffer = await sharp(imageBuffer, {
    failOn: "error",
    limitInputPixels: 32_000_000,
  })
    .png()
    .toBuffer();

  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

async function ensureMerchantImagesBucket() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error("Configuration du stockage des images impossible.");

  const bucket = (data ?? []).find((item) => item.name === MERCHANT_IMAGE_BUCKET);
  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(MERCHANT_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: MAX_STORED_IMAGE_BYTES,
      allowedMimeTypes: ["image/webp"],
    });
    if (createError) throw new Error("Configuration du stockage des images impossible.");
    return;
  }

  const { error: updateError } = await supabase.storage.updateBucket(MERCHANT_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_STORED_IMAGE_BYTES,
    allowedMimeTypes: ["image/webp"],
  });
  if (updateError) throw new Error("Configuration du stockage des images impossible.");
}

/** Independent object in the recipient's storage; never fetch an arbitrary URL. */
export async function copyCampaignImageToMerchant(imageUrl: string, sourceMerchantId: string, targetMerchantId: string) {
  const managed = getManagedObjectPath(imageUrl);
  if (!managed) {
    if (imageUrl.includes(`/storage/v1/object/public/${MERCHANT_IMAGE_BUCKET}/`)) {
      throw new Error("Une image du jeu source n’est pas autorisée pour cette copie.");
    }
    return imageUrl; // Native assets, library images and legacy inline images.
  }
  if (getOwnedManagedImageObjectPath(imageUrl, targetMerchantId)) return imageUrl;
  const source = getOwnedManagedImageObjectPath(imageUrl, sourceMerchantId);
  if (!source || !/^[a-zA-Z0-9_-]{1,100}$/.test(targetMerchantId)) {
    throw new Error("Une image du jeu source n’est pas autorisée pour cette copie.");
  }
  const dimensions = source.path.match(/_(\d{1,5}x\d{1,5})\.webp$/)?.[1];
  if (!dimensions) throw new Error("L’image source ne peut pas être copiée.");
  const bucket = getSupabaseAdmin().storage.from(MERCHANT_IMAGE_BUCKET);
  const path = `${targetMerchantId}/${crypto.randomUUID()}_${dimensions}.webp`;
  const { error } = await bucket.copy(source.path, path);
  if (error) throw new Error("La copie d’une image du jeu a échoué.");
  return bucket.getPublicUrl(path).data.publicUrl;
}

export async function copyCampaignMediaToMerchant<T>(
  input: T, sourceMerchantId: string, targetMerchantId: string, copiedUrls: string[],
): Promise<T> {
  const copies = new Map<string, string>();
  async function visit(value: unknown, key = ""): Promise<unknown> {
    if (typeof value === "string" && ["logoUrl", "imageUrl", "backgroundImageUrl"].includes(key) && value) {
      if (copies.has(value)) return copies.get(value);
      const result = await copyCampaignImageToMerchant(value, sourceMerchantId, targetMerchantId);
      copies.set(value, result);
      if (result !== value) copiedUrls.push(result);
      return result;
    }
    if (Array.isArray(value)) {
      const items = [];
      for (const item of value) items.push(await visit(item));
      return items;
    }
    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [name, item] of Object.entries(value)) result[name] = await visit(item, name);
      return result;
    }
    return value;
  }
  return await visit(input) as T;
}

export async function uploadMerchantImage(input: {
  buffer: Buffer;
  kind: MerchantImageKind;
  merchantId: string;
  width: number;
  height: number;
}) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.merchantId)) {
    throw new Error("Établissement non valide.");
  }

  await ensureMerchantImagesBucket();
  const supabase = getSupabaseAdmin();
  const path = `${input.merchantId}/${crypto.randomUUID()}_${input.width}x${input.height}.webp`;
  const { error } = await supabase.storage.from(MERCHANT_IMAGE_BUCKET).upload(path, input.buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
    metadata: { kind: input.kind },
  });
  if (error) throw new Error("Enregistrement de l’image optimisée impossible.");

  return {
    path,
    url: supabase.storage.from(MERCHANT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl,
  };
}

async function getMerchantReferencedImageUrls(merchantId: string) {
  const supabase = getSupabaseAdmin();
  const [merchantQuery, campaignsQuery] = await Promise.all([
    supabase.from("merchants").select("logo_url").eq("id", merchantId).maybeSingle(),
    supabase
      .from("campaigns")
      .select("logo_url,background_image_url,campaign_local_settings")
      .eq("merchant_id", merchantId),
  ]);

  if (merchantQuery.error || campaignsQuery.error) {
    throw new Error("Vérification des références d’images impossible.");
  }

  const references = new Set<string>();
  collectStrings(merchantQuery.data?.logo_url, references);
  for (const row of (campaignsQuery.data ?? []) as CampaignMediaRow[]) {
    collectStrings(row.logo_url, references);
    collectStrings(row.background_image_url, references);
    collectStrings(row.campaign_local_settings, references);
  }
  return references;
}

export async function deleteMerchantImagesIfUnreferenced(imageUrls: string[]) {
  const candidates = [...new Set(imageUrls)].map((url) => ({ url, object: getManagedObjectPath(url) }))
    .filter((candidate): candidate is { url: string; object: NonNullable<typeof candidate.object> } => Boolean(candidate.object));
  if (candidates.length === 0) return 0;

  const byMerchant = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const group = byMerchant.get(candidate.object.owner) ?? [];
    group.push(candidate);
    byMerchant.set(candidate.object.owner, group);
  }

  const supabase = getSupabaseAdmin();
  let deleted = 0;
  for (const [merchantId, merchantCandidates] of byMerchant) {
    const references = await getMerchantReferencedImageUrls(merchantId);
    const stale = merchantCandidates.filter(({ url }) => !references.has(url));
    if (stale.length === 0) continue;
    const { error } = await supabase.storage
      .from(MERCHANT_IMAGE_BUCKET)
      .remove(stale.map(({ object }) => object.path));
    if (error) throw new Error("Nettoyage de l’ancienne image impossible.");
    deleted += stale.length;
  }
  return deleted;
}

export async function getCampaignMerchantImageUrls(merchantId: string, campaignId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("campaigns")
    .select("logo_url,background_image_url,campaign_local_settings")
    .eq("id", campaignId)
    .eq("merchant_id", merchantId)
    .maybeSingle<CampaignMediaRow>();
  if (error) throw new Error("Lecture des images de la campagne impossible.");
  if (!data) return [];

  const references = new Set<string>();
  collectStrings(data.logo_url, references);
  collectStrings(data.background_image_url, references);
  collectStrings(data.campaign_local_settings, references);
  return [...references].filter((url) => getManagedObjectPath(url, merchantId));
}

export async function purgeUnreferencedMerchantImages(olderThanMs = MERCHANT_IMAGE_ORPHAN_AGE_MS) {
  const supabase = getSupabaseAdmin();
  const bucket = supabase.storage.from(MERCHANT_IMAGE_BUCKET);
  const cutoff = Date.now() - olderThanMs;
  let deleted = 0;
  let rootOffset = 0;

  while (true) {
    const { data: folders, error: folderError } = await bucket.list("", {
      limit: LIST_PAGE_SIZE,
      offset: rootOffset,
    });
    if (folderError) throw new Error("Lecture des dossiers d’images impossible.");
    const merchantFolders = (folders ?? []).filter((item) => item.id === null && /^[a-zA-Z0-9_-]{1,100}$/.test(item.name));
    if (merchantFolders.length === 0 && (folders?.length ?? 0) === 0) break;

    for (const folder of merchantFolders) {
      let offset = 0;
      while (true) {
        const { data: files, error: fileError } = await bucket.list(folder.name, {
          limit: LIST_PAGE_SIZE,
          offset,
          sortBy: { column: "created_at", order: "asc" },
        });
        if (fileError) throw new Error("Lecture des images à nettoyer impossible.");
        const stale = (files ?? []).filter((file) => {
          if (file.id === null || !file.name.endsWith(".webp")) return false;
          const createdAt = Date.parse(file.created_at ?? "");
          return Number.isFinite(createdAt) && createdAt < cutoff;
        });
        if (stale.length > 0) {
          const references = await getMerchantReferencedImageUrls(folder.name);
          const orphanPaths = stale
            .map((file) => `${folder.name}/${file.name}`)
            .filter((path) => {
              const url = bucket.getPublicUrl(path).data.publicUrl;
              return !references.has(url);
            });
          for (let index = 0; index < orphanPaths.length; index += LIST_PAGE_SIZE) {
            const batch = orphanPaths.slice(index, index + LIST_PAGE_SIZE);
            const { error } = await bucket.remove(batch);
            if (error) throw new Error("Suppression des images orphelines impossible.");
            deleted += batch.length;
          }
        }
        if ((files?.length ?? 0) < LIST_PAGE_SIZE) break;
        offset += LIST_PAGE_SIZE;
      }
    }

    if ((folders?.length ?? 0) < LIST_PAGE_SIZE) break;
    rootOffset += LIST_PAGE_SIZE;
  }

  return deleted;
}
