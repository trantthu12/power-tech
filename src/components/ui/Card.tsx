import type { ReactNode } from "react";
import { SimulatedMark } from "./SimulatedMark";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Append a small * marking this card's figures as simulated. */
  simulated?: boolean;
}

export function CardHeader({ title, subtitle, action, simulated }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h3 className="text-sm font-semibold text-navy-800">
          {title}
          {simulated && <SimulatedMark />}
        </h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
