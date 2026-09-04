"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserRow {
  $id: string;
  $createdAt: string;
  name: string;
  email: string;
  prefs: { role?: string; department?: string };
  status: boolean;
}

interface Professor {
  id: string;
  name: string;
  department: string;
  title: string;
}

interface Appointment {
  $id: string;
  studentName: string;
  professorName: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  status: string;
}

export default function AdminPanel({ adminName }: { adminName: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "professors" | "appointments">(
    "appointments"
  );
  const [users, setUsers] = useState<UserRow[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [creating, setCreating] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [logoutLoading, setLogoutLoading] = useState(false);

  async function loadAll() {
    const [u, p, a] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/professors"),
      fetch("/api/admin/appointments"),
    ]);
    const ud = await u.json();
    const pd = await p.json();
    const ad = await a.json();
    if (ud.users) setUsers(ud.users);
    if (pd.professors) setProfessors(pd.professors);
    if (ad.appointments) setAppointments(ad.appointments);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ilk yükleme için async veri çekme
    loadAll();
  }, []);

  async function logout() {
    setLogoutLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function setUserStatus(id: string, status: boolean) {
    await fetch(`/api/admin/users?id=${id}&status=${status}`, {
      method: "PATCH",
    });
    loadAll();
  }

  async function createProfessor() {
    const name = prompt("Hoca adı soyadı:");
    if (!name) return;
    const department = prompt("Departman:") ?? "";
    const title = prompt("Ünvan:") ?? "";
    const email = prompt("E-posta (varsayılan şifre 12345678 olacak):");
    if (!email) return;
    setCreating(true);
    const res = await fetch("/api/admin/professors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, department, title }),
    });
    setCreating(false);
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Hata oluştu.");
      return;
    }
    alert("Hoca oluşturuldu. Varsayılan şifre: 12345678");
    loadAll();
  }

  const filteredUsers =
    roleFilter === "all"
      ? users
      : users.filter((u) => u.prefs?.role === roleFilter);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-base font-semibold text-slate-900">
              Üniversite Randevu
            </Link>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
              Yönetici
            </span>
          </div>
          <button
            onClick={logout}
            disabled={logoutLoading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {logoutLoading ? "Çıkılıyor..." : "Çıkış Yap"}
          </button>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            Yönetim Paneli
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Merhaba {adminName}, sistemdeki kullanıcıları ve randevuları
            yönetin.
          </p>
        </header>

        <div className="mb-6 flex gap-2">
          {(
            [
              ["appointments", "Randevular"],
              ["professors", "Hocalar"],
              ["users", "Kullanıcılar"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "appointments" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Tüm Randevular
              </h2>
            </div>
            {appointments.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">
                Henüz randevu yok.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Öğrenci</th>
                    <th className="px-6 py-3">Hoca</th>
                    <th className="px-6 py-3">Tarih / Saat</th>
                    <th className="px-6 py-3">Konu</th>
                    <th className="px-6 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((a) => (
                    <tr key={a.$id}>
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {a.studentName}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {a.professorName}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {a.date} · {a.startTime}-{a.endTime}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{a.topic}</td>
                      <td className="px-6 py-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {tab === "professors" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Hocalar</h2>
              <button
                onClick={createProfessor}
                disabled={creating}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {creating ? "Oluşturuluyor..." : "+ Hoca Ekle"}
              </button>
            </div>
            {professors.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">
                Henüz hoca yok.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {professors.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {p.title ? `${p.title} ` : ""}
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500">{p.department}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "users" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Kullanıcılar
              </h2>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">Tümü</option>
                <option value="student">Öğrenciler</option>
                <option value="professor">Hocalar</option>
                <option value="admin">Yöneticiler</option>
              </select>
            </div>
            {filteredUsers.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">
                Kullanıcı bulunamadı.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Ad</th>
                    <th className="px-6 py-3">E-posta</th>
                    <th className="px-6 py-3">Rol</th>
                    <th className="px-6 py-3">Departman</th>
                    <th className="px-6 py-3">Durum</th>
                    <th className="px-6 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.$id}>
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {u.name}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{u.email}</td>
                      <td className="px-6 py-3 text-slate-600">
                        {u.prefs?.role ?? "student"}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {u.prefs?.department ?? "-"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            u.status
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {u.status ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => setUserStatus(u.$id, !u.status)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {u.status ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>
    </div>
  );
}