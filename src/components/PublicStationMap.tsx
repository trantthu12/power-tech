import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Card, CardHeader } from "./ui/Card";
import { usePublicStations } from "@/lib/queries";
import { CATEGORICAL } from "@/lib/colors";

const DEFAULT_CENTER: [number, number] = [40.015, -105.2705];

function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

export function PublicStationMap() {
  const { data } = usePublicStations();
  const rows = data ?? [];
  const points = rows.map((s) => [s.lat, s.lng] as [number, number]);

  // Colour the largest networks; everything else is grey.
  const topNetworks = [...new Set(rows.map((s) => s.network))].slice(0, CATEGORICAL.length);
  const colorFor = (net: string) => {
    const i = topNetworks.indexOf(net);
    return i >= 0 ? CATEGORICAL[i] : "#94a3b8";
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="p-5 pb-3">
        <CardHeader
          title="Public Charging Map"
          subtitle={`${rows.length} public stations across Boulder, coloured by network`}
        />
      </div>
      <div className="relative h-[380px] w-full">
        <MapContainer center={DEFAULT_CENTER} zoom={12} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToPoints points={points} />
          {rows.map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={5}
              pathOptions={{
                color: colorFor(s.network),
                fillColor: colorFor(s.network),
                fillOpacity: 0.75,
                weight: 1.5,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold text-navy-800">{s.name}</div>
                  {s.address && <div className="text-slate-500">{s.address}</div>}
                  <div className="mt-1 text-slate-600">
                    Network: <span className="font-medium">{s.network}</span>
                  </div>
                  <div className="text-slate-600">
                    Ports: <span className="font-medium">{s.l2 + s.dcfc}</span>
                    {s.connectors.length ? ` · ${s.connectors.join(", ")}` : ""}
                  </div>
                  {s.openYear && <div className="text-slate-500">Opened {s.openYear}</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </Card>
  );
}
