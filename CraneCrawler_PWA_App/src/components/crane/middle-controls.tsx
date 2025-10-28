
"use client";

import { Volume2, Hand } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useCraneContext } from './crane-context';
import { SpeedControl } from './ui/speed-control';
import { HorizontalSlider } from './ui/horizontal-slider';
import type { Speed, TrackState } from '@/lib/types';
import { useDebouncedCallback } from 'use-debounce';
import { useState, useEffect } from 'react';
import { JoystickButton } from './ui/joystick-button';
import { Separator } from '../ui/separator';

function TrackControls({
  side,
  trackState,
  onSpeedChange,
  onThrottleChange,
  disabled,
}: {
  side: 'left' | 'right';
  trackState: TrackState;
  onSpeedChange: (speed: Speed) => void;
  onThrottleChange: (throttle: number) => void;
  disabled: boolean;
}) {
  const debouncedThrottleCommand = useDebouncedCallback(onThrottleChange, 100);
  
  const [localThrottle, setLocalThrottle] = useState(trackState.throttle);

  useEffect(() => {
    // Sync local state if external state changes (e.g. on reset)
    setLocalThrottle(trackState.throttle);
  }, [trackState.throttle]);


  const handleSliderChange = (value: number[]) => {
    const newThrottle = value[0];
    setLocalThrottle(newThrottle);
    debouncedThrottleCommand(newThrottle);
  };

  return (
    <div className="flex flex-col items-center justify-between h-full pt-2 pb-4">
      <SpeedControl
        side={side}
        value={trackState.speed}
        onValueChange={onSpeedChange}
        disabled={disabled}
      />
      <div className="w-full px-4">
        <HorizontalSlider
          value={[localThrottle]}
          onValueChange={handleSliderChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function MiddleControls() {
  const { state, sendCommand } = useCraneContext();
  const { left: leftTrack, right: rightTrack, horn, brake, emergencyStop, mainPower, leftEngine, rightEngine } = state.commandState;
  const isGloballyDisabled = emergencyStop || !mainPower;

  const handleCommand = (side: 'left' | 'right', newVals: Partial<TrackState>) => {
    const currentTrackState = side === 'left' ? state.commandState.left : state.commandState.right;
    sendCommand({ [side]: { ...currentTrackState, ...newVals } });
  };
  
  const handleHorn = (isPressed: boolean) => {
    sendCommand({ horn: isPressed });
  };
  
  const handleBrake = (isPressed: boolean) => {
    sendCommand({ brake: isPressed });
  };

  return (
    <Card className="p-0 shadow-lg h-full pb-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start justify-between h-full gap-2">
        <TrackControls
          side="left"
          trackState={leftTrack}
          onSpeedChange={(speed) => handleCommand('left', { speed })}
          onThrottleChange={(throttle) => handleCommand('left', { throttle })}
          disabled={isGloballyDisabled || !leftEngine}
        />

        <div className="flex flex-col items-center justify-center gap-4 px-4 pt-4 h-full">
           <JoystickButton
            Icon={Volume2}
            onPress={(pressed) => handleHorn(pressed)}
            disabled={isGloballyDisabled}
            isToggled={horn}
          />
           <JoystickButton
            Icon={Hand}
            onPress={(pressed) => handleBrake(pressed)}
            disabled={isGloballyDisabled}
            isToggled={brake}
          />
        </div>

        <TrackControls
          side="right"
          trackState={rightTrack}
          onSpeedChange={(speed) => handleCommand('right', { speed })}
          onThrottleChange={(throttle) => handleCommand('right', { throttle })}
          disabled={isGloballyDisabled || !rightEngine}
        />
      </div>
    </Card>
  );
}
