import { Construction } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface PlaceholderPageProps {
  title: string;
  audience: string;
  sprint: 2 | 3;
  widgets: string[];
}

export function PlaceholderPage({
  title,
  audience,
  sprint,
  widgets,
}: PlaceholderPageProps) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Construction className="h-5 w-5 text-slate-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-navy-800">{title}</h2>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                sprint === 3
                  ? "bg-amber-100 text-amber-700"
                  : "bg-brand-100 text-brand-700"
              }`}
            >
              Sprint {sprint}
            </span>
          </div>
          <p className="text-xs text-slate-400">{audience}</p>
          <p className="mt-3 text-sm text-slate-500">
            {sprint === 3
              ? "Depends on synthetic datasets planned for Sprint 3. Layout is stubbed; widgets below are scoped."
              : "Planned widgets for this page:"}
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {widgets.map((w) => (
              <li
                key={w}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
