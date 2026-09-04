import { NextResponse } from "next/server";
import { listAppointments } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const appointments = await listAppointments();
  appointments.sort((a, b) =>
    `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
  );

  const slim = appointments.map((a) => ({
    $id: a.$id,
    studentName: a.studentName,
    professorName: a.professorName,
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    topic: a.topic,
    status: a.status,
  }));

  return NextResponse.json({ appointments: slim });
}