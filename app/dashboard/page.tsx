import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "./DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();
  const prefs = (user.prefs ?? {}) as Record<string, unknown>;
  const role = (prefs.role as string) ?? "student";

  if (role === "admin") {
    redirect("/admin");
  }

  return (
    <DashboardShell
      name={user.name}
      email={user.email}
      role={(role as "student" | "professor") || "student"}
    />
  );
}