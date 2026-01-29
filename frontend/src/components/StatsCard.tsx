import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'emerald' | 'rose' | 'amber';
}

export function StatsCard({ label, value, icon: Icon, color }: StatsCardProps) {
  const colorMap = {
    blue: {
      text: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-500"
    },
    emerald: {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: "text-emerald-500"
    },
    rose: {
      text: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-200",
      icon: "text-rose-500"
    },
    amber: {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "text-amber-500"
    }
  };

  const colors = colorMap[color];

  return (
    <Card className={cn("overflow-hidden border-none shadow-lg dark:bg-slate-900/50 backdrop-blur-sm", colors.bg)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <h3 className={cn("text-2xl font-black", colors.text)}>
              {formatCurrency(value)}
            </h3>
          </div>
          <div className={cn("p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm", colors.icon)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
