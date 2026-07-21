import { Card, CardHeader } from "./ui/Card";
import { useCityBreakdown } from "@/lib/queries";
import { CATEGORICAL as DOT_COLORS } from "@/lib/colors";

export function CityBreakdown() {
  const { data } = useCityBreakdown();
  const rows = data ?? [];
  const total = rows.reduce((sum, r) => sum + r.siteCount, 0);

  return (
    <Card>
      <CardHeader title="Locations by City" subtitle={`${total} total`} />
      <ul className="space-y-2 text-sm">
        {rows.map((r, i) => (
          <li key={r.city} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }}
            />
            <span className="flex-1 text-slate-600">{r.city}</span>
            <span className="font-medium text-navy-800">{r.siteCount}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
