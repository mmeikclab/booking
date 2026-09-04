"use client";

import { useEffect, useState } from "react";
import { dayName, toMinutes } from "@/lib/utils";

interface Professor {
  id: string;
  userId: string;
  name: string;
  department: string;
  title: string;
  bio: string;
}

interface Slot {
  $id: string;
  professorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Appointment {
  $id: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  status: string;
  professorName: string;
}

export function StudentPanel() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  async function loadProfessors() {
    const res = await fetch("/api/professors");
    const data = await res.json();
    setProfessors(data.professors ?? []);
  }

  async function loadAppointments() {
    const res = await fetch("/api/appointments");
    const data = await res.json();
    setAppointments(data.appointments ?? []);
  }

  async function loadSlots(professorId: string) {
    if (!professorId) {
      setSlots([]);
      return;
    }
    const res = await fetch(`/api/availability/id?professorId=${professorId}`);
    const data = await res.json();
    setSlots(data.slots ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ilk yükleme için async veri çekme
    loadProfessors();
    loadAppointments();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seçilen hocaya göre async yükleme
    if (selectedId) loadSlots(selectedId);
  }, [selectedId]);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !date || !startTime || !topic) {
      setMessage({ type: "err", text: "Tüm alanları doldurun." });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professorId: selectedId, date, startTime, topic, notes }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error ?? "Randevu alınamadı." });
      return;
    }
    setMessage({
      type: "ok",
      text: "Randevu talebiniz oluşturuldu. Hocanın onayı bekleniyor.",
    });
    setTopic("");
    setNotes("");
    loadAppointments();
  }

  const [startTime, setStartTime] = useState("");

  return (
    <div className="flex flex-col gap-8">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Yeni Randevu Al
        </h2>
        <form onSubmit={book} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
            Hoca
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            >
              <option value="">Hoca seçin</option>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title ? `${p.title} ` : ""}
                  {p.name} — {p.department}
                </option>
              ))}
            </select>
          </label>

          {selectedId && slots.length > 0 && (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Tarih
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Başlangıç Saati
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="">Saat seçin</option>
                  {date &&
                    slots
                      .filter((s) => s.dayOfWeek === new Date(date).getDay())
                      .flatMap((s) =>
                        hourOptions(s.startTime, s.endTime)
                      )
                      .map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                Konu
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  placeholder="Görüşme konusu"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                Notlar (opsiyonel)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-2 inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Randevu alınıyor..." : "Randevu Al"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Randevularım
        </h2>
        {appointments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Henüz randevunuz yok.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {appointments.map((a) => (
              <li
                key={a.$id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {a.professorName} — {a.topic}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dayName(new Date(`${a.date}T00:00:00`).getDay())} {a.date} ·{" "}
                    {a.startTime} - {a.endTime}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function hourOptions(startTime: string, endTime: string): string[] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const options: string[] = [];
  for (let t = start; t + 60 <= end; t += 60) {
    options.push(
      `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`
    );
  }
  return options;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "Beklemede",
    confirmed: "Onaylandı",
    cancelled: "İptal",
    completed: "Tamamlandı",
  };
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
    completed: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        styles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {map[status] ?? status}
    </span>
  );
}