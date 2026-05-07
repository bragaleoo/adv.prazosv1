import React from 'react';
import { cn } from '../lib/utils';

interface CardResumoProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  colorClass?: string;
  iconColorClass?: string;
}

export function CardResumo({ title, value, icon, description, colorClass = "text-white", iconColorClass = "bg-blue-500/10 text-blue-500" }: CardResumoProps) {
  return (
    <div className="bg-[#0F172A] border border-[#1E293B] p-4 rounded-xl transition-all hover:bg-slate-800/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={cn("p-1.5 rounded-lg", iconColorClass)}>
          {icon}
        </div>
      </div>
      <div className={cn("text-2xl font-bold", colorClass)}>{value}</div>
      {description && (
        <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>
      )}
    </div>
  );
}
