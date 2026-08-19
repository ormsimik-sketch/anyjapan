import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, sublabel, icon }: StatCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        {icon}
      </div>
      <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>
      {sublabel && <span className="text-xs text-muted">{sublabel}</span>}
    </div>
  );
}
