import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { LoadOptimization } from "@/types";
import { formatNumber } from "@/lib/format";

function hh(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function LoadOptimizationPanel({ data }: { data: LoadOptimization }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
        Shifting up to{" "}
        <span className="font-semibold">{formatNumber(data.shiftableKwh)} kWh</span>{" "}
        from peak hours into off-peak windows would cut the daily peak (
        {formatNumber(data.peakKwh)} kWh at {hh(data.peakHours[0]?.hour ?? 0)}).
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Peak hours */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Peak hours — cap / shift
          </div>
          <ul className="space-y-1.5">
            {data.peakHours.map((h) => (
              <li
                key={h.hour}
                className="flex items-center justify-between rounded-md bg-rose-50 px-3 py-1.5 text-sm"
              >
                <span className="font-medium text-navy-800">{hh(h.hour)}</span>
                <span className="text-rose-600">{formatNumber(h.kwh)} kWh</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Off-peak windows */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Off-peak — shift into
          </div>
          <ul className="space-y-1.5">
            {data.offPeakHours.map((h) => (
              <li
                key={h.hour}
                className="flex items-center justify-between rounded-md bg-brand-50 px-3 py-1.5 text-sm"
              >
                <span className="font-medium text-navy-800">{hh(h.hour)}</span>
                <span className="text-brand-600">{formatNumber(h.kwh)} kWh</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
