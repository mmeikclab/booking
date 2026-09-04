"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "student" | "professor";

export default function RegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        department: formData.get("department"),
        role,
        title: formData.get("title"),
        bio: formData.get("bio"),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Kayıt başarısız oldu.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        {(["student", "professor"] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-lg py-2 text-sm font-medium transition-colors ${
              role === r
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {r === "student" ? "Öğrenci" : "Hoca"}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Ad Soyad
        <input
          type="text"
          name="name"
          required
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Ali Yılmaz"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        E-posta
        <input
          type="email"
          name="email"
          required
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="ornek@universite.edu.tr"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Departman / Bölüm
        <input
          type="text"
          name="department"
          required
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Bilgisayar Mühendisliği"
        />
      </label>
      {role === "professor" && (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Ünvan (Dr., Doç., Prof.)
            <input
              type="text"
              name="title"
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Dr. Öğr. Üyesi"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Kita Bio
            <textarea
              name="bio"
              rows={2}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="İlgi alanlarınız ve görüşme konularınız (isteğe bağlı)"
            />
          </label>
        </>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Şifre
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="En az 8 karakter"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading
          ? "Kayıt yapılıyor..."
          : role === "student"
            ? "Öğrenci olarak kayıt ol"
            : "Hoca olarak kayıt ol"}
      </button>
    </form>
  );
}
