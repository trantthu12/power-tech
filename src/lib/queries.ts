import { useQuery } from "@tanstack/react-query";
import type { Granularity } from "@/types";
import * as api from "@/services/api";
import { useFilter } from "./filter-context";

export function useNetworkKpis() {
  const { filter } = useFilter();
  return useQuery({
    queryKey: ["kpis", filter.from, filter.to],
    queryFn: () => api.getNetworkKpis({ from: filter.from, to: filter.to }),
  });
}

export function useSites() {
  return useQuery({ queryKey: ["sites"], queryFn: api.getSites });
}

export function useEnergyByZip() {
  return useQuery({ queryKey: ["energy-by-zip"], queryFn: api.getEnergyByZip });
}

export function useTopStations(limit = 5) {
  return useQuery({
    queryKey: ["top-stations", limit],
    queryFn: () => api.getTopStations(limit),
  });
}

export function useTopStationsByArea(perArea = 3) {
  return useQuery({
    queryKey: ["top-stations-by-area", perArea],
    queryFn: () => api.getTopStationsByArea(perArea),
  });
}

export function useStationOptions() {
  return useQuery({ queryKey: ["station-options"], queryFn: api.getStationOptions });
}

export function useStationHourly(ids: string[]) {
  return useQuery({
    queryKey: ["station-hourly", ids],
    queryFn: () => api.getStationHourly(ids),
    enabled: ids.length > 0,
  });
}

export function useExpansionSignals() {
  return useQuery({
    queryKey: ["expansion-signals"],
    queryFn: api.getExpansionSignals,
  });
}

export function useEnergyTrend(granularity: Granularity) {
  return useQuery({
    queryKey: ["energy-trend", granularity],
    queryFn: () => api.getEnergyTrend(granularity),
  });
}

export function useCo2Trend(granularity: Granularity) {
  return useQuery({
    queryKey: ["co2-trend", granularity],
    queryFn: () => api.getCo2Trend(granularity),
  });
}

export function useUtilizationHeatmap(siteId?: string) {
  return useQuery({
    queryKey: ["heatmap", siteId ?? "all"],
    queryFn: () => api.getUtilizationHeatmap(siteId),
  });
}

export function useCo2Heatmap(siteId?: string) {
  return useQuery({
    queryKey: ["co2-heatmap", siteId ?? "all"],
    queryFn: () => api.getCo2Heatmap(siteId),
  });
}

export function useSiteComparison() {
  return useQuery({
    queryKey: ["site-comparison"],
    queryFn: api.getSiteComparison,
  });
}

export function useLoadStats(siteId?: string) {
  return useQuery({
    queryKey: ["load-stats", siteId ?? "all"],
    queryFn: () => api.getLoadStats(siteId),
  });
}

export function useDemandForecast(siteId?: string) {
  return useQuery({
    queryKey: ["demand-forecast", siteId ?? "all"],
    queryFn: () => api.getDemandForecast(siteId),
  });
}

export function useLoadOptimization(siteId?: string) {
  return useQuery({
    queryKey: ["load-optimization", siteId ?? "all"],
    queryFn: () => api.getLoadOptimization(siteId),
  });
}

export function usePerformanceStats() {
  return useQuery({
    queryKey: ["performance-stats"],
    queryFn: api.getPerformanceStats,
  });
}

// --- Infrastructure Planning (real public-station inventory) ------------------

export function useInfraStats() {
  return useQuery({ queryKey: ["infra-stats"], queryFn: api.getInfraStats });
}

export function useStationsByNetwork() {
  return useQuery({ queryKey: ["stations-by-network"], queryFn: api.getStationsByNetwork });
}

export function useConnectorMix() {
  return useQuery({ queryKey: ["connector-mix"], queryFn: api.getConnectorMix });
}

export function useInfraGrowth() {
  return useQuery({ queryKey: ["infra-growth"], queryFn: api.getInfraGrowth });
}

export function usePublicStations() {
  return useQuery({ queryKey: ["public-stations"], queryFn: api.getPublicStations });
}
