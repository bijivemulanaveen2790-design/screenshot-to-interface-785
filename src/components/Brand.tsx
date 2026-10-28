import { Construction } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <Construction className="size-4.5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className={cn("block font-display text-sm font-extrabold tracking-tight", inverted && "text-sidebar-accent-foreground")}>
          RoadWatch
        </span>
        <span className={cn("block text-[10px] font-medium uppercase tracking-[0.14em]", inverted ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
          Road Damage Desk
        </span>
      </span>
    </span>
  );
}
