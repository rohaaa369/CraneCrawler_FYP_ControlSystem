
"use client";

import { Power, Wifi, WifiOff, Settings } from 'lucide-react';
import { useCraneContext } from './crane-context';
import { Button } from '@/components/ui/button';
import { SquareToggle } from './ui/square-toggle';
import { SettingsDialog } from './settings-dialog';
import { useState } from 'react';

function LampsonLogo() {
    return (
      <div className="flex justify-center items-center h-full">
          <span className="text-xl md:text-2xl font-black tracking-widest text-muted-foreground">
              LAMPSON
          </span>
      </div>
    );
  }

function WifiStatus() {
  const { connected, rssi } = useCraneContext().state;

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      {connected ? (
        <>
          <Wifi className="h-4 w-4 neon-green-text" />
          <span className="hidden sm:inline neon-green-text">{rssi}%</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-muted-foreground" />
          <span className="hidden sm:inline text-muted-foreground">--%</span>
        </>
      )}
    </div>
  );
}

export function TopBar() {
  const { state, sendCommand } = useCraneContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { mainPower, emergencyStop } = state.commandState;

  const handlePowerToggle = (isOn: boolean) => {
    sendCommand({ mainPower: isOn, leftEngine: false, rightEngine: false });
  };

  return (
    <div className="flex items-center justify-between w-full shrink-0">
      <SquareToggle
        label="MAIN POWER"
        Icon={Power}
        isToggled={mainPower}
        onToggle={handlePowerToggle}
        disabled={emergencyStop}
        size="sm"
      />
      <div className="flex-grow px-1">
        <LampsonLogo />
      </div>
      <div className="flex items-center gap-1">
        <WifiStatus />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
