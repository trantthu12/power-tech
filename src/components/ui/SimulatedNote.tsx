/** Footnote clarifying which data is simulated vs real. */
export function SimulatedNote() {
  return (
    <p className="px-1 text-xs text-slate-400">
      <span className="font-semibold text-brand-500">*</span> Simulated demo data
      (energy, revenue, sessions, faults, online status). Station locations,
      names, connectors &amp; cities are real — from Open Charge Map.
    </p>
  );
}
