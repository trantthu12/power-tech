import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { Card, CardHeader } from "./ui/Card";
import { useSites } from "@/lib/queries";

// Centered on Colorado; sites span Boulder/Denver/Fort Collins + CA.
const DEFAULT_CENTER: [number, number] = [39.8, -105.0];

export function StationMap() {
  const { data: sites } = useSites();
  const rows = sites ?? [];

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-5 pb-3">
        <CardHeader title="Locations" />
      </div>
      <div className="h-[360px] w-full">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={6}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
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
                  <div className="text-slate-500">{site.address}</div>
                  <div className="text-slate-500">
                    {site.city}, {site.zip}
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
