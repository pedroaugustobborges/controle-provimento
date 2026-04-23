import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  withBackground?: boolean;
  darkMode?: boolean;
  helpContent?: ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  badge, 
  badgeColor = "bg-emerald-500", 
  actions, 
  icon,
  className,
  withBackground = false,
  darkMode = false,
  helpContent
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col lg:flex-row lg:items-start justify-between gap-6",
      withBackground && !darkMode && "bg-white p-8 rounded-2xl border border-border/40 shadow-sm mb-8",
      withBackground && darkMode && "bg-primary p-8 rounded-2xl shadow-lg mb-8",
      !withBackground && "mb-8",
      className
    )}>
      <div className="space-y-1">
        {badge && (
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", darkMode ? "bg-white/60" : badgeColor)}></span>
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", darkMode ? "text-white/60" : "text-muted-foreground/80")}>{badge}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {icon && <div className={cn("p-2 rounded-xl", darkMode ? "bg-white/10 text-white" : "bg-primary/10 text-primary")}>{icon}</div>}
          <h1 className={cn("text-3xl font-black tracking-tighter sm:text-4xl", darkMode ? "text-white" : "text-foreground")}>
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className={cn("max-w-2xl text-sm font-medium leading-relaxed mt-1", darkMode ? "text-white/70" : "text-muted-foreground")}>
            {subtitle}
          </p>
        )}
        {helpContent && <div className="mt-2">{helpContent}</div>}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
