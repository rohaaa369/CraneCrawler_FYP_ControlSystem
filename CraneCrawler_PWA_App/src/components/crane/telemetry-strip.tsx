
"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCraneContext } from './crane-context';

function TelemetryItem({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-0 text-center">
      <div className="text-xs md:text-sm text-muted-foreground uppercase font-medium tracking-wider">{label}</div>
      <div className="text-2xl md:text-4xl font-bold neon-green-text">{value}</div>
      <div className="text-xs md:text-sm text-muted-foreground">{unit}</div>
    </div>
  );
}

function StatusText({ label, value }: { label: string, value: string }) {
    return <span className="text-sm md:text-base font-semibold tracking-widest">{label}: <span className="neon-green-text">{value}</span></span>
}

export function TelemetryStrip() {
  const { state } = useCraneContext();
  const { commandState, telemetry } = state;
  const { leftEngine, rightEngine } = commandState;
  const { engineTempC, gearboxTempC, leftRpm, rightRpm, throttlePositionPct, left, right } = telemetry;

  return (
    <Card className="w-full shrink-0 shadow-lg">
      <CardContent className="p-1 md:p-2">
        <div className="flex justify-between items-center text-muted-foreground uppercase px-1 md:px-2">
            <div className="flex flex-wrap gap-2 md:gap-4">
                <StatusText label="PWR" value={commandState.mainPower ? "ON" : "OFF"} />
                <StatusText label="L-ENG" value={leftEngine ? "ON" : "OFF"} />
                <StatusText label="R-ENG" value={rightEngine ? "ON" : "OFF"} />
                <StatusText label="BRAKE" value={commandState.brake ? "ON" : "OFF"} />
            </div>
            <div className="flex items-center gap-1 md:gap-2">
                <span className="text-sm md:text-base font-semibold tracking-widest text-center">THROTTLE</span>
                <span className="text-lg md:text-2xl font-bold neon-green-text">{throttlePositionPct.toFixed(0)}%</span>
            </div>
        </div>
        
        <Separator className="my-1" />

        <div className="grid grid-cols-4 gap-1 md:gap-2 items-center">
          <TelemetryItem label="LEFT TACHOMETER" value={leftRpm.toFixed(0)} unit="RPM" />
          <TelemetryItem label="ENG WATER TEMP" value={engineTempC.toFixed(1)} unit="°C" />
          <TelemetryItem label="GEARBOX OIL TEMP" value={gearboxTempC.toFixed(1)} unit="°C" />
          <TelemetryItem label="RIGHT TACHOMETER" value={rightRpm.toFixed(0)} unit="RPM" />
        </div>
        
        <Separator className="my-1" />
        
        <div className="flex justify-between items-center text-muted-foreground uppercase px-1 md:px-2">
            <div className="flex flex-wrap gap-2 md:gap-4">
                <StatusText label="L-SPD" value={String(left.speed)} />
                <StatusText label="L-DIR" value={left.dir.toUpperCase()} />
            </div>
             <div className="flex flex-wrap gap-2 md:gap-4">
                <StatusText label="R-SPD" value={String(right.speed)} />
                <StatusText label="R-DIR" value={right.dir.toUpperCase()} />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
