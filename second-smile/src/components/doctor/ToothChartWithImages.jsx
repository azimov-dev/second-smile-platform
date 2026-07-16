// Tooth chart with per-tooth selectable images
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { Check, AlertCircle } from "lucide-react";

const adultTeeth = [
  // Upper: right to left (18-11, 21-28)
  { fdi: "18", type: "molar", quadrant: "UR" },
  { fdi: "17", type: "molar", quadrant: "UR" },
  { fdi: "16", type: "molar", quadrant: "UR" },
  { fdi: "15", type: "premolar", quadrant: "UR" },
  { fdi: "14", type: "premolar", quadrant: "UR" },
  { fdi: "13", type: "canine", quadrant: "UR" },
  { fdi: "12", type: "incisor", quadrant: "UR" },
  { fdi: "11", type: "incisor", quadrant: "UR" },
  { fdi: "21", type: "incisor", quadrant: "UL" },
  { fdi: "22", type: "incisor", quadrant: "UL" },
  { fdi: "23", type: "canine", quadrant: "UL" },
  { fdi: "24", type: "premolar", quadrant: "UL" },
  { fdi: "25", type: "premolar", quadrant: "UL" },
  { fdi: "26", type: "molar", quadrant: "UL" },
  { fdi: "27", type: "molar", quadrant: "UL" },
  { fdi: "28", type: "molar", quadrant: "UL" },
  // Lower: right to left (48-41, 31-38)
  { fdi: "48", type: "molar", quadrant: "LR" },
  { fdi: "47", type: "molar", quadrant: "LR" },
  { fdi: "46", type: "molar", quadrant: "LR" },
  { fdi: "45", type: "premolar", quadrant: "LR" },
  { fdi: "44", type: "premolar", quadrant: "LR" },
  { fdi: "43", type: "canine", quadrant: "LR" },
  { fdi: "42", type: "incisor", quadrant: "LR" },
  { fdi: "41", type: "incisor", quadrant: "LR" },
  { fdi: "31", type: "incisor", quadrant: "LL" },
  { fdi: "32", type: "incisor", quadrant: "LL" },
  { fdi: "33", type: "canine", quadrant: "LL" },
  { fdi: "34", type: "premolar", quadrant: "LL" },
  { fdi: "35", type: "premolar", quadrant: "LL" },
  { fdi: "36", type: "molar", quadrant: "LL" },
  { fdi: "37", type: "molar", quadrant: "LL" },
  { fdi: "38", type: "molar", quadrant: "LL" },
];

const getStatusColor = (status) => {
  if (status === "caries") return "from-red-900 to-red-700";
  if (status === "filled") return "from-amber-900 to-amber-700";
  if (status === "crown") return "from-yellow-500 to-yellow-400";
  if (status === "missing") return "from-slate-600 to-slate-500";
  if (status === "root_canal") return "from-cyan-600 to-cyan-500";
  return "from-slate-200 to-slate-100";
};

const getStatusLabel = (status, t) => {
  const labels = {
    caries: t("treatment.status.caries") || "Tooth Decay",
    filled: t("treatment.status.filled") || "Filled",
    crown: t("treatment.status.crown") || "Crown",
    missing: t("treatment.status.missing") || "Missing",
    root_canal: t("treatment.status.rootCanal") || "Root Canal",
  };
  return labels[status] || "";
};

export function ToothChartWithImages({
  toothStatus = {},
  selectedTeeth = [],
  onToothClick,
  selectable = true,
}) {
  const { t } = useLanguage();

  const handleClick = (fdi) => {
    if (selectable && onToothClick) {
      onToothClick(fdi);
    }
  };

  const isSelected = (fdi) => selectedTeeth.includes(fdi);
  const status = (fdi) => toothStatus[fdi];

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-white p-6 shadow-lg">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          {t("treatment.toothChart", {}, "Tooth Chart")}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {t(
            "treatment.selectTeethForService",
            {},
            "Click teeth to select them for the treatment",
          )}
        </p>
      </div>

      {/* Upper Teeth */}
      <div className="mb-10">
        <h3 className="mb-4 text-center text-lg font-semibold text-slate-700">
          {t("treatment.upperTeeth", {}, "Upper Teeth")}
        </h3>
        <div className="grid gap-2 [grid-template-columns:repeat(16,minmax(0,1fr))]">
          {adultTeeth.slice(0, 16).map((tooth) => {
            const sel = isSelected(tooth.fdi);
            const stat = status(tooth.fdi);

            return (
              <div
                key={tooth.fdi}
                onClick={() => handleClick(tooth.fdi)}
                className={`relative group cursor-pointer transition-all duration-200 min-w-0 ${
                  selectable ? "hover:scale-105" : ""
                }`}
              >
                {/* Image / Placeholder Card */}
                <div
                  className={`relative w-full aspect-square rounded-lg border-2 overflow-hidden shadow-sm transition-all ${
                    sel
                      ? "border-blue-600 ring-2 ring-blue-300 shadow-lg"
                      : "border-slate-300 hover:border-slate-400"
                  } bg-gradient-to-br ${getStatusColor(stat)}`}
                >
                  {/* Image Placeholder */}
                  <img
                    src={`/teeth/types/${tooth.type}.png`}
                    alt={`Tooth ${tooth.fdi}`}
                    className="w-full h-full object-contain p-0.5 rotate-180"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />

                  {/* Fallback SVG if image not found */}
                  <svg
                    viewBox="0 0 100 120"
                    className="w-full h-full p-2"
                    style={{
                      display: "block",
                      background: `linear-gradient(to br, var(--tw-gradient-stops))`,
                    }}
                  >
                    {/* Simple tooth outline */}
                    <path
                      d="M 30 20 Q 30 10 50 10 Q 70 10 70 20 L 70 60 Q 70 80 50 90 Q 30 80 30 60 Z"
                      fill="rgba(255,255,255,0.9)"
                      stroke="rgba(100,100,100,0.5)"
                      strokeWidth="1"
                    />
                  </svg>

                  {/* Selection checkmark */}
                  {sel && (
                    <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-blue-600 bg-white rounded-full p-1" />
                    </div>
                  )}

                  {/* Status indicator */}
                  {stat && stat !== "healthy" && (
                    <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                      <AlertCircle className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Tooth Number */}
                <p className="mt-2 text-center text-sm font-semibold text-slate-700">
                  {tooth.fdi}
                </p>

                {/* Type label (on hover) */}
                <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {tooth.type}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lower Teeth */}
      <div>
        <h3 className="mb-4 text-center text-lg font-semibold text-slate-700">
          {t("treatment.lowerTeeth", {}, "Lower Teeth")}
        </h3>
        <div className="grid gap-2 [grid-template-columns:repeat(16,minmax(0,1fr))]">
          {adultTeeth.slice(16).map((tooth) => {
            const sel = isSelected(tooth.fdi);
            const stat = status(tooth.fdi);

            return (
              <div
                key={tooth.fdi}
                onClick={() => handleClick(tooth.fdi)}
                className={`relative group cursor-pointer transition-all duration-200 min-w-0 ${
                  selectable ? "hover:scale-105" : ""
                }`}
              >
                {/* Image / Placeholder Card */}
                <div
                  className={`relative w-full aspect-square rounded-lg border-2 overflow-hidden shadow-sm transition-all ${
                    sel
                      ? "border-blue-600 ring-2 ring-blue-300 shadow-lg"
                      : "border-slate-300 hover:border-slate-400"
                  } bg-gradient-to-br ${getStatusColor(stat)}`}
                >
                  {/* Image Placeholder */}
                  <img
                    src={`/teeth/types/${tooth.type}.png`}
                    alt={`Tooth ${tooth.fdi}`}
                    className="w-full h-full object-contain p-0.5"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />

                  {/* Fallback SVG if image not found */}
                  <svg
                    viewBox="0 0 100 120"
                    className="w-full h-full p-2"
                    style={{
                      display: "block",
                      background: `linear-gradient(to br, var(--tw-gradient-stops))`,
                    }}
                  >
                    {/* Simple tooth outline */}
                    <path
                      d="M 30 20 Q 30 10 50 10 Q 70 10 70 20 L 70 60 Q 70 80 50 90 Q 30 80 30 60 Z"
                      fill="rgba(255,255,255,0.9)"
                      stroke="rgba(100,100,100,0.5)"
                      strokeWidth="1"
                    />
                  </svg>

                  {/* Selection checkmark */}
                  {sel && (
                    <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-blue-600 bg-white rounded-full p-1" />
                    </div>
                  )}

                  {/* Status indicator */}
                  {stat && stat !== "healthy" && (
                    <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                      <AlertCircle className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Tooth Number */}
                <p className="mt-2 text-center text-sm font-semibold text-slate-700">
                  {tooth.fdi}
                </p>

                {/* Type label (on hover) */}
                <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {tooth.type}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected teeth summary */}
      {selectedTeeth.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-center font-medium text-slate-800">
            {t("treatment.selectedTeeth", {}, "Selected teeth")}:{" "}
            <span className="text-blue-700 font-bold">
              {selectedTeeth.join(", ")}
            </span>
          </p>
        </div>
      )}

      {/* Instructions */}
      <p className="mt-6 text-center text-xs text-slate-500">
        {t("treatment.toothChartHint", {}, "Click teeth to select them")}
      </p>
    </div>
  );
}
