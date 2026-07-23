import { useQuery } from "@tanstack/react-query";
import type { Granularity } from "@/types";
import * as api from "@/services/api";
import { useFilter } from "./filter-context";
import { useCity } from "./city-context";

export function useNetworkKpis() {
  const { city } = useCity();
  const { filter } = useFilter();
  return useQuery({
    queryKey: ["kpis", city, filter.from, filter.to],
    queryFn: () => api.getNetworkKpis(city, { from: filter.from, to: filter.to }),
  });
}

export function useSites() {
  const { city } = useCity();
  return useQuery({ queryKey: ["sites", city], queryFn: () => api.getSites(city) });
}

export function useEnergyByZip() {
  const { city } = useCity();
  return useQuery({ queryKey: ["energy-by-zip", city], queryFn: () => api.getEnergyByZip(city) });
}

export function useTopStations(limit = 5) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["top-stations", city, limit],
    queryFn: () => api.getTopStations(city, limit),
  });
}

export function useTopStationsByArea(perArea = 3) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["top-stations-by-area", city, perArea],
    queryFn: () => api.getTopStationsByArea(city, perArea),
  });
}

export function useStationOptions() {
  const { city } = useCity();
  return useQuery({ queryKey: ["station-options", city], queryFn: () => api.getStationOptions(city) });
}

export function useStationHourly(ids: string[]) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["station-hourly", city, ids],
    queryFn: () => api.getStationHourly(city, ids),
    enabled: ids.length > 0,
  });
}

export function useExpansionSignals() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["expansion-signals", city],
    queryFn: () => api.getExpansionSignals(city),
  });
}

export function useEnergyTrend(granularity: Granularity) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["energy-trend", city, granularity],
    queryFn: () => api.getEnergyTrend(city, granularity),
  });
}

export function useCo2Trend(granularity: Granularity) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["co2-trend", city, granularity],
    queryFn: () => api.getCo2Trend(city, granularity),
  });
}

export function useUtilizationHeatmap(siteId?: string) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["heatmap", city, siteId ?? "all"],
    queryFn: () => api.getUtilizationHeatmap(city, siteId),
  });
}

export function useCo2Heatmap(siteId?: string) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["co2-heatmap", city, siteId ?? "all"],
    queryFn: () => api.getCo2Heatmap(city, siteId),
  });
}

export function useSiteComparison() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["site-comparison", city],
    queryFn: () => api.getSiteComparison(city),
  });
}

export function useLoadStats(siteId?: string) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["load-stats", city, siteId ?? "all"],
    queryFn: () => api.getLoadStats(city, siteId),
  });
}

export function useDemandForecast(siteId?: string) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["demand-forecast", city, siteId ?? "all"],
    queryFn: () => api.getDemandForecast(city, siteId),
  });
}

export function useLoadOptimization(siteId?: string) {
  const { city } = useCity();
  return useQuery({
    queryKey: ["load-optimization", city, siteId ?? "all"],
    queryFn: () => api.getLoadOptimization(city, siteId),
  });
}

export function usePerformanceStats() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["performance-stats", city],
    queryFn: () => api.getPerformanceStats(city),
  });
}

export function useChargerPowerMix() {
  const { city } = useCity();
  return useQuery({
    queryKey: ["charger-power-mix", city],
    queryFn: () => api.getChargerPowerMix(city),
  });
}
