import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DateRangeFilter, Granularity } from "@/types";

interface FilterContextValue {
  filter: DateRangeFilter;
  setGranularity: (g: Granularity) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

function rangeForGranularity(granularity: Granularity): DateRangeFilter {
  const to = new Date();
  const from = new Date(to);
  if (granularity === "day") from.setDate(from.getDate() - 1);
  if (granularity === "week") from.setDate(from.getDate() - 7);
  if (granularity === "month") from.setMonth(from.getMonth() - 1);
  return {
    granularity,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [granularity, setGranularity] = useState<Granularity>("month");

  const value = useMemo<FilterContextValue>(
    () => ({
      filter: rangeForGranularity(granularity),
      setGranularity,
    }),
    [granularity]
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
