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

export function useConnectorBreakdown() {
  return useQuery({
    queryKey: ["connectors"],
    queryFn: api.getConnectorBreakdown,
  });
}

export function useCityBreakdown() {
  return useQuery({ queryKey: ["cities"], queryFn: api.getCityBreakdown });
}

export function useEnergyTrend(granularity: Granularity) {
  return useQuery({
    queryKey: ["energy-trend", granularity],
    queryFn: () => api.getEnergyTrend(granularity),
  });
}

export function useRevenueTrend(granularity: Granularity) {
  return useQuery({
    queryKey: ["revenue-trend", granularity],
    queryFn: () => api.getRevenueTrend(granularity),
  });
}

export function useUtilizationHeatmap(siteId?: string) {
  return useQuery({
    queryKey: ["heatmap", siteId ?? "all"],
    queryFn: () => api.getUtilizationHeatmap(siteId),
  });
}

export function useRevenueHeatmap(siteId?: string) {
  return useQuery({
    queryKey: ["revenue-heatmap", siteId ?? "all"],
    queryFn: () => api.getRevenueHeatmap(siteId),
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

export function usePerformanceStats() {
  return useQuery({
    queryKey: ["performance-stats"],
    queryFn: api.getPerformanceStats,
  });
}

export function useFaults() {
  return useQuery({ queryKey: ["faults"], queryFn: api.getFaults });
}

export function useRecentSessions(limit = 50) {
  return useQuery({
    queryKey: ["sessions", limit],
    queryFn: () => api.getRecentSessions(limit),
  });
}
