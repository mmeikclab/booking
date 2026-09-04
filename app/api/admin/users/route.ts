import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { Query } from "node-appwrite";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { users } = createAdminClient();
  const list = await users.list([Query.limit(100)]);

  const slim = list.users.map((u) => ({
    $id: u.$id,
    $createdAt: u.$createdAt,
    name: u.name,
    email: u.email,
    prefs: u.prefs ?? {},
    status: u.status,
  }));

  return NextResponse.json({ users: slim });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const id = req.nextUrl.searchParams.get("id");
  const status = req.nextUrl.searchParams.get("status");

  if (!id || (status !== "true" && status !== "false")) {
    return NextResponse.json(
      { error: "Geçersiz istek." },
      { status: 400 }
    );
  }

  const { users } = createAdminClient();
  await users.updateStatus(id, status === "true");
  return NextResponse.json({ ok: true });
}