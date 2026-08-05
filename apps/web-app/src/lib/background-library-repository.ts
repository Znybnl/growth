import { builtInBackgroundAssets } from "@/lib/background-library";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { BackgroundLibraryAsset } from "@/lib/types";

const BACKGROUND_LIBRARY_BUCKET = "background-library";

type BackgroundAssetRow = {
  id: string;
  label: string;
  category: string;
  image_url: string;
  thumbnail_url: string;
  storage_path: string;
  thumbnail_storage_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
};

type CreateBackgroundAssetInput = {
  category: string;
  createdByUserId: string;
  fileBuffer: Buffer;
  label: string;
};

function toBackgroundAsset(row: BackgroundAssetRow): BackgroundLibraryAsset {
  return {
    id: row.id,
    label: row.label,
    category: row.category,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    source: "uploaded",
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    createdAt: row.created_at,
  };
}

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function listSupabaseBackgroundAssets() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("background_assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Lecture de la bibliothèque d'images impossible.");
  }

  return ((data as BackgroundAssetRow[] | null) ?? []).map(toBackgroundAsset);
}

async function ensureBackgroundLibraryBucket() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error("Lecture des buckets Supabase impossible.");
  }

  const exists = (data ?? []).some((bucket) => bucket.name === BACKGROUND_LIBRARY_BUCKET);

  if (exists) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(
    BACKGROUND_LIBRARY_BUCKET,
    {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
    },
  );

  if (createError && !createError.message.toLowerCase().includes("already")) {
    throw new Error("Création du bucket d'images impossible.");
  }
}

export async function getBackgroundLibrary() {
  if (!isSupabaseConfigured()) {
    return builtInBackgroundAssets;
  }

  try {
    const uploadedAssets = await listSupabaseBackgroundAssets();
    return [...uploadedAssets, ...builtInBackgroundAssets];
  } catch {
    return builtInBackgroundAssets;
  }
}

export async function createBackgroundAsset(input: CreateBackgroundAssetInput) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase doit être configuré pour gérer la bibliothèque d'images.");
  }

  await ensureBackgroundLibraryBucket();

  const supabase = getSupabaseAdmin();
  const assetId = generateId("bg");
  const sharp = (await import("sharp")).default;
  const optimized = sharp(input.fileBuffer, { failOn: "none" }).rotate();
  const metadata = await optimized.metadata();
  const output = await optimized
    .resize({
      width: 1600,
      height: 2200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
  const thumbnail = await sharp(output)
    .resize({
      width: 420,
      height: 700,
      fit: "cover",
      position: "attention",
    })
    .webp({ quality: 72 })
    .toBuffer();

  const imagePath = `images/${assetId}.webp`;
  const thumbnailPath = `thumbs/${assetId}.webp`;

  const imageUpload = await supabase.storage
    .from(BACKGROUND_LIBRARY_BUCKET)
    .upload(imagePath, output, {
      contentType: "image/webp",
      upsert: true,
    });

  if (imageUpload.error) {
    throw new Error("Téléversement de l'image optimisée impossible.");
  }

  const thumbnailUpload = await supabase.storage
    .from(BACKGROUND_LIBRARY_BUCKET)
    .upload(thumbnailPath, thumbnail, {
      contentType: "image/webp",
      upsert: true,
    });

  if (thumbnailUpload.error) {
    await supabase.storage.from(BACKGROUND_LIBRARY_BUCKET).remove([imagePath]);
    throw new Error("Téléversement de la miniature impossible.");
  }

  const imageUrl = supabase.storage
    .from(BACKGROUND_LIBRARY_BUCKET)
    .getPublicUrl(imagePath).data.publicUrl;
  const thumbnailUrl = supabase.storage
    .from(BACKGROUND_LIBRARY_BUCKET)
    .getPublicUrl(thumbnailPath).data.publicUrl;

  const createdAt = new Date().toISOString();
  const insert = await supabase.from("background_assets").insert({
    id: assetId,
    label: input.label.trim(),
    category: input.category.trim() || "Général",
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl,
    storage_path: imagePath,
    thumbnail_storage_path: thumbnailPath,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    created_by_user_id: input.createdByUserId,
    created_at: createdAt,
  });

  if (insert.error) {
    await supabase.storage
      .from(BACKGROUND_LIBRARY_BUCKET)
      .remove([imagePath, thumbnailPath]);
    throw new Error("Enregistrement de l'image dans la bibliothèque impossible.");
  }

  return {
    id: assetId,
    label: input.label.trim(),
    category: input.category.trim() || "Général",
    imageUrl,
    thumbnailUrl,
    source: "uploaded" as const,
    width: metadata.width ?? undefined,
    height: metadata.height ?? undefined,
    createdAt,
  };
}

export async function deleteBackgroundAsset(assetId: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase doit être configuré pour gérer la bibliothèque d'images.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("background_assets")
    .select("*")
    .eq("id", assetId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Image introuvable dans la bibliothèque.");
  }

  const row = data as BackgroundAssetRow;

  await supabase.storage
    .from(BACKGROUND_LIBRARY_BUCKET)
    .remove([row.storage_path, row.thumbnail_storage_path]);

  const remove = await supabase.from("background_assets").delete().eq("id", assetId);

  if (remove.error) {
    throw new Error("Suppression de l'image impossible.");
  }
}
