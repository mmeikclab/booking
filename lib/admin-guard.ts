import { getApiUser, type ApiUser } from "./api-auth";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<ApiUser | NextResponse> {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Bu işlem için yönetici olmanız gerekir." },
      { status: 403 }
    );
  }
  return user;
}