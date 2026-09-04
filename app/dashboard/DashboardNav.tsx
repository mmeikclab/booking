"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardNav({
  role,
}: {
  role: "student" | "professor";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-base font-semibold text-slate-900"
        >
          Üniversite Randevu
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 sm:inline-block">
            {role === "professor" ? "Hoca" : "Öğrenci"}
          </span>
          <button
            onClick={logout}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Çıkılıyor..." : "Çıkış Yap"}
          </button>
        </div>
      </div>
    </nav>
  );
}