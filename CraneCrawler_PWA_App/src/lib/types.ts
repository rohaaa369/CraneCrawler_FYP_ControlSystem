export type Direction = "fwd" | "rev" | "stop";
export type Speed = 1 | 2 | 3;

export interface TrackState {
  dir: Direction;
  speed: Speed;
  throttle: number; // 0-100
}

export interface CommandPayload {
  mainPower: boolean;
  leftEngine: boolean;
  rightEngine: boolean;
  horn: boolean;
  brake: boolean;
  emergencyStop: boolean;
  left: TrackState;
  right: TrackState;
}
 
export interface Command {
  type: "cmd";
  ts: number;
  seq: number;
  payload: CommandPayload;
}

export interface Telemetry {
  type: "telemetry";
  ts: number;
  wifiRssi: number;
  engineTempC: number;
  gearboxTempC: number;
  leftRpm: number;
  rightRpm: number;
  throttlePositionPct: number;
  inputs: {
    brake: boolean;
    fwd: boolean;
    rev: boolean;
    estopOk: boolean;
  };
  relays: {
    gear1: boolean;
    gear3: boolean;
    horn: boolean;
    startStop: boolean;
  };
  left: TrackState;
  right: TrackState;
}

export interface Ack {
  type: "ack";
  seq: number;
  ok: boolean;
}

export interface ErrorResponse {
  type: "err";
  seq: number;
  code: "ESTOP_ACTIVE" | "INVALID" | "HW_FAULT";
  msg: string;
}

export type CraneSettings = {
  startUrl: string;
  wsUrl: string;
};
