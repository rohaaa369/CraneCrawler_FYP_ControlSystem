"use client";
import { createContext, useContext, Dispatch, ReactNode } from 'react';
import type { CommandPayload, Telemetry, CraneSettings, TrackState } from '@/lib/types';

export type Action =
  | { type: 'SET_COMMAND_STATE'; payload: Partial<CommandPayload> }
  | { type: 'SET_TELEMETRY'; payload: Partial<Telemetry> }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_RSSI'; payload: number }
  | { type: 'RESET_STATE' };

export type State = {
  commandState: CommandPayload;
  telemetry: Telemetry;
  connected: boolean;
  rssi: number;
};

export const initialState: State = {
  commandState: {
    mainPower: false,
    leftEngine: false,
    rightEngine: false,
    horn: false,
    brake: false,
    emergencyStop: false,
    left: { dir: 'stop', speed: 1, throttle: 0 },
    right: { dir: 'stop', speed: 1, throttle: 0 },
  },
  telemetry: {
    type: 'telemetry',
    ts: 0,
    wifiRssi: -100,
    engineTempC: 0,
    gearboxTempC: 0,
    leftRpm: 0,
    rightRpm: 0,
    throttlePositionPct: 0,
    inputs: { brake: false, fwd: false, rev: false, estopOk: true },
    relays: { gear1: false, gear3: false, horn: false, startStop: false },
    left: { dir: 'stop', speed: 1, throttle: 0 },
    right: { dir: 'stop', speed: 1, throttle: 0 },
  },
  connected: false,
  rssi: 0,
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_COMMAND_STATE':
      return {
        ...state,
        commandState: { ...state.commandState, ...action.payload },
      };
    case 'SET_TELEMETRY':
      return { ...state, telemetry: { ...state.telemetry, ...action.payload } };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connected: action.payload };
    case 'SET_RSSI':
      return { ...state, rssi: action.payload };
    case 'RESET_STATE':
        const estop = state.commandState.emergencyStop;
        return { ...initialState, commandState: { ...initialState.commandState, emergencyStop: estop }};
    default:
      return state;
  }
};

type CraneContextType = {
  state: State;
  dispatch: Dispatch<Action>;
  settings: CraneSettings;
  setSettings: (settings: CraneSettings) => void;
  sendCommand: (cmd: Partial<CommandPayload>, force?: boolean) => void;
};

export const CraneContext = createContext<CraneContextType | undefined>(undefined);

export const useCraneContext = () => {
  const context = useContext(CraneContext);
  if (!context) {
    throw new Error('useCraneContext must be used within a CraneProvider');
  }
  return context;
};
