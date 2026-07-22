import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DateRangeFilter, Granularity } from "@/types";
import { DEMO_NOW_MS } from "./demo-time";

interface FilterContextValue {
  filter: DateRangeFilter;
  setGranularity: (g: Granularity) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

// The Boulder dataset is historical (years of sessions), so the overview window
// uses meaningful ranges that always contain data. The Granularity enum values
// are reused as window keys: day = 30 days, week = 90 days, month = 12 months.
function rangeForGranularity(granularity: Granularity): DateRangeFilter {
  const to = new Date(DEMO_NOW_MS);
  const from = new Date(to);
  if (granularity === "day") from.setDate(from.getDate() - 30);
  if (granularity === "week") from.setDate(from.getDate() - 90);
  if (granularity === "month") from.setFullYear(from.getFullYear() - 1);
  return {
    granularity,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [granularity, setGranularity] = useState<Granularity>("day");

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
