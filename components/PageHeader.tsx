import { Droplet, Settings } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  showSettingsLink?: boolean;
}

export function PageHeader({ title, showSettingsLink = false }: PageHeaderProps) {
  return (
    <header className="flex w-full max-w-md items-center justify-between pb-2">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600">
          <Droplet className="h-4 w-4 text-white" aria-hidden="true" fill="white" />
        </span>
        <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      {showSettingsLink && (
        <Link
          href="/settings"
          aria-label="Open settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}
