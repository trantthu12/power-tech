// The cities the dashboard can show. Each maps to a baked dataset in src/data.
export type City = "boulder" | "palo-alto" | "new-york";

export interface CityMeta {
  id: City;
  label: string;
  /** Short "City, State" used in map subtitles etc. */
  place: string;
  /** Fallback map center [lat, lng] before points load. */
  center: [number, number];
}

export const CITIES: CityMeta[] = [
  { id: "boulder", label: "Boulder", place: "Boulder, CO", center: [40.015, -105.2705] },
  { id: "palo-alto", label: "Palo Alto", place: "Palo Alto, CA", center: [37.4419, -122.143] },
  { id: "new-york", label: "New York", place: "New York, NY", center: [40.7128, -74.006] },
];

export const DEFAULT_CITY: City = "boulder";

export function cityMeta(city: City): CityMeta {
  return CITIES.find((c) => c.id === city) ?? CITIES[0];
}

/** What the "area" grouping represents for a city: ZIP codes vs NYC boroughs. */
export function areaWord(city: City): "ZIP" | "Borough" {
  return city === "new-york" ? "Borough" : "ZIP";
}
