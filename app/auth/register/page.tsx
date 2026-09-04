import Link from "next/link";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Kayıt Ol</h1>
        <p className="mt-1 text-sm text-slate-500">
          Üniversite randevu sistemine katılın.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          Zaten hesabınız var mı?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Giriş yapın
          </Link>
        </p>
      </div>
    </div>
  );
}
