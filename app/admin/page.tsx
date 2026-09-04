import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAuth();
  const prefs = (user.prefs ?? {}) as Record<string, unknown>;
  const role = (prefs.role as string) ?? "student";

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminPanel adminName={user.name} />;
}