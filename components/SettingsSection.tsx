import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="w-full max-w-md">
      <h2 className="mb-2 px-1 text-sm font-semibold text-muted">{title}</h2>
      <div className="rounded-2xl border border-border bg-surface p-4">{children}</div>
    </section>
  );
}
