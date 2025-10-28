"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SquareToggleProps {
  label: string;
  isToggled: boolean;
  onToggle: (isToggled: boolean) => void;
  disabled?: boolean;
  Icon?: LucideIcon;
  size?: 'sm' | 'default';
  className?: string;
}

export function SquareToggle({ label, isToggled, onToggle, disabled, Icon, size = 'default', className }: SquareToggleProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", size === 'sm' && "gap-0.5", className)}>
      <Button
        variant={isToggled ? "default" : "outline"}
        className={cn(
            "flex flex-col gap-1 transition-all duration-200",
             isToggled && "shadow-lg shadow-primary/50",
             size === 'default' && 'w-[88px] h-[88px] md:w-[92px] md:h-[92px] text-base md:text-lg',
             size === 'sm' && 'w-12 h-12 text-sm'
        )}
        onClick={() => onToggle(!isToggled)}
        disabled={disabled}
      >
        {Icon && <Icon className={cn(size === 'default' ? 'w-8 h-8 md:w-10 md:h-10' : 'w-4 h-4')} />}
        <span className="font-bold">{isToggled ? 'ON' : 'OFF'}</span>
      </Button>
      <span className={cn(
        "font-semibold uppercase tracking-wider text-muted-foreground text-center",
        size === 'default' ? 'text-xs md:text-sm' : 'text-[10px]'
        )}>{label}</span>
    </div>
  );
}
