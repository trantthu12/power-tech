import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Card, CardHeader } from "./ui/Card";
import { useSites } from "@/lib/queries";

// Metro Vancouver, BC (fallback center before the sites load / fit).
const DEFAULT_CENTER: [number, number] = [49.24, -122.98];

/** Auto-zoom to frame the whole PowerTech network. */
function FitToSites({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

export function StationMap() {
  const { data: sites } = useSites();
  const rows = sites ?? [];
  const points = rows.map((s) => [s.lat, s.lng] as [number, number]);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-5 pb-3">
        <CardHeader
          title="Locations"
          subtitle={`PowerTech network — ${rows.length} stations across Metro Vancouver, BC`}
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
          {rows.map((site) => (
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
                  <div className={site.online ? "text-brand-600" : "text-rose-500"}>
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
