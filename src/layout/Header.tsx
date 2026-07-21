import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "@/lib/nav";
import { useFilter } from "@/lib/filter-context";
import type { Granularity } from "@/types";

const GRANULARITIES: Granularity[] = ["day", "week", "month"];

export function Header() {
  const location = useLocation();
  const { filter, setGranularity } = useFilter();
  const current =
    NAV_ITEMS.find((n) =>
      n.path === "/" ? location.pathname === "/" : location.pathname.startsWith(n.path)
    ) ?? NAV_ITEMS[0];

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-navy-800">{current.label}</h1>
        <p className="text-xs text-slate-400">{current.audience}</p>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        {GRANULARITIES.map((g) => (
          <button
            key={g}
            onClick={() => setGranularity(g)}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              filter.granularity === g
                ? "bg-white text-navy-800 shadow-sm"
                : "text-slate-500 hover:text-navy-700",
            ].join(" ")}
          >
            {g}
          </button>
        ))}
      </div>
    </header>
  );
}
