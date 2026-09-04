import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getApiUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET() {
  const apiUser = await getApiUser();
  if (!apiUser) {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401 });
  }

  const { databases } = createAdminClient();
  const databaseId = process.env.APPWRITE_DATABASE_ID!;
  const professorsColl = process.env.APPWRITE_PROFESSORS_COLLECTION_ID!;

  try {
    const list = await databases.listDocuments(databaseId, professorsColl, [
      Query.limit(100),
    ]);

    const professors = list.documents.map((doc) => ({
      id: doc.$id,
      userId: doc.userId,
      name: doc.name,
      department: doc.department,
      title: doc.title,
      bio: doc.bio,
    }));

    return NextResponse.json({ professors });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Hocalar listelenemedi." },
      { status: 500 }
    );
  }
}