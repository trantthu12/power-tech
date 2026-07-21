import { CheckCircle2, AlertCircle } from "lucide-react";
import { useSites } from "@/lib/queries";

export function StatusBanner() {
  const { data: sites } = useSites();
  const offline = sites?.filter((s) => !s.online) ?? [];
  const allOk = offline.length === 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-5 py-3 text-sm ${
        allOk
          ? "border-brand-200 bg-brand-50 text-brand-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {allOk ? (
        <CheckCircle2 className="h-5 w-5 text-brand-600" />
      ) : (
        <AlertCircle className="h-5 w-5 text-amber-500" />
      )}
      <span className="font-medium">
        {allOk
          ? "All systems operational"
          : `${offline.length} station${offline.length > 1 ? "s" : ""} offline`}
      </span>
      {!allOk && (
        <span className="text-amber-600">
          {offline.map((s) => s.name).join(", ")}
        </span>
      )}
    </div>
  );
}
