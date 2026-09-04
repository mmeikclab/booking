import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { deleteAvailabilitySlot, getAvailability } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const apiUser = await getApiUser();
  if (!apiUser) {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401 });
  }

  const professorId =
    req.nextUrl.searchParams.get("professorId") ?? undefined;
  const slots = await getAvailability(professorId);
  return NextResponse.json({ slots });
}

export async function DELETE(req: NextRequest) {
  const apiUser = await getApiUser();
  if (!apiUser) {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401 });
  }
  if (apiUser.role !== "professor") {
    return NextResponse.json(
      { error: "Bu işlem için hoca olmanız gerekir." },
      { status: 403 }
    );
  }

  const slotId = req.nextUrl.searchParams.get("id");
  if (!slotId) {
    return NextResponse.json(
      { error: "Slot id gerekli." },
      { status: 400 }
    );
  }

  const slots = await getAvailability(apiUser.id);
  const owned = slots.some((s) => s.$id === slotId);
  if (!owned) {
    return NextResponse.json(
      { error: "Bu slot size ait değil." },
      { status: 403 }
    );
  }

  await deleteAvailabilitySlot(slotId);
  return NextResponse.json({ ok: true });
}