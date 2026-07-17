import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Plus, Pencil, Ban, CheckCircle } from "lucide-react";

export default function ClinicsPage() {
  const { token } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClinics();
  }, []);

  async function loadClinics() {
    try {
      const data = await adminApi("/clinics", { token });
      setClinics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(clinic) {
    try {
      await adminApi(`/clinics/${clinic.id}`, {
        method: "PUT",
        token,
        body: { is_active: !clinic.is_active },
      });
      loadClinics();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clinics</h1>
        <Link
          to="/clinics/new"
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition"
        >
          <Plus className="h-4 w-4" />
          Add Clinic
        </Link>
      </div>

      <div className="rounded-xl bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Owner Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clinics.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.slug}</td>
                <td className="px-4 py-3">{c.owner_phone || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {c.is_active ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {c.subscription?.status || "None"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/clinics/${c.id}`}
                      className="rounded p-1 hover:bg-gray-100"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4 text-gray-600" />
                    </Link>
                    <button
                      onClick={() => toggleActive(c)}
                      className="rounded p-1 hover:bg-gray-100"
                      title={c.is_active ? "Suspend" : "Activate"}
                    >
                      {c.is_active ? (
                        <Ban className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clinics.length === 0 && (
          <p className="text-center py-8 text-gray-500">No clinics yet</p>
        )}
      </div>
    </div>
  );
}
