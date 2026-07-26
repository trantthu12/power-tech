import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { FilterProvider } from "@/lib/filter-context";
import { CityProvider } from "@/lib/city-context";

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <CityProvider>
    <FilterProvider>
      {/* Fixed-height shell: only <main> scrolls → never two scrollbars */}
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header onOpenNav={() => setMobileNavOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {/* key on route so an error on one page clears when navigating away */}
            <ErrorBoundary key={pathname}>
              <Suspense fallback={<Skeleton className="h-full min-h-[60vh] w-full rounded-xl" />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </FilterProvider>
    </CityProvider>
  );
}
