import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-white to-slate-100 px-6">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <span className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700">
          Üniversite Randevu Platformu
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Hocalarınızla görüşmeyi{" "}
          <span className="text-indigo-600">kolayca planlayın</span>
        </h1>
        <p className="max-w-xl text-lg leading-8 text-slate-600">
          Öğrenciler ve akademisyenler için görüşme randevuları. Hocalarınızın
          müsaitlik takvimini görüntüleyin, uygun saati seçin ve görüşmenizi
          anında planlayın.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-full bg-indigo-600 px-8 text-base font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Panoya Git
            </Link>
          ) : (
            <>
              <Link
                href="/auth/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-indigo-600 px-8 text-base font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Kayıt Ol
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-8 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Giriş Yap
              </Link>
            </>
          )}
        </div>

        <div className="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            title="Müsaitlik Takvimi"
            text="Hocalar çalışma saatlerini ve müsait oldukları aralıkları belirler."
          />
          <FeatureCard
            title="Kolay Randevu"
            text="Öğrenciler boş slotlardan uygun saati seçip tek tıkla randevu alır."
          />
          <FeatureCard
            title="Bildirimler"
            text="Randevu oluşturma ve değişikliklerde e-posta ile bilgilendirme."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
