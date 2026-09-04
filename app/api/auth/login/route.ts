import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AppwriteException } from "node-appwrite";
import { createPublicClient, createSessionClient } from "@/lib/appwrite";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "E-posta ve şifre zorunludur." },
      { status: 400 }
    );
  }

  try {
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

    const { account: sessionAccount } = createSessionClient(session.secret);
    const user = await sessionAccount.get();

    return NextResponse.json({ user: { $id: user.$id, name: user.name } });
  } catch (err) {
    if (err instanceof AppwriteException) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}
