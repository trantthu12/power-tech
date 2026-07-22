import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  id: string;
  name: string;
  zip: string;
}

interface MultiStationSelectProps {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}

/** Compact multi-select popover for choosing which stations to plot (max N). */
export function MultiStationSelect({
  options,
  selected,
  onChange,
  max = 5,
}: MultiStationSelectProps) {
  const [open, setOpen] = useState(false);
  const atMax = selected.length >= max;

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (!atMax) onChange([...selected, id]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 shadow-sm hover:border-slate-300 focus:border-brand-400 focus:outline-none"
      >
        {selected.length}/{max} stations
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-30 mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <div className="px-3 py-1.5 text-[11px] text-slate-400">
              Select up to {max} stations
            </div>
            {options.map((o) => {
              const checked = selected.includes(o.id);
              const disabled = !checked && atMax;
              return (
                <button
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                    disabled ? "cursor-not-allowed opacity-40" : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? "border-brand-500 bg-brand-500" : "border-slate-300"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="flex-1 truncate text-navy-700">{o.name}</span>
                  <span className="shrink-0 text-slate-400">{o.zip}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
