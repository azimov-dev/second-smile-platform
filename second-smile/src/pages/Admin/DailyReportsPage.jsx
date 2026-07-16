import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

export default function DailyReportsPage() {
  // const { token } = useAuth();
  const { t } = useLanguage();

  const [rows, setRows] = useState([]);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState("");

  // useEffect(() => {
  //   const fetchDailyReports = async () => {
  //     if (!token) {
  //       setLoading(false);
  //       return;
  //     }

  //     try {
  //       setLoading(true);
  //       setError("");
  //       const data = await apiClient("/reports/daily", { token });
  //       setRows(Array.isArray(data) ? data : []);
  //     } catch (err) {
  //       setError(err.message || t("errors.loadingFailed"));
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchDailyReports();
  // }, [token, t]);

  const total = rows.reduce((sum, row) => sum + (row.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {t("dailyReports")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("dailyReportsDescription")}
          </p>
        </div>

        <div className="rounded-xl bg-sky-50 px-4 py-2 text-xs text-sky-700">
          {t("common.total")}:{" "}
          <span className="font-semibold">
            {total.toLocaleString()} so&apos;m
          </span>
        </div>
      </div>

      {/* {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )} */}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">{t("common.date")}</th>
                <th className="px-4 py-3 font-medium">{t("common.patient")}</th>
                <th className="px-4 py-3 font-medium">{t("common.doctor")}</th>
                <th className="px-4 py-3 font-medium text-right">
                  {t("common.amount")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {
                // loading
                false ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      {t("noReportsYet")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {row.date
                          ? new Date(row.date).toLocaleDateString("uz-UZ")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {row.patient_name || "-"}
                      </td>
                      <td className="px-4 py-3">{row.doctor_name || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {row.amount?.toLocaleString() || 0} so&apos;m
                      </td>
                    </tr>
                  ))
                )
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
