"use client";
import React, { useState } from "react";
import type { LucideIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface JoystickButtonProps {
  onPress: (pressed: boolean) => void;
  Icon: LucideIcon;
  disabled?: boolean;
  isToggled?: boolean;
  className?: string;
}

export function JoystickButton({ Icon, onPress, disabled, isToggled, className }: JoystickButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsPressed(true);
    onPress(true);
  };

  const handlePressEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
     if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
    if (isPressed) { // Only call onPress(false) if it was previously pressed
        setIsPressed(false);
        onPress(false);
    }
  };

  return (
    <Button
      variant={isPressed || isToggled ? 'default' : 'secondary'}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onPointerCancel={handlePressEnd}
      disabled={disabled}
      className={cn(
          "w-24 h-24 md:w-28 md:h-28 rounded-full touch-none flex items-center justify-center transition-transform",
          (isPressed) && "scale-95",
          className
      )}
    >
      <Icon className="w-10 h-10 md:w-12 md:h-12 pointer-events-none" />
    </Button>
  );
}
