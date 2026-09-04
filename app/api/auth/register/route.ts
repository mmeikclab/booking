import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AppwriteException, ID } from "node-appwrite";
import { createAdminClient, createPublicClient } from "@/lib/appwrite";
import { SESSION_COOKIE } from "@/lib/auth";
import { createProfessorProfile } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password, department, role, title, bio } = body;

  if (!name || !email || !password || !department || !role) {
    return NextResponse.json(
      { error: "Tüm alanlar zorunludur." },
      { status: 400 }
    );
  }

  if (!["student", "professor"].includes(role)) {
    return NextResponse.json({ error: "Geçersiz rol." }, { status: 400 });
  }

  try {
    const { users } = createAdminClient();

    const newUser = await users.create(
      ID.unique(),
      email,
      undefined,
      password,
      name
    );

    await users.updatePrefs(newUser.$id, {
      role,
      department,
      title: title ?? "",
    });

    if (role === "professor") {
      await createProfessorProfile(newUser.$id, {
        name,
        department,
        title: title ?? "",
        bio: bio ?? "",
      });
    }

    const { account } = createPublicClient();
    const session = await account.createEmailPasswordSession(email, password);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.secret, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ user: { $id: newUser.$id, name } });
  } catch (err) {
    if (err instanceof AppwriteException) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}