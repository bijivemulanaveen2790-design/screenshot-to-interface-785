import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  loading,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "reported" | "review" | "progress" | "resolved" | "critical";
  loading?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-card">
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          tone === "default" && "bg-primary",
          tone === "reported" && "bg-status-reported",
          tone === "review" && "bg-status-review",
          tone === "progress" && "bg-status-progress",
          tone === "resolved" && "bg-status-resolved",
          tone === "critical" && "bg-sev-critical",
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">
        {loading ? <span className="inline-block h-8 w-10 animate-pulse rounded bg-muted" /> : value}
      </p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-accent p-3">
        <Icon className="size-6 text-accent-foreground" aria-hidden />
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {children ? <div className="mt-1 max-w-md text-sm text-muted-foreground">{children}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
