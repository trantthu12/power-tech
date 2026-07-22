import { Clock } from "lucide-react";
import { Card, CardHeader } from "./Card";

interface WipCardProps {
  title: string;
  subtitle?: string;
  /** Bullet list of what this widget will show in Sprint 3. */
  planned: string[];
}

/**
 * Placeholder for a widget whose data source arrives in Sprint 3 (e.g. uptime,
 * fault records). Shows a clear "Sprint 3" badge and what will appear — so it
 * reads as intentional work-in-progress, never a fabricated number.
 */
export function WipCard({ title, subtitle, planned }: WipCardProps) {
  return (
    <Card className="relative">
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Clock className="h-3 w-3" />
            Sprint 3
          </span>
        }
      />
      <ul className="space-y-2.5">
        {planned.map((p) => (
          <li key={p} className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
            <span className="text-sm text-slate-400">{p}</span>
            <span className="ml-auto h-2 w-16 rounded-full bg-slate-100" />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs italic text-slate-400">
        Awaiting Sprint&nbsp;3 data (fault / maintenance / uptime) — layout is in
        place and will populate once the source is available.
      </p>
    </Card>
  );
}
