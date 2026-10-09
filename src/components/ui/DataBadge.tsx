/** Small provenance tag for a card header: "synthetic", "model", "forecast", … */
export function DataBadge({ label = "synthetic" }: { label?: string }) {
  return (
    <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
      {label}
    </span>
  );
}
