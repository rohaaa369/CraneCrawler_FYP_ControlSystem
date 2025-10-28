
"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { Speed } from "@/lib/types";

interface SpeedControlProps {
  side: 'left' | 'right';
  value: Speed;
  onValueChange: (value: Speed) => void;
  disabled?: boolean;
}

export function SpeedControl({ side, value, onValueChange, disabled }: SpeedControlProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <RadioGroup
        value={String(value)}
        onValueChange={(val) => onValueChange(Number(val) as Speed)}
        className="grid grid-cols-3 gap-1 rounded-md bg-secondary p-1"
        disabled={disabled}
      >
        {[1, 2, 3].map((speed) => (
          <div key={speed}>
            <RadioGroupItem value={String(speed)} id={`${side}-speed-${speed}`} className="sr-only" />
            <Label
              htmlFor={`${side}-speed-${speed}`}
              className={cn(
                "flex items-center justify-center rounded-md px-2 py-1 text-lg md:px-3 md:py-2 md:text-2xl font-bold cursor-pointer transition-colors",
                value === speed
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-muted",
                 disabled ? "cursor-not-allowed opacity-50" : ""
              )}
            >
              {speed}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <span className="text-sm md:text-base font-semibold uppercase tracking-wider text-muted-foreground">SPEED: {value}</span>
    </div>
  );
}
