import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useCity } from "@/lib/city-context";
import type { City } from "@/lib/cities";
import boulder from "@/data/boulder-data.json";
import paloAlto from "@/data/palo-alto-data.json";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const META: Record<City, { source: string; dateEnd: string }> = {
  boulder: { source: "City of Boulder open data", dateEnd: boulder.meta.dateEnd },
  "palo-alto": { source: "City of Palo Alto open data", dateEnd: paloAlto.meta.dateEnd },
};
function formatAsOf(dateEnd: string): string {
  const [dY, dM, dD] = dateEnd.split("-");
  return `${MONTHS[+dM - 1]} ${+dD}, ${dY}`;
}

const COLLAPSE_KEY = "pt-sidebar-collapsed";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { city } = useCity();
  const meta = META[city];
  // Desktop-only collapse to an icon rail; persisted so it sticks across visits.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () => setCollapsed((c) => !c);
  // Persist outside the updater: React 18 StrictMode double-invokes the
  // updater in dev, which would cancel a write made inside it.
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable — keep in-memory state only */
    }
  }, [collapsed]);

  // Preserve the /vodap prefix while navigating so the city switch stays on.
  const pathname = useLocation().pathname;
  const underVodap = pathname === "/vodap" || pathname.startsWith("/vodap/");
  const navTo = (path: string) =>
    underVodap ? `/vodap${path === "/" ? "" : path}` : path;

  const cx = (...parts: (string | false | undefined)[]) =>
    parts.filter(Boolean).join(" ");

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
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-sidebar text-slate-300 transition-[width,transform] duration-200",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand centered; collapse toggle pinned to the right (desktop). */}
        <div className="relative flex items-center justify-center px-3 pb-3 pt-4">
          {/* PowerTech badge — hidden on the collapsed desktop rail. */}
          <div
            className={cx(
              "rounded-xl bg-white p-2 shadow-sm",
              collapsed && "lg:hidden",
            )}
          >
            <img
              src="/powertech-logo.png"
              alt="PowerTech"
              className="h-12 w-auto object-contain"
            />
          </div>
          {/* Collapse toggle (desktop only — mobile uses the drawer).
              Absolute-right while expanded so it doesn't shift the centered logo;
              static (flows to center) on the collapsed rail. */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cx(
              "hidden shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white lg:inline-flex",
              !collapsed && "lg:absolute lg:right-3 lg:top-1/2 lg:-translate-y-1/2",
            )}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-pressed={collapsed}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={navTo(item.path)}
                end={item.path === "/"}
                onClick={onClose}
                title={item.label}
                className={({ isActive }) =>
                  cx(
                    "group relative flex items-center border-l-[3px] py-3 text-sm transition-colors",
                    "gap-3 px-5",
                    collapsed && "lg:justify-center lg:gap-0 lg:px-2",
                    isActive
                      ? "border-brand-500 bg-white/[0.06] font-medium text-brand-500"
                      : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cx(
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? "text-brand-500" : "text-slate-400 group-hover:text-white",
                      )}
                    />
                    <span
                      className={cx("flex-1 truncate", collapsed && "lg:hidden")}
                    >
                      {item.label}
                    </span>
                    {item.sprint === 3 && (
                      <span
                        className={cx(
                          "rounded bg-slate-600/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-200",
                          collapsed && "lg:hidden",
                        )}
                      >
                        S3
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Academic attribution: SFU (the team). Hidden on the collapsed rail — logo is too wide. */}
        <div
          className={cx(
            "border-t border-white/5 px-5 py-5",
            collapsed && "lg:hidden",
          )}
        >
          <div className="flex justify-center">
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              <img
                src="/sfu-logo.png"
                alt="Simon Fraser University"
                className="h-8 w-auto object-contain"
              />
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
            SFU capstone project
            <br />
            {meta.source}
            <br />
            Data as of {formatAsOf(meta.dateEnd)}
          </p>
        </div>
      </aside>
    </>
  );
}
