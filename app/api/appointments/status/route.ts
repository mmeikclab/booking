import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { getAppointmentById, updateAppointment } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { createAdminClient } from "@/lib/appwrite";

export const runtime = "nodejs";

const ALLOWED: string[] = [
  "confirmed",
  "cancelled",
  "completed",
  "pending",
];

export async function POST(req: NextRequest) {
  const apiUser = await getApiUser();
  if (!apiUser) {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401 });
  }

  const body = await req.json();
  const { id, status } = body;

  if (!id || !ALLOWED.includes(status)) {
    return NextResponse.json(
      { error: "Geçersiz istek." },
      { status: 400 }
    );
  }

  const appointment = await getAppointmentById(id);
  if (!appointment) {
    return NextResponse.json(
      { error: "Randevu bulunamadı." },
      { status: 404 }
    );
  }

  const isProfessor = appointment.professorId === apiUser.id;
  const isStudent = appointment.studentId === apiUser.id;
  const isAdmin = apiUser.role === "admin";

  if (!isProfessor && !isStudent && !isAdmin) {
    return NextResponse.json(
      { error: "Bu randevu üzerinde işlem yetkiniz yok." },
      { status: 403 }
    );
  }

  // Öğrenci yalnızca iptal edebilir
  if (isStudent && !isProfessor && status !== "cancelled") {
    return NextResponse.json(
      { error: "Öğrenciler yalnızca randevuyu iptal edebilir." },
      { status: 403 }
    );
  }

  try {
    const updated = await updateAppointment(id, { status });

    const { users } = createAdminClient();
    const otherSideId =
      apiUser.id === appointment.professorId
        ? appointment.studentId
        : appointment.professorId;

    try {
      const other = await users.get(otherSideId);
      await sendEmail({
        to: other.email,
        subject: `Randevu durumu: ${
          status === "confirmed"
            ? "Onaylandı"
            : status === "cancelled"
              ? "İptal edildi"
              : status === "completed"
                ? "Tamamlandı"
                : "Beklemede"
        }`,
        html: `
          <h2>Randevu Durum Güncellemesi</h2>
          <p><strong>Konu:</strong> ${appointment.topic}</p>
          <p><strong>Tarih:</strong> ${appointment.date}</p>
          <p><strong>Saat:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
          <p><strong>Yeni durum:</strong> ${status}</p>
        `,
      });
    } catch {}

    return NextResponse.json({ appointment: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Durum güncellenemedi." },
      { status: 500 }
    );
  }
}