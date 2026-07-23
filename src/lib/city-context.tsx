import { createContext, useContext, useState } from "react";
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
  // The switch is available across the whole /vodap URL space (/vodap,
  // /vodap/stations, …). Any other URL is Boulder-only. No persistence — the
  // state is fully determined by the URL, so reloads and shares are consistent.
  const unlocked = pathname === "/vodap" || pathname.startsWith("/vodap/");

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
