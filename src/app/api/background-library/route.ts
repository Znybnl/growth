import { NextResponse } from "next/server";

import {
  createBackgroundAsset,
  getBackgroundLibrary,
} from "@/lib/background-library-repository";
import { getAuthenticatedSession } from "@/lib/auth";
import { assertSaasAdminEmail } from "@/lib/admin";
import { assertBackgroundUpload } from "@/lib/merchant-input";

export async function GET() {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const items = await getBackgroundLibrary();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lecture impossible." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    assertSaasAdminEmail(session.user.email);

    const formData = await request.formData();
    const label = String(formData.get("label") ?? "").trim().slice(0, 120);
    const category = String(formData.get("category") ?? "").trim().slice(0, 80);
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Le fichier image est requis." }, { status: 400 });
    }

    assertBackgroundUpload(file, label, category);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const item = await createBackgroundAsset({
      label,
      category,
      createdByUserId: session.user.id,
      fileBuffer,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const isForbidden =
      error instanceof Error && error.message === "Accès réservé à l'administration.";

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Création impossible." },
      { status: isForbidden ? 403 : 500 },
    );
  }
}
