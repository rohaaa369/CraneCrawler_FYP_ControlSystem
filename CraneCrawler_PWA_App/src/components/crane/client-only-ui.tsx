// src/components/crane/client-only-ui.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { SettingsDialog } from './settings-dialog';
import { Button } from '../ui/button';
import { Settings, WifiOff } from 'lucide-react';
import { TestConnection } from './test-connection';
import { CraneProvider } from './crane-provider';
import { CraneInterface } from './crane-interface';

export default function ClientOnlyUI() {
  const [settings, setSettings] = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // This state is just for the shell, in a real PWA scenario this component wouldn't be used
  // and the actual crane interface would be the main app.
  // For this project, we wrap the "real" UI in the provider.
  const [showUi, setShowUi] = useState(true);


  // In a real PWA, you might not have this iframe logic, 
  // but we are keeping it to simulate loading from a remote URL
  // as per the earlier SSB-style requirements.
  if (!showUi) {
     return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background text-foreground z-10 p-8">
            <div className="text-center flex flex-col items-center gap-4">
                <WifiOff className="w-16 h-16 text-destructive" />
                <h1 className="text-2xl font-bold">Connection Failed</h1>
                <p className="text-muted-foreground">
                    Could not load the Crane UI.
                </p>
                <p className="text-muted-foreground max-w-md">
                    Please ensure you are connected to the correct crane Wi-Fi network and that the server is running.
                </p>
                <div className="flex gap-4 mt-4">
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                    <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>Settings</Button>
                </div>
                {/* The wsUrl for testing would come from settings */}
                <TestConnection wsUrl={settings.wsUrl} /> 
            </div>
        </div>
      )
  }

  return (
    <CraneProvider>
        <CraneInterface />
        <div className="absolute bottom-4 right-4 z-20">
              <Button size="icon" variant="ghost" className="bg-background/50 backdrop-blur-sm rounded-full h-12 w-12" onClick={() => setIsSettingsOpen(true)}>
                  <Settings />
              </Button>
        </div>
        <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </CraneProvider>
  );
}
