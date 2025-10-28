
"use client"

import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface VerticalSliderProps {
    value?: number[]
    onValueChange?: (value: number[]) => void
    disabled?: boolean
}

export function VerticalSlider({ value, onValueChange, disabled }: VerticalSliderProps) {
  return (
    <div className="h-4/5 flex flex-col items-center gap-4">
        <div className="h-full relative">
            <Slider
              orientation="vertical"
              defaultValue={[0]}
              max={100}
              step={1}
              value={value}
              onValueChange={onValueChange}
              disabled={disabled}
              className="w-4 data-[orientation=vertical]:w-4"
            />
        </div>
        <div className="text-center">
            <div className="text-xl font-bold neon-green-text">{value?.[0] ?? 0}%</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">THROTTLE</div>
        </div>
    </div>
  )
}
