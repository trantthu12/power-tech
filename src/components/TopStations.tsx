import { Card, CardHeader } from "./ui/Card";
import { useTopStationsByArea } from "@/lib/queries";
import { formatNumber } from "@/lib/format";
import { CATEGORICAL as COLORS } from "@/lib/colors";

/** Top 3 stations by energy within each ZIP "area". */
export function TopStations() {
  const { data } = useTopStationsByArea(3);
  const areas = data ?? [];
  const max =
    areas.reduce((m, a) => Math.max(m, ...a.stations.map((s) => s.energyKwh)), 0) || 1;

  return (
    <Card>
      <CardHeader
        title="Top Stations by Area"
        subtitle="Top 3 stations per ZIP area — by energy delivered"
      />
      <div className="space-y-5">
        {areas.map((area, ai) => (
          <div key={area.zip}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[ai % COLORS.length] }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-navy-700">
                {area.zip}
              </span>
            </div>
            <ul className="space-y-2.5 pl-4">
              {area.stations.map((s) => (
                <li key={s.name}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-slate-600" title={s.name}>
                      {s.name}
                    </span>
                    <span className="shrink-0 font-medium text-navy-800">
                      {formatNumber(s.energyKwh)} kWh
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(s.energyKwh / max) * 100}%`,
                        backgroundColor: COLORS[ai % COLORS.length],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
