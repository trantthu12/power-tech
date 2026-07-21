import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useFilter } from "@/lib/filter-context";
import type { Granularity } from "@/types";

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "day", label: "24h" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
];

function formatRange(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const sameYear = from.getFullYear() === to.getFullYear();
  const fmt = (d: Date, withYear: boolean) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    });
  return `${fmt(from, !sameYear)} – ${fmt(to, true)}`;
}

export function Header({ onOpenNav }: HeaderProps) {
  const location = useLocation();
  const { filter, setGranularity } = useFilter();
  const current =
    NAV_ITEMS.find((n) =>
      n.path === "/" ? location.pathname === "/" : location.pathname.startsWith(n.path)
    ) ?? NAV_ITEMS[0];

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
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

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              onClick={() => setGranularity(g.value)}
              className={[
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
                filter.granularity === g.value
                  ? "bg-white text-navy-800 shadow-sm"
                  : "text-slate-500 hover:text-navy-700",
              ].join(" ")}
            >
              {g.label}
            </button>
          ))}
        </div>
        <span className="hidden text-[11px] text-slate-400 sm:block">
          {formatRange(filter.from, filter.to)}
        </span>
      </div>
    </header>
  );
}

interface HeaderProps {
  onOpenNav: () => void;
}
