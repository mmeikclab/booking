import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getApiUser } from "@/lib/api-auth";
import { toMinutes } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { dayOfWeek, startTime, endTime } = body;

  if (
    typeof dayOfWeek !== "number" ||
    dayOfWeek < 0 ||
    dayOfWeek > 6 ||
    !startTime ||
    !endTime
  ) {
    return NextResponse.json(
      { error: "Geçersiz müsaitlik aralığı." },
      { status: 400 }
    );
  }

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (end <= start) {
    return NextResponse.json(
      { error: "Bitiş saati başlangıç saatinden sonra olmalı." },
      { status: 400 }
    );
  }

  const { databases } = createAdminClient();
  const databaseId = process.env.APPWRITE_DATABASE_ID!;
  const coll = process.env.APPWRITE_AVAILABILITY_COLLECTION_ID!;

  try {
    const dup = await databases.listDocuments(databaseId, coll, [
      Query.equal("professorId", apiUser.id),
      Query.equal("dayOfWeek", dayOfWeek),
      Query.equal("startTime", startTime),
    ]);
    if (dup.total > 0) {
      return NextResponse.json(
        { error: "Bu aralık zaten mevcut." },
        { status: 400 }
      );
    }

    const doc = await databases.createDocument(databaseId, coll, "unique()", {
      professorId: apiUser.id,
      dayOfWeek,
      startTime,
      endTime,
    });

    return NextResponse.json({ slot: doc }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Müsaitlik eklenemedi." },
      { status: 500 }
    );
  }
}