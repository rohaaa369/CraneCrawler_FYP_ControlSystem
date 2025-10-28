
"use client"

import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface HorizontalSliderProps {
    value?: number[]
    onValueChange?: (value: number[]) => void
    disabled?: boolean
}

export function HorizontalSlider({ value, onValueChange, disabled }: HorizontalSliderProps) {
  return (
    <div className="w-full flex flex-col items-center gap-0 py-0">
        <Slider
          defaultValue={[0]}
          max={100}
          step={1}
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          className="w-full h-1"
        />
        <div className="text-center">
            <div className="text-base md:text-lg font-bold neon-green-text">{value?.[0] ?? 0}%</div>
            <div className="text-xs md:text-sm font-semibold uppercase tracking-wider text-muted-foreground">THROTTLE</div>
        </div>
    </div>
  )
}
