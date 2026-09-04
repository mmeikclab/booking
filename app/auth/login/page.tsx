import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Giriş Yap</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hesabınızla devam etmek için bilgilerinizi girin.
        </p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          Hesabınız yok mu?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Kayıt olun
          </Link>
        </p>
      </div>
    </div>
  );
}
