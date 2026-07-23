import { NavLink } from "react-router-dom";
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
        {/* Brand: PowerTech (client). Compact white badge lifts the logo off the dark rail. */}
        <div className="flex justify-center px-5 pb-2 pt-5">
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <img
              src="/powertech-logo.png"
              alt="PowerTech"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
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

        <div className="border-t border-white/5 px-5 py-4">
          {/* Academic attribution: SFU (the team). Logo art is on white, so it sits in a white card. */}
          <div className="rounded-lg bg-white px-3 py-2.5">
            <img
              src="/sfu-logo.png"
              alt="Simon Fraser University"
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      </aside>
    </>
  );
}
