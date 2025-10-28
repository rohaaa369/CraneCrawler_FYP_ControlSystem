
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/use-settings';
import { useEffect, useState } from 'react';
import type { CraneSettings } from '@/lib/types';
import { TestConnection } from './test-connection';
import { Separator } from '../ui/separator';

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) {
  const [settings, setSettings] = useSettings();
  const [localSettings, setLocalSettings] = useState<CraneSettings>(settings);

  useEffect(() => {
    // When the dialog opens, sync local state with the latest global settings
    if (open) {
      setLocalSettings(settings);
    }
  }, [settings, open]);

  const handleSave = () => {
    setSettings(localSettings);
    onOpenChange(false);
  };
  
  const handleCancel = () => {
    onOpenChange(false);
    // On cancel, revert local state to match global settings
    setLocalSettings(settings);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure connection settings for the crane remote.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wsUrl" className="text-right">
              WebSocket URL
            </Label>
            <Input
              id="wsUrl"
              value={localSettings.wsUrl}
              onChange={(e) => setLocalSettings(s => ({ ...s, wsUrl: e.target.value }))}
              className="col-span-3"
              autoComplete="off"
            />
          </div>

          <Separator className="my-2" />

          {/* Integrated connection tester */}
          <TestConnection wsUrl={localSettings.wsUrl} />
          
        </div>
        <DialogFooter>
           <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
