
"use client";

import { useState, useEffect } from 'react';
import type { CraneSettings } from '@/lib/types';

const SETTINGS_KEY = 'craneRemoteSettingsV2';

const defaultSettings: CraneSettings = {
  startUrl: '', // This is not used in the PWA version
  wsUrl: 'ws://192.168.100.10:8080/ws',
};

// This function checks if the code is running in a browser environment
const isBrowser = () => typeof window !== 'undefined';

const getInitialSettings = (): CraneSettings => {
  if (!isBrowser()) {
    return defaultSettings;
  }
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  } catch (error) {
    console.error("Failed to load settings from localStorage", error);
    return defaultSettings;
  }
};


export function useSettings(): [CraneSettings, (settings: CraneSettings) => void] {
  const [settings, setSettings] = useState<CraneSettings>(getInitialSettings);

  useEffect(() => {
    // This effect will sync settings across tabs.
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SETTINGS_KEY && event.newValue) {
        try {
          setSettings(JSON.parse(event.newValue));
        } catch (error) {
          console.error("Failed to parse settings from storage change event", error);
        }
      }
    };
    if (isBrowser()) {
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, []);

  const saveSettings = (newSettings: CraneSettings) => {
    if (isBrowser()) {
      try {
        const settingsString = JSON.stringify(newSettings);
        localStorage.setItem(SETTINGS_KEY, settingsString);
        setSettings(newSettings);
      } catch (error) {
        console.error("Failed to save settings", error);
      }
    }
  };
  
  return [settings, saveSettings];
}
