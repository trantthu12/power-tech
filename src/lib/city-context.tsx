import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_CITY } from "./cities";
import type { City } from "./cities";

interface CityContextValue {
  city: City;
  setCity: (c: City) => void;
  /** Whether the city switch is unlocked (via the /vodap route). */
  unlocked: boolean;
}

const CityContext = createContext<CityContextValue | null>(null);
const STORAGE_KEY = "powertech.city";
const UNLOCK_KEY = "powertech.unlockCities";

/** The multi-city switch is hidden by default; visiting /vodap unlocks it. */
export function citiesUnlocked(): boolean {
  return typeof localStorage !== "undefined" && localStorage.getItem(UNLOCK_KEY) === "1";
}

function initialCity(): City {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "boulder" || saved === "palo-alto") return saved;
  }
  return DEFAULT_CITY;
}

export function CityProvider({ children }: { children: ReactNode }) {
  const unlocked = citiesUnlocked();
  const [rawCity, setCity] = useState<City>(initialCity);

  useEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, rawCity);
  }, [rawCity]);

  // When locked, the whole dashboard is Boulder-only regardless of any saved city.
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
