import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Card, CardHeader } from "./ui/Card";
import { useSites } from "@/lib/queries";
import { useCity } from "@/lib/city-context";
import { cityMeta } from "@/lib/cities";

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
  const { city } = useCity();
  const place = cityMeta(city);
  const { data: sites } = useSites();
  const rows = sites ?? [];
  const points = rows.map((s) => [s.lat, s.lng] as [number, number]);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-5 pb-3">
        <CardHeader
          title="Locations"
          subtitle={`PowerTech network, ${rows.length} real stations in ${place.place}`}
        />
      </div>
      <div className="relative h-[360px] w-full">
        <MapContainer
          key={city}
          center={place.center}
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
                color: "#5fa32f",
                fillColor: "#7ac943",
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
                    Connector:{" "}
                    <span className="font-medium">
                      {site.connectorTypes.join(", ")}
                    </span>
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
