import type { Granularity } from "@/types";

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

interface GranularityToggleProps {
  value: Granularity;
  onChange: (g: Granularity) => void;
}

export function GranularityToggle({ value, onChange }: GranularityToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-white text-navy-800 shadow-sm"
              : "text-slate-500 hover:text-navy-700",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
