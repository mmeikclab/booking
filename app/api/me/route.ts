import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401 });
  }
  return NextResponse.json({ user });
}