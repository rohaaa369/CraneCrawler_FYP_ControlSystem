import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertRssiToPercentage(rssi: number): number {
  if (rssi >= -50) {
    return 100;
  }
  if (rssi <= -100) {
    return 0;
  }
  return Math.round(2 * (rssi + 100));
}
