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
  helpContent?: ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  badge, 
  badgeColor = "bg-[#2563EB]", 
  actions, 
  icon,
  className,
  withBackground = false,
  helpContent
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col lg:flex-row lg:items-start justify-between gap-6",
      withBackground ? "bg-white p-8 rounded-lg border border-[#E5E7EB] shadow-sm mb-10" : "mb-10",
      className
    )}>
      <div className="space-y-1.5">
        {badge && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", badgeColor)}></span>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.1em]">{badge}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {icon && <div className="p-2.5 bg-[#EFF6FF] rounded-lg text-[#2563EB]">{icon}</div>}
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-[#6B7280] max-w-2xl text-sm font-medium leading-relaxed mt-1">
            {subtitle}
          </p>
        )}
        {helpContent && <div className="mt-3">{helpContent}</div>}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
