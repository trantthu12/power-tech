import { NavLink } from "react-router-dom";
import { Zap } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-sidebar text-slate-300 transition-transform duration-200",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
            <Zap className="h-5 w-5 text-white" fill="currentColor" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Power<span className="text-brand-500">Tech</span>
          </span>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "group relative flex items-center gap-3 border-l-[3px] px-5 py-3 text-sm transition-colors",
                    isActive
                      ? "border-brand-500 bg-white/[0.06] font-medium text-brand-500"
                      : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={[
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? "text-brand-500" : "text-slate-400 group-hover:text-white",
                      ].join(" ")}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.sprint === 3 && (
                      <span className="rounded bg-slate-600/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
                        S3
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/5 px-5 py-4 text-[11px] text-slate-500">
          Sprint 2 &middot; Demo data
        </div>
      </aside>
    </>
  );
}
