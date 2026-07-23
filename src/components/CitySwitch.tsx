import { useCity } from "@/lib/city-context";
import { CITIES } from "@/lib/cities";

/** Segmented toggle to switch the whole dashboard between cities. */
export function CitySwitch() {
  const { city, setCity } = useCity();
  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {CITIES.map((c) => (
        <button
          key={c.id}
          onClick={() => setCity(c.id)}
          className={[
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
            city === c.id
              ? "bg-white text-navy-800 shadow-sm"
              : "text-slate-500 hover:text-navy-700",
          ].join(" ")}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
