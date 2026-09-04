import { Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";

const db = () => process.env.APPWRITE_DATABASE_ID!;

export interface Professor {
  $id: string;
  userId: string;
  name: string;
  department: string;
  title: string;
  bio: string;
  [key: string]: unknown;
}

export interface AvailabilitySlot {
  $id: string;
  professorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  [key: string]: unknown;
}

export async function getProfessors(): Promise<Professor[]> {
  const { databases } = createAdminClient();
  const res = await databases.listDocuments(
    db(),
    process.env.APPWRITE_PROFESSORS_COLLECTION_ID!,
    [Query.limit(100)]
  );
  return res.documents as unknown as Professor[];
}

export async function getProfessorById(
  professorId: string
): Promise<Professor | null> {
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(
      db(),
      process.env.APPWRITE_PROFESSORS_COLLECTION_ID!,
      professorId
    );
    return doc as unknown as Professor;
  } catch {
    return null;
  }
}

export async function createProfessorProfile(
  userId: string,
  data: { name: string; department: string; title: string; bio: string }
) {
  const { databases } = createAdminClient();
  return databases.createDocument(
    db(),
    process.env.APPWRITE_PROFESSORS_COLLECTION_ID!,
    userId,
    {
      userId,
      name: data.name,
      department: data.department,
      title: data.title,
      bio: data.bio,
    }
  );
}

export async function getAvailability(
  professorId?: string
): Promise<AvailabilitySlot[]> {
  const { databases } = createAdminClient();
  const queries = professorId
    ? [Query.equal("professorId", professorId), Query.limit(200)]
    : [Query.limit(200)];
  const res = await databases.listDocuments(
    db(),
    process.env.APPWRITE_AVAILABILITY_COLLECTION_ID!,
    queries
  );
  return res.documents as unknown as AvailabilitySlot[];
}

export async function createAvailabilitySlot(data: {
  professorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  const { databases } = createAdminClient();
  return databases.createDocument(
    db(),
    process.env.APPWRITE_AVAILABILITY_COLLECTION_ID!,
    "unique()",
    data
  );
}

export async function deleteAvailabilitySlot(slotId: string) {
  const { databases } = createAdminClient();
  return databases.deleteDocument(
    db(),
    process.env.APPWRITE_AVAILABILITY_COLLECTION_ID!,
    slotId
  );
}

export interface Appointment {
  $id: string;
  studentId: string;
  studentName: string;
  professorId: string;
  professorName: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  notes: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  [key: string]: unknown;
}

export async function listAppointments(
  queries: string[] = []
): Promise<Appointment[]> {
  const { databases } = createAdminClient();
  const res = await databases.listDocuments(
    db(),
    process.env.APPWRITE_APPOINTMENTS_COLLECTION_ID!,
    [...queries, Query.limit(100)]
  );
  return res.documents as unknown as Appointment[];
}

export async function getAppointmentById(
  appointmentId: string
): Promise<Appointment | null> {
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(
      db(),
      process.env.APPWRITE_APPOINTMENTS_COLLECTION_ID!,
      appointmentId
    );
    return doc as unknown as Appointment;
  } catch {
    return null;
  }
}

export async function createAppointment(
  data: Omit<Appointment, "$id" | "status">,
  status: "pending" | "confirmed" = "pending"
) {
  const { databases } = createAdminClient();
  return databases.createDocument(
    db(),
    process.env.APPWRITE_APPOINTMENTS_COLLECTION_ID!,
    "unique()",
    { ...data, status }
  );
}

export async function updateAppointment(
  appointmentId: string,
  data: Partial<Appointment>
) {
  const { databases } = createAdminClient();
  return databases.updateDocument(
    db(),
    process.env.APPWRITE_APPOINTMENTS_COLLECTION_ID!,
    appointmentId,
    data
  );
}

export async function deleteAppointment(appointmentId: string) {
  const { databases } = createAdminClient();
  return databases.deleteDocument(
    db(),
    process.env.APPWRITE_APPOINTMENTS_COLLECTION_ID!,
    appointmentId
  );
}