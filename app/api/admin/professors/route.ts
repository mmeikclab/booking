import { NextRequest, NextResponse } from "next/server";
import { AppwriteException, ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { createProfessorProfile, getProfessors } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const professors = await getProfessors();
  const slim = professors.map((p) => ({
    id: p.$id,
    name: p.name,
    department: p.department,
    title: p.title,
  }));
  return NextResponse.json({ professors: slim });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const { name, email, department, title } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Ad ve e-posta zorunludur." },
      { status: 400 }
    );
  }

  const defaultPassword = "12345678";

  try {
    const { users } = createAdminClient();
    const newUser = await users.create(
      ID.unique(),
      email,
      undefined,
      defaultPassword,
      name
    );

    await users.updatePrefs(newUser.$id, {
      role: "professor",
      department: department ?? "",
      title: title ?? "",
    });

    await createProfessorProfile(newUser.$id, {
      name,
      department: department ?? "",
      title: title ?? "",
      bio: "",
    });

    return NextResponse.json({ user: newUser.$id }, { status: 201 });
  } catch (err) {
    if (err instanceof AppwriteException) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Hoca oluşturulamadı." },
      { status: 500 }
    );
  }
}