
"use client";

import { Power, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCraneContext } from './crane-context';
import { SquareToggle } from './ui/square-toggle';
import type { TrackState } from '@/lib/types';
import { JoystickButton } from './ui/joystick-button';
import { cn } from '@/lib/utils';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


function LeftJoystickControls({ left, sendCommand, disabled, engineOn }: { left: TrackState, sendCommand: (cmd: Partial<TrackState>) => void, disabled: boolean, engineOn: boolean }) {
  const isControlDisabled = disabled || !engineOn;

  return (
    <div className="flex flex-col items-center justify-around h-full">
      <JoystickButton
        Icon={ArrowUp}
        onPress={(pressed) => sendCommand({ dir: pressed ? 'fwd' : 'stop' })}
        disabled={isControlDisabled}
      />
      <span className={cn(
          "text-lg md:text-xl font-bold uppercase tracking-widest text-muted-foreground h-6 md:h-8 transition-opacity flex items-center",
          left.dir === 'stop' ? 'opacity-100' : 'opacity-0'
          )}>
          STOP
      </span>
      <JoystickButton
        Icon={ArrowDown}
        onPress={(pressed) => sendCommand({ dir: pressed ? 'rev' : 'stop' })}
        disabled={isControlDisabled}
      />
    </div>
  );
}

function RightJoystickControls({ right, sendCommand, disabled, engineOn }: { right: TrackState, sendCommand: (cmd: Partial<TrackState>) => void, disabled: boolean, engineOn: boolean }) {
  const isControlDisabled = disabled || !engineOn;
  
  return (
    <div className="flex flex-col items-center justify-around h-full">
      <JoystickButton
        Icon={ArrowUp}
        onPress={(pressed) => sendCommand({ dir: pressed ? 'fwd' : 'stop' })}
        disabled={isControlDisabled}
      />
       <span className={cn(
          "text-lg md:text-xl font-bold uppercase tracking-widest text-muted-foreground h-6 md:h-8 transition-opacity flex items-center",
          right.dir === 'stop' ? 'opacity-100' : 'opacity-0'
          )}>
          STOP
      </span>
      <JoystickButton
        Icon={ArrowDown}
        onPress={(pressed) => sendCommand({ dir: pressed ? 'rev' : 'stop' })}
        disabled={isControlDisabled}
      />
    </div>
  );
}


export function BottomControls() {
  const { state, sendCommand, dispatch } = useCraneContext();
  const { leftEngine, rightEngine, left, right, emergencyStop, mainPower } = state.commandState;
  const isGloballyDisabled = emergencyStop || !mainPower;

  const handleCommand = (side: 'left' | 'right', newVals: Partial<TrackState>) => {
    const currentTrackState = side === 'left' ? state.commandState.left : state.commandState.right;
    sendCommand({ [side]: { ...currentTrackState, ...newVals } });
  };
  
  const handleEstop = () => {
    sendCommand({ emergencyStop: true });
  };

  const handleResetEstop = () => {
    dispatch({type: "RESET_STATE" })
    sendCommand({ emergencyStop: false, mainPower: false, leftEngine: false, rightEngine: false, left: { dir: 'stop', speed: 1, throttle: 0 }, right: { dir: 'stop', speed: 1, throttle: 0 } }, true);
  };

  return (
    <Card className="p-2 shadow-lg h-full">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center justify-between h-full gap-2">
        <div className="flex items-center justify-around h-full">
          <LeftJoystickControls
            left={left}
            sendCommand={(newVals) => handleCommand('left', newVals)}
            disabled={isGloballyDisabled}
            engineOn={leftEngine}
          />
          <SquareToggle
            label="ENGINE"
            Icon={Power}
            isToggled={leftEngine}
            onToggle={(isOn) => sendCommand({ leftEngine: isOn })}
            disabled={isGloballyDisabled}
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-2 px-4">
           <Button
            variant="destructive"
            className="w-24 h-24 text-base rounded-full flex-col gap-1 text-xs"
            onClick={handleEstop}
            disabled={emergencyStop}
           >
            <AlertTriangle className="w-12 h-12" />
            E-STOP
          </Button>
        </div>
        <div className="flex items-center justify-around h-full">
          <SquareToggle
            label="ENGINE"
            Icon={Power}
            isToggled={rightEngine}
            onToggle={(isOn) => sendCommand({ rightEngine: isOn })}
            disabled={isGloballyDisabled}
            className="-ml-4"
          />
          <RightJoystickControls
            right={right}
            sendCommand={(newVals) => handleCommand('right', newVals)}
            disabled={isGloballyDisabled}
            engineOn={rightEngine}
          />
        </div>
      </div>
       <AlertDialog open={emergencyStop}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Emergency Stop Activated</AlertDialogTitle>
              <AlertDialogDescription>
                All systems have been halted. Acknowledge and reset to continue operation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleResetEstop}>Reset E-Stop</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
}
