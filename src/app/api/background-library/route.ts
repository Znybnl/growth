import { NextResponse } from "next/server";

import {
  createBackgroundAsset,
  getBackgroundLibrary,
} from "@/lib/background-library-repository";
import { requireAuthenticatedSession } from "@/lib/auth";

export async function GET() {
  try {
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
    const session = await requireAuthenticatedSession();
    const formData = await request.formData();
    const label = String(formData.get("label") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const file = formData.get("file");

    if (!label) {
      return NextResponse.json({ error: "Le libellé est requis." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Le fichier image est requis." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const item = await createBackgroundAsset({
      label,
      category,
      createdByUserId: session.user.id,
      fileBuffer,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Création impossible." },
      { status: 500 },
    );
  }
}
