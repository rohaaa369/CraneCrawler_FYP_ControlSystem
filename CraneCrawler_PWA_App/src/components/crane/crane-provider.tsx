
"use client";

import React, { useReducer, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { CraneContext, reducer, initialState } from './crane-context';
import type { CommandPayload, Telemetry, Ack, ErrorResponse } from '@/lib/types';
import { useDebouncedCallback } from 'use-debounce';
import { convertRssiToPercentage } from '@/lib/utils';

export function CraneProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [settings, setSettings] = useSettings();
  const { toast } = useToast();
  const ws = useRef<WebSocket | null>(null);
  const seqCounter = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Prevent multiple connection attempts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    // Ensure we don't have lingering connections
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    if (!settings.wsUrl) {
      console.log("WebSocket URL is not set. Skipping connection.");
      return;
    }

    console.log(`Attempting to connect to ${settings.wsUrl}...`);
    try {
      const socket = new WebSocket(settings.wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection established.');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          switch (message.type) {
            case 'telemetry':
              const telemetry = message as Telemetry;
              dispatch({ type: 'SET_TELEMETRY', payload: telemetry });
              dispatch({ type: 'SET_RSSI', payload: convertRssiToPercentage(telemetry.wifiRssi) });
              break;
            case 'ack':
              // console.log('ACK received for seq:', (message as Ack).seq);
              break;
            case 'err':
              const error = message as ErrorResponse;
              console.error(`Error from crane: ${error.msg} (code: ${error.code})`);
              toast({
                variant: 'destructive',
                title: `Crane Error: ${error.code}`,
                description: error.msg,
              });
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // The onclose event will handle the reconnect logic.
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed.');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
        dispatch({ type: 'SET_RSSI', payload: 0 });

        if (ws.current) {
            ws.current = null;
        }

        // Schedule a reconnect attempt
        if (!reconnectTimeout.current) {
          reconnectTimeout.current = setTimeout(connect, 3000);
        }
      };
    } catch (e) {
      console.error("Failed to construct WebSocket:", e);
      if (!reconnectTimeout.current) {
        reconnectTimeout.current = setTimeout(connect, 3000);
      }
    }
  }, [settings.wsUrl, toast]);
  
  // This is the key effect. It triggers a new connection attempt whenever the URL changes.
  useEffect(() => {
    connect();
    
    // Cleanup function to close socket and clear timers when the provider unmounts or URL changes
    return () => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
        if (ws.current) {
            ws.current.onclose = null; // Prevent onclose from triggering a reconnect on manual close
            ws.current.close();
            ws.current = null;
        }
    }
  }, [connect]);


  const sendCommandRaw = (payload: CommandPayload, force?: boolean) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      seqCounter.current += 1;
      const command = {
        type: 'cmd',
        ts: Date.now(),
        seq: seqCounter.current,
        payload: payload,
      };
      const message = JSON.stringify(command)
      // console.log("Sending command:", message);
      ws.current.send(message);
    } else {
       // console.warn('Cannot send command, WebSocket is not open.');
    }
  }

  const debouncedSendCommand = useDebouncedCallback((cmdUpdate: Partial<CommandPayload>) => {
    const newCommandState = { ...state.commandState, ...cmdUpdate };
    dispatch({ type: 'SET_COMMAND_STATE', payload: newCommandState });
    sendCommandRaw(newCommandState);
  }, 50, { maxWait: 100 });

  const sendCommand = (cmdUpdate: Partial<CommandPayload>, force?: boolean) => {
    // some commands should not be debounced.
    const isUrgent = cmdUpdate.emergencyStop !== undefined || force;
    
    // update local state immediately
    const newCommandState = { ...state.commandState, ...cmdUpdate };
    dispatch({ type: 'SET_COMMAND_STATE', payload: newCommandState });

    if (isUrgent) {
        debouncedSendCommand.cancel(); // cancel any pending commands
        sendCommandRaw(newCommandState);
    } else {
        debouncedSendCommand(cmdUpdate);
    }
  }
  

  const value = { state, dispatch, settings, setSettings, sendCommand };

  return (
    <CraneContext.Provider value={value}>
      {children}
    </CraneContext.Provider>
  );
}
