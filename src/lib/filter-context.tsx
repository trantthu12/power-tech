import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DateRangeFilter, Granularity } from "@/types";
import type { City } from "./cities";
import boulder from "@/data/boulder-data.json";
import paloAlto from "@/data/palo-alto-data.json";
import newYork from "@/data/new-york-data.json";
import { useCity } from "./city-context";

interface FilterContextValue {
  filter: DateRangeFilter;
  setGranularity: (g: Granularity) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

// Latest real session per city. Windows anchor here (not the wall clock) so the
// "recent" ranges always contain data — the datasets are historical.
const DATE_END: Record<City, string> = {
  boulder: boulder.meta.dateEnd,
  "palo-alto": paloAlto.meta.dateEnd,
  "new-york": newYork.meta.dateEnd,
};

// The Granularity enum values are reused as window keys:
// day = last 30 days, week = last 90 days, month = last 12 months — all
// measured back from the dataset's latest session (dateEnd).
function rangeForGranularity(granularity: Granularity, dateEnd: string): DateRangeFilter {
  const to = new Date(`${dateEnd}T23:59:59.999Z`);
  const from = new Date(to);
  if (granularity === "day") from.setUTCDate(from.getUTCDate() - 30);
  if (granularity === "week") from.setUTCDate(from.getUTCDate() - 90);
  if (granularity === "month") from.setUTCFullYear(from.getUTCFullYear() - 1);
  return {
    granularity,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const { city } = useCity();
  const [granularity, setGranularity] = useState<Granularity>("day");

  const value = useMemo<FilterContextValue>(
    () => ({
      filter: rangeForGranularity(granularity, DATE_END[city]),
      setGranularity,
    }),
    [granularity, city]
  );

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilter(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilter must be used within FilterProvider");
  return ctx;
}
