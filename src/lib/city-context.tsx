import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_CITY } from "./cities";
import type { City } from "./cities";

interface CityContextValue {
  city: City;
  setCity: (c: City) => void;
  /** Whether the city switch is available (only on the /vodap route). */
  unlocked: boolean;
}

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const pathname = useLocation().pathname;
  // Visiting /vodap unlocks the switch and keeps it unlocked for the rest of the
  // session, so it survives client-side navigation to other menu items.
  // No persistence: a hard reload on any other URL re-locks to Boulder.
  const [unlocked, setUnlocked] = useState(pathname === "/vodap");
  useEffect(() => {
    if (pathname === "/vodap") setUnlocked(true);
  }, [pathname]);

  const [rawCity, setCity] = useState<City>(DEFAULT_CITY);

  // While locked, everything stays on Boulder.
  const city = unlocked ? rawCity : DEFAULT_CITY;

  return (
    <CityContext.Provider value={{ city, setCity, unlocked }}>{children}</CityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
