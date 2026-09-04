import { DatabasesIndexType } from "node-appwrite";
import type { Databases } from "node-appwrite";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local yoksa ortam değişkenleri shell'den sağlanmıştır
}

import { createAdminClient } from "../lib/appwrite";

const {
  APPWRITE_DATABASE_ID,
  APPWRITE_PROFESSORS_COLLECTION_ID,
  APPWRITE_AVAILABILITY_COLLECTION_ID,
  APPWRITE_APPOINTMENTS_COLLECTION_ID,
} = process.env;

const DATABASE_ID = APPWRITE_DATABASE_ID;
const PROFESSORS_ID = APPWRITE_PROFESSORS_COLLECTION_ID;
const AVAILABILITY_ID = APPWRITE_AVAILABILITY_COLLECTION_ID;
const APPOINTMENTS_ID = APPWRITE_APPOINTMENTS_COLLECTION_ID;

const {
  databases,
} = createAdminClient();

async function createCollectionIfMissing(
  databases: Databases,
  collectionId: string,
  name: string
) {
  try {
    await databases.getCollection(DATABASE_ID!, collectionId);
    console.log(`Collection mevcut: ${name} (${collectionId})`);
    return;
  } catch {
    // yok, oluştur
  }
  const collection = await databases.createCollection(
    DATABASE_ID!,
    collectionId,
    name
  );
  console.log(`Collection oluşturuldu: ${name} (${collectionId})`);
  return collection;
}

async function createAttributes(
  collectionId: string,
  attributes: Array<{
    key: string;
    size?: number;
    type?: "string" | "integer";
    min?: number;
    max?: number;
  }>
) {
  for (const attr of attributes) {
    try {
      if (attr.type === "integer") {
        await databases.createIntegerAttribute(
          DATABASE_ID!,
          collectionId,
          attr.key,
          false,
          attr.min,
          attr.max
        );
      } else {
        await databases.createStringAttribute(
          DATABASE_ID!,
          collectionId,
          attr.key,
          attr.size ?? 1000,
          false
        );
      }
      console.log(`  + attribute: ${attr.key}`);
    } catch (e: unknown) {
      if ((e as { code?: number })?.code === 409)
        console.log(`  ~ attribute zaten var: ${attr.key}`);
      else throw e;
    }
  }
}

async function createIndexes(collectionId: string, indexes: string[][]) {
  for (const idx of indexes) {
    try {
      await databases.createIndex(
        DATABASE_ID!,
        collectionId,
        `idx_${idx.join("_")}`,
        DatabasesIndexType.Key,
        idx
      );
      console.log(`  + index: ${idx.join("_")}`);
    } catch (e: unknown) {
      if ((e as { code?: number })?.code === 409)
        console.log(`  ~ index zaten var: ${idx.join("_")}`);
      else throw e;
    }
  }
}

async function main() {
  if (!DATABASE_ID || !PROFESSORS_ID || !AVAILABILITY_ID || !APPOINTMENTS_ID) {
    console.error(".env.local içinde collection ID'leri tanımlı olmalı.");
    process.exit(1);
  }

  try {
    await databases.get(DATABASE_ID);
    console.log(`Database mevcut: ${DATABASE_ID}`);
  } catch {
    await databases.create(DATABASE_ID, "Randevu Sistemi");
    console.log(`Database oluşturuldu: ${DATABASE_ID}`);
  }

  await createCollectionIfMissing(databases, PROFESSORS_ID, "Hocalar");
  await createCollectionIfMissing(
    databases,
    AVAILABILITY_ID,
    "Müsaitlikler"
  );
  await createCollectionIfMissing(databases, APPOINTMENTS_ID, "Randevular");

  console.log("\nprofessors attrs...");
  await createAttributes(PROFESSORS_ID, [
    { key: "userId", size: 500 },
    { key: "name", size: 500 },
    { key: "department", size: 500 },
    { key: "title", size: 500 },
    { key: "bio", size: 500 },
  ]);
  await createIndexes(PROFESSORS_ID, [["userId"]]);

  console.log("\navailability attrs...");
  await createAttributes(AVAILABILITY_ID, [
    { key: "professorId", size: 500 },
    { key: "dayOfWeek", type: "integer", min: 0, max: 6 },
    { key: "startTime", size: 10 },
    { key: "endTime", size: 10 },
  ]);
  await createIndexes(AVAILABILITY_ID, [["professorId"], ["professorId", "dayOfWeek"]]);

  console.log("\nappointments attrs...");
  await createAttributes(APPOINTMENTS_ID, [
    { key: "studentId", size: 500 },
    { key: "studentName", size: 500 },
    { key: "professorId", size: 500 },
    { key: "professorName", size: 500 },
    { key: "date", size: 50 },
    { key: "startTime", size: 10 },
    { key: "endTime", size: 10 },
    { key: "topic", size: 1000 },
    { key: "notes", size: 2000 },
    { key: "status", size: 50 },
  ]);
  await createIndexes(APPOINTMENTS_ID, [
    ["studentId"],
    ["professorId"],
    ["professorId", "date"],
    ["date"],
  ]);

  console.log("\n✅ Appwrite kurulumu tamamlandı.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});