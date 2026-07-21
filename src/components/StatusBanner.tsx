import { useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { useSites } from "@/lib/queries";
import { Skeleton } from "./ui/Skeleton";

export function StatusBanner() {
  const { data: sites, isLoading } = useSites();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // While loading, show a neutral placeholder — never flash the green
  // "all operational" state before the real status is known.
  if (isLoading || !sites) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  const offline = sites.filter((s) => !s.online);
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
        <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
      )}
      <span className="font-medium">
        {allOk
          ? "All systems operational"
          : `${offline.length} station${offline.length > 1 ? "s" : ""} offline`}
      </span>
      {!allOk && (
        <span className="truncate text-amber-600">
          {offline.slice(0, 2).map((s) => s.name).join(", ")}
          {offline.length > 2 ? ` +${offline.length - 2} more` : ""}
        </span>
      )}
      <button
        onClick={() => setDismissed(true)}
        className={`ml-auto shrink-0 rounded-md p-1 transition-colors ${
          allOk
            ? "text-brand-600 hover:bg-brand-100"
            : "text-amber-600 hover:bg-amber-100"
        }`}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
