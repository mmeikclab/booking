import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getApiUser } from "@/lib/api-auth";
import {
  getAvailability,
  getProfessorById,
  listAppointments,
  createAppointment,
} from "@/lib/db";
import { toMinutes, dayName } from "@/lib/utils";
import { sendEmail } from "@/lib/mail";

export const runtime = "nodejs";

export async function GET() {
  const apiUser = await getApiUser();
  if (!apiUser) {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401 });
  }

  const queries: string[] = [];
  if (apiUser.role === "student") {
    queries.push(Query.equal("studentId", apiUser.id));
  } else if (apiUser.role === "professor") {
    queries.push(Query.equal("professorId", apiUser.id));
  }

  const appointments = await listAppointments(queries);
  appointments.sort((a, b) =>
    `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
  );
  return NextResponse.json({ appointments });
}

export async function POST(req: NextRequest) {
  const apiUser = await getApiUser();
  if (!apiUser) {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401 });
  }
  if (apiUser.role !== "student") {
    return NextResponse.json(
      { error: "Randevu yalnızca öğrenciler tarafından alınabilir." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { professorId, date, startTime, topic, notes } = body;

  if (
    !professorId ||
    !date ||
    !startTime ||
    !topic ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(startTime)
  ) {
    return NextResponse.json(
      { error: "Geçersiz randevu bilgileri." },
      { status: 400 }
    );
  }

  // Tarih gelecekte olmalı
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateObj = new Date(`${date}T00:00:00`);
  if (dateObj < today) {
    return NextResponse.json(
      { error: "Geçmiş bir tarihe randevu alınamaz." },
      { status: 400 }
    );
  }

  const professor = await getProfessorById(professorId);
  if (!professor) {
    return NextResponse.json(
      { error: "Hoca bulunamadı." },
      { status: 404 }
    );
  }

  const dayOfWeek = dateObj.getDay();
  const availability = await getAvailability(professorId);
  const slot = availability.find(
    (s) =>
      s.dayOfWeek === dayOfWeek &&
      toMinutes(s.startTime) <= toMinutes(startTime) &&
      toMinutes(s.endTime) >= toMinutes(startTime) + 60
  );

  if (!slot) {
    return NextResponse.json(
      { error: "Seçtiğiniz saat hocanın müsaitlik aralığında değil." },
      { status: 400 }
    );
  }

  const endMinutes = toMinutes(startTime) + 60;
  const endTime = `${Math.floor(endMinutes / 60)}:${String(endMinutes % 60).padStart(2, "0")}`;

  // Çakışma kontrolü
  const conflicts = await listAppointments([
    Query.equal("professorId", professorId),
    Query.equal("date", date),
  ]);
  const overlap = conflicts.some(
    (a) =>
      a.status !== "cancelled" &&
      toMinutes(a.startTime) < toMinutes(startTime) + 60 &&
      toMinutes(startTime) < toMinutes(a.endTime ?? endTime)
  );
  if (overlap) {
    return NextResponse.json(
      { error: "Bu saat aralığında başka bir randevu mevcut." },
      { status: 409 }
    );
  }

  try {
    const appointment = await createAppointment(
      {
        studentId: apiUser.id,
        studentName: apiUser.name,
        professorId,
        professorName: `${professor.title ? professor.title + " " : ""}${professor.name}`,
        date,
        startTime,
        endTime,
        topic,
        notes: notes ?? "",
      },
      "pending"
    );

    // Bilgilendirme e-postası
    await sendEmail({
      to: apiUser.email,
      subject: "Randevu talebiniz alındı",
      html: `
        <h2>Randevu Talebiniz Alındı</h2>
        <p>Merhaba ${apiUser.name},</p>
        <p>${professor.name} hocası için randevu talebiniz oluşturuldu:</p>
        <ul>
          <li><strong>Tarih:</strong> ${dayName(dateObj.getDay())} ${date}</li>
          <li><strong>Saat:</strong> ${startTime} - ${endTime}</li>
          <li><strong>Konu:</strong> ${topic}</li>
        </ul>
        <p>Hocanın onayından sonra tekrar bilgilendirileceksiniz.</p>
      `,
    });

    // Hocaya da bildirim
    const { users } = createAdminClient();
    try {
      const profUser = await users.get(professorId);
      await sendEmail({
        to: profUser.email,
        subject: "Yeni randevu talebi",
        html: `
          <h2>Yeni Randevu Talebi</h2>
          <p>${apiUser.name} adlı öğrenci sizin için randevu talep etti:</p>
          <ul>
            <li><strong>Tarih:</strong> ${dayName(dateObj.getDay())} ${date}</li>
            <li><strong>Saat:</strong> ${startTime} - ${endTime}</li>
            <li><strong>Konu:</strong> ${topic}</li>
          </ul>
        `,
      });
    } catch {}

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Randevu oluşturulamadı." },
      { status: 500 }
    );
  }
}