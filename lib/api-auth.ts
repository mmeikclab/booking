import { cookies } from "next/headers";
import { createSessionClient } from "./appwrite";
import { SESSION_COOKIE } from "./auth";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "professor" | "admin";
  department: string;
  title: string;
}

export async function getApiUser(): Promise<ApiUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { account } = createSessionClient(token);
    const user = await account.get();
    const prefs = (user.prefs ?? {}) as Record<string, unknown>;

    return {
      id: user.$id,
      name: user.name,
      email: user.email,
      role: (prefs.role as ApiUser["role"]) ?? "student",
      department: (prefs.department as string) ?? "",
      title: (prefs.title as string) ?? "",
    };
  } catch {
    return null;
  }
}