import { WipCard } from "@/components/ui/WipCard";

const NOTE =
  "Awaiting the Sprint 3 site-scoring & optimization model (MCDA). Layout is in place and will populate once the model is available.";

/**
 * Sprint 3 page. The widgets depend on the Python Site-Scoring & Optimization
 * engine (MCDA), so they are shown as clearly-labelled placeholders — title plus
 * a data placeholder, no fabricated numbers.
 */
export function InfrastructurePlanning() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <WipCard
        title="MCDA Ranking"
        subtitle="Weighted multi-criteria site scores"
        planned={["Weighted site scores", "Criteria contribution breakdown"]}
        note={NOTE}
      />
      <WipCard
        title="Priority Score Table"
        subtitle="Candidate sites ranked by priority"
        planned={["Ranked candidate sites", "Priority score per site"]}
        note={NOTE}
      />
      <WipCard
        title="Coverage Gap Analysis"
        subtitle="Under-served areas across the network"
        planned={["Under-served areas", "Coverage gap map"]}
        note={NOTE}
      />
      <WipCard
        title="Short-Term Demand Forecast"
        subtitle="Projected demand for planning"
        planned={["Projected demand per area", "Growth trend"]}
        note={NOTE}
      />
      <WipCard
        title="Expansion Recommendations"
        subtitle="Where to build next"
        planned={["Recommended new sites", "Expected impact"]}
        note={NOTE}
      />
    </div>
  );
}
