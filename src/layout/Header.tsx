import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useFilter } from "@/lib/filter-context";
import type { Granularity } from "@/types";

const GRANULARITIES: Granularity[] = ["day", "week", "month"];

interface HeaderProps {
  onOpenNav: () => void;
}

export function Header({ onOpenNav }: HeaderProps) {
  const location = useLocation();
  const { filter, setGranularity } = useFilter();
  const current =
    NAV_ITEMS.find((n) =>
      n.path === "/" ? location.pathname === "/" : location.pathname.startsWith(n.path)
    ) ?? NAV_ITEMS[0];

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenNav}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-navy-800 sm:text-lg">
            {current.label}
          </h1>
          <p className="truncate text-xs text-slate-400">{current.audience}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1">
        {GRANULARITIES.map((g) => (
          <button
            key={g}
            onClick={() => setGranularity(g)}
            className={[
              "rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors sm:px-3",
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
