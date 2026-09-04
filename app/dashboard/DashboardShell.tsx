import { DashboardNav } from "./DashboardNav";
import { StudentPanel } from "./StudentPanel";
import { ProfessorPanel } from "./ProfessorPanel";

export default function DashboardShell({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: "student" | "professor";
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav role={role} />
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <header className="mb-8">
          <p className="text-sm font-medium text-indigo-600">
            {role === "professor" ? "Hoca Paneli" : "Öğrenci Paneli"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Hoş geldin, {name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{email}</p>
        </header>

        {role === "professor" ? (
          <ProfessorPanel />
        ) : (
          <StudentPanel />
        )}
      </main>
    </div>
  );
}