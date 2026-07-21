import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSites } from "@/lib/queries";
import { Skeleton } from "./ui/Skeleton";

export function StatusBanner() {
  const { data: sites, isLoading } = useSites();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
      className={`rounded-xl border text-sm ${
        allOk
          ? "border-brand-200 bg-brand-50 text-brand-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3">
        {allOk ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
        )}

        {allOk ? (
          <span className="font-medium">All systems operational</span>
        ) : (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            aria-expanded={expanded}
          >
            <span className="shrink-0 font-medium">
              {offline.length} stations offline
            </span>
            {!expanded && (
              <span className="truncate text-amber-600">
                {offline.slice(0, 2).map((s) => s.name).join(", ")}
                {offline.length > 2 ? ` +${offline.length - 2} more` : ""}
              </span>
            )}
            {expanded ? (
              <ChevronUp className="ml-auto h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>
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

      {!allOk && expanded && (
        <div className="border-t border-amber-200 px-5 py-3">
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {offline.map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="min-w-0">
                  <span className="font-medium text-amber-800">{s.name}</span>
                  <span className="text-amber-600"> · {s.city}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
