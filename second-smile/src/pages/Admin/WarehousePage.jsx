// src/pages/Admin/WarehousePage.jsx
import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useAuth } from "../../features/auth/useAuth";

export default function WarehousePage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // useEffect(() => {
  //   const load = async () => {
  //     try {
  //       setLoading(true);
  //       setError("");
  //       // adjust endpoint if needed, e.g. "/storage/products" or "/warehouse"
  //       const data = await apiClient("/storage/products", { token });
  //       setItems(data || []);
  //     } catch (err) {
  //       setError(err.message || "Yuklashda xatolik");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   if (token) load();
  // }, [token]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Ombor</h1>
        <p className="text-xs text-slate-500">
          Sklad mahsulotlari va ularning qoldig&apos;i.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Nomi</th>
                <th className="px-4 py-2">Miqdor</th>
                <th className="px-4 py-2">O‘lchov</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-center text-xs" colSpan={4}>
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-center text-xs" colSpan={4}>
                    Ombor bo&apos;sh
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.amount}</td>
                    <td className="px-4 py-2">{item.unit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
