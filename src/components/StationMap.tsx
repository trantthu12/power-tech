import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { LocateFixed } from "lucide-react";
import { Card, CardHeader } from "./ui/Card";
import { useSites } from "@/lib/queries";
import { fetchNearestStations } from "@/services/ocm";
import type { Site } from "@/types";

// Metro Vancouver, BC (fallback center before geolocation / when it's denied).
const DEFAULT_CENTER: [number, number] = [49.24, -122.98];

/** Auto-zoom to frame the given points. */
function FitToSites({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

interface GeoLocatorProps {
  onLocated: (pos: [number, number], nearby: Site[] | null) => void;
  onStatus: (s: "locating" | "nearby" | "fallback") => void;
}

/** Requests browser geolocation and fetches the nearest stations from OCM. */
function GeoLocator({ onLocated, onStatus }: GeoLocatorProps) {
  const run = () => {
    if (!("geolocation" in navigator)) {
      onStatus("fallback");
      return;
    }
    onStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        try {
          const sites = await fetchNearestStations(p[0], p[1], 8);
          if (sites.length > 0) {
            onLocated(p, sites);
            onStatus("nearby");
            return;
          }
        } catch {
          /* fall through to fallback */
        }
        // Located but couldn't fetch nearby stations → keep the BC network.
        onStatus("fallback");
      },
      () => onStatus("fallback"),
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  // Try once on mount.
  useEffect(run, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      type="button"
      onClick={run}
      title="Find stations near me"
      className="absolute right-3 top-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
    >
      <LocateFixed className="h-4 w-4" />
    </button>
  );
}

export function StationMap() {
  const { data: baked } = useSites();
  const [nearby, setNearby] = useState<Site[] | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<"locating" | "nearby" | "fallback">(
    "fallback"
  );

  const usingNearby = status === "nearby" && nearby !== null;
  const sites = usingNearby ? nearby : baked ?? [];
  const points: [number, number][] = [
    ...sites.map((s) => [s.lat, s.lng] as [number, number]),
    ...(usingNearby && userPos ? [userPos] : []),
  ];

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <CardHeader
          title="Locations"
          subtitle={
            usingNearby
              ? "8 charging stations nearest you (live · Open Charge Map)"
              : status === "locating"
              ? "Finding stations near you…"
              : "PowerTech network — Metro Vancouver, BC"
          }
        />
      </div>
      <div className="relative h-[360px] w-full">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={10}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToSites points={points} />
          <GeoLocator
            onLocated={(pos, sites) => {
              setUserPos(pos);
              setNearby(sites);
            }}
            onStatus={setStatus}
          />

          {/* User location */}
          {usingNearby && userPos && (
            <CircleMarker
              center={userPos}
              radius={8}
              pathOptions={{
                color: "#2a78d6",
                fillColor: "#2a78d6",
                fillOpacity: 0.9,
                weight: 3,
              }}
            >
              <Popup>You are here</Popup>
            </CircleMarker>
          )}

          {sites.map((site) => (
            <CircleMarker
              key={site.id}
              center={[site.lat, site.lng]}
              radius={7}
              pathOptions={{
                color: site.online ? "#5fa32f" : "#f43f5e",
                fillColor: site.online ? "#7ac943" : "#fb7185",
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold text-navy-800">{site.name}</div>
                  {site.address && (
                    <div className="text-slate-500">{site.address}</div>
                  )}
                  <div className="text-slate-500">
                    {site.city}
                    {site.zip && site.zip !== "—" ? `, ${site.zip}` : ""}
                  </div>
                  <div className="mt-1">
                    Ports: <span className="font-medium">{site.numPorts}</span>
                  </div>
                  <div>
                    Connectors:{" "}
                    <span className="font-medium">
                      {site.connectorTypes.join(", ")}
                    </span>
                  </div>
                  <div
                    className={site.online ? "text-brand-600" : "text-rose-500"}
                  >
                    {site.online ? "Online" : "Offline"}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </Card>
  );
}
