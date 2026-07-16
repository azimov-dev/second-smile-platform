import { useState, useEffect } from "react";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function PaymentsPage() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi("/payments", { token })
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payments</h1>

      <div className="rounded-xl bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Clinic</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Click Trans ID</th>
              <th className="px-4 py-3 font-medium">Paid At</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-gray-500">{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.clinic_name || p.clinic_id}</td>
                <td className="px-4 py-3">{p.amount?.toLocaleString()} UZS</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "completed" ? "bg-green-100 text-green-700" :
                    p.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.click_trans_id || "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <p className="text-center py-8 text-gray-500">No payments yet</p>
        )}
      </div>
    </div>
  );
}
