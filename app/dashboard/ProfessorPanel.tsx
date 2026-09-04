"use client";

import { useEffect, useState } from "react";
import { DAY_NAMES } from "@/lib/utils";

interface Slot {
  $id: string;
  professorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Appointment {
  $id: string;
  studentName: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  notes: string;
  status: string;
}

export function ProfessorPanel() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  async function loadData() {
    const [slotRes, apptRes] = await Promise.all([
      fetch("/api/availability/id"),
      fetch("/api/appointments"),
    ]);
    const slotData = await slotRes.json();
    const apptData = await apptRes.json();
    setSlots(slotData.slots ?? []);
    setAppointments(apptData.appointments ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ilk yükleme için async veri çekme
    loadData();
  }, []);

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek, startTime, endTime }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "err", text: data.error ?? "Slot eklenemedi." });
      return;
    }
    setMessage({ type: "ok", text: "Müsaitlik aralığı eklendi." });
    loadData();
  }

  async function removeSlot(id: string) {
    await fetch(`/api/availability/id?id=${id}`, { method: "DELETE" });
    loadData();
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/appointments/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadData();
  }

  const pending = appointments.filter((a) => a.status === "pending");
  const others = appointments.filter((a) => a.status !== "pending");

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
          Müsaitlik Ekle
        </h2>
        <form onSubmit={addSlot} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Gün
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            >
              {DAY_NAMES.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Başlangıç
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Bitiş
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 sm:col-span-3"
          >
            Müsaitlik Ekle
          </button>
        </form>

        {slots.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-slate-700">
              Mevcut Müsaitlikler
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.map((s) => (
                <span
                  key={s.$id}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                >
                  {DAY_NAMES[s.dayOfWeek]} {s.startTime}-{s.endTime}
                  <button
                    onClick={() => removeSlot(s.$id)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Sil"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Bekleyen Randevu Talepleri
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Bekleyen randevu talebi yok.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {pending.map((a) => (
              <li key={a.$id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {a.studentName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.date} · {a.startTime} - {a.endTime}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{a.topic}</p>
                    {a.notes && (
                      <p className="mt-1 text-xs text-slate-400">{a.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setStatus(a.$id, "confirmed")}
                      className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => setStatus(a.$id, "cancelled")}
                      className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Diğer Randevular
          </h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {others.map((a) => (
              <li
                key={a.$id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {a.studentName} — {a.topic}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.date} · {a.startTime} - {a.endTime}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {a.status === "confirmed"
                    ? "Onaylandı"
                    : a.status === "cancelled"
                      ? "İptal"
                      : a.status === "completed"
                        ? "Tamamlandı"
                        : a.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}