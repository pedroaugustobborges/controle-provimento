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
}

export function PageHeader({ 
  title, 
  subtitle, 
  badge, 
  badgeColor = "bg-emerald-500", 
  actions, 
  icon,
  className,
  withBackground = false
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col lg:flex-row lg:items-center justify-between gap-6",
      withBackground ? "bg-white p-8 rounded-2xl border border-slate-100 shadow-sm mb-8" : "mb-8",
      className
    )}>
      <div className="space-y-1">
        {badge && (
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", badgeColor)}></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{badge}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {icon && <div className="p-2 bg-primary/10 rounded-xl text-primary">{icon}</div>}
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 sm:text-4xl">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-slate-500 max-w-2xl text-sm font-medium leading-relaxed mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
