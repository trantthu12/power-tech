import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_CITY } from "./cities";
import type { City } from "./cities";

interface CityContextValue {
  city: City;
  setCity: (c: City) => void;
}

const CityContext = createContext<CityContextValue | null>(null);
const STORAGE_KEY = "powertech.city";

function initialCity(): City {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "boulder" || saved === "palo-alto") return saved;
  }
  return DEFAULT_CITY;
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState<City>(initialCity);

  useEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, city);
  }, [city]);

  return (
    <CityContext.Provider value={{ city, setCity }}>{children}</CityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
