
"use client";

import { useEffect, useRef } from 'react';
import { useCraneContext } from './crane-context';
import { TopBar } from './top-bar';
import { TelemetryStrip } from './telemetry-strip';
import { MiddleControls } from './middle-controls';
import { BottomControls } from './bottom-controls';

export function CraneInterface() {
  const { state } = useCraneContext();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect is for the emergency stop visuals, keeping it separate
    const rootElement = document.documentElement;
    if (state.commandState.emergencyStop) {
      rootElement.classList.add('emergency-stop-active');
    } else {
      rootElement.classList.remove('emergency-stop-active');
    }
  }, [state.commandState.emergencyStop]);


  return (
    <main ref={mainRef} className="flex h-full w-full flex-col p-2 md:p-4 gap-2 bg-background">
      <TopBar />
      <TelemetryStrip />
      <div className="flex-grow flex flex-col gap-2">
        <MiddleControls />
        <div className="h-[280px] flex flex-col">
            <BottomControls />
        </div>
      </div>
    </main>
  );
}
