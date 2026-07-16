import { Building2 } from "lucide-react";

export default function ClinicNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <Building2 className="h-10 w-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Klinika topilmadi
        </h2>
        <p className="mt-3 text-gray-600">
          Bu manzilda ro'yxatdan o'tgan klinika mavjud emas. Iltimos, manzilni tekshiring.
        </p>
        <a
          href="https://second-smile.uz"
          className="mt-6 inline-block rounded-xl bg-sky-600 px-6 py-3 font-medium text-white hover:bg-sky-700 transition"
        >
          Bosh sahifaga qaytish
        </a>
      </div>
    </div>
  );
}
