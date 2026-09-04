import { cookies } from "next/headers";
import { createSessionClient } from "./appwrite";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "appwrite-session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { account } = createSessionClient(token);
    const user = await account.get();
    return {
      ...user,
      token,
    };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function sanitizeResponse(user: {
  $id: string;
  name: string;
  email: string;
  prefs: Record<string, unknown>;
}) {
  return {
    $id: user.$id,
    name: user.name,
    email: user.email,
    role: (user.prefs?.role as string) ?? "student",
    department: (user.prefs?.department as string) ?? "",
  };
}
