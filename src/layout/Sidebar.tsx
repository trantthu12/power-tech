import { NavLink } from "react-router-dom";
import { Zap } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-slate-300">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
          <Zap className="h-5 w-5 text-white" fill="currentColor" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">
          Power<span className="text-brand-500">Tech</span>
        </span>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                [
                  "group mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-hover text-white"
                    : "text-slate-400 hover:bg-sidebar-hover hover:text-white",
                ].join(" ")
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.sprint === 3 && (
                <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
                  S3
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] text-slate-500">
        Sprint 2 &middot; Demo data
      </div>
    </aside>
  );
}
