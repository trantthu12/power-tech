/** A small "*" that marks a figure as simulated, with a hover tooltip. */
export function SimulatedMark() {
  return (
    <span className="group/sim relative inline-flex align-super">
      <span className="ml-0.5 cursor-help text-xs font-semibold text-brand-500">
        *
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-44 -translate-x-1/2 rounded-md bg-navy-800 px-2.5 py-1.5 text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/sim:opacity-100"
      >
        Simulated demo data. Station locations &amp; connectors are real
        (Open Charge Map).
      </span>
    </span>
  );
}
