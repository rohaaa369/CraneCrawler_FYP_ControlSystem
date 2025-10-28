
"use client";

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useDebouncedCallback } from 'use-debounce';

export function TestConnection({ wsUrl }: { wsUrl: string }) {
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('DISCONNECTED');
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  // This effect ensures we disconnect when the component is unmounted or the dialog is closed.
  useEffect(() => {
    return () => {
      ws.current?.close();
    };
  }, []);

  const connect = () => {
    // Close any existing connection
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.close();
    }
    
    if (!wsUrl) {
      setStatus('ERROR');
      setLastMessage('WebSocket URL cannot be empty.');
      return;
    }

    setStatus('CONNECTING');
    setLastMessage(`Connecting to ${wsUrl}...`);
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setStatus('CONNECTED');
        setLastMessage('Connection established successfully.');
        ws.current?.send(JSON.stringify({ type: 'ping' }));
      };

      ws.current.onmessage = (event) => {
        setLastMessage(`Received: ${event.data}`);
      };

      ws.current.onclose = (event) => {
        // Only update status if it was not an intentional disconnect
        if (status !== 'DISCONNECTED') {
            setStatus('DISCONNECTED');
            setLastMessage(`Connection closed. Code: ${event.code}`);
        }
      };

      ws.current.onerror = (error) => {
        setStatus('ERROR');
        setLastMessage('Connection error. Check console for details.');
        console.error("WebSocket test error:", error);
      };
    } catch (e: any) {
      setStatus('ERROR');
      setLastMessage(e?.message || 'Invalid WebSocket URL.');
      console.error(e);
    }
  };
  
  const debouncedConnect = useDebouncedCallback(connect, 500);

  // Re-run connection test automatically when URL changes
  useEffect(() => {
    if (wsUrl) {
      debouncedConnect();
    }
     return () => {
      debouncedConnect.cancel();
    }
  }, [wsUrl, debouncedConnect]);


  const disconnect = () => {
     if (ws.current) {
        setStatus('DISCONNECTED');
        setLastMessage('User disconnected.');
        ws.current.close();
        ws.current = null;
    }
  }

  const getBadgeVariant = () => {
    switch (status) {
      case 'CONNECTED': return 'default'; // Green
      case 'ERROR': return 'destructive';
      case 'DISCONNECTED': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="w-full border-dashed">
      <CardHeader className="p-4">
        <CardTitle className="text-base">Connection Test</CardTitle>
         <CardDescription className="text-xs">
            Real-time status of the WebSocket connection.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm">
        <div className="flex justify-between items-center mb-2">
            <p className="text-muted-foreground font-medium">Status:</p>
            <Badge variant={getBadgeVariant()}>{status}</Badge>
        </div>
        <div className="mt-2 text-muted-foreground break-all h-8">
            <p className="font-mono text-xs">{lastMessage ?? 'Enter a URL to begin testing.'}</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
            <Button size="sm" onClick={status === 'CONNECTED' ? disconnect : connect}>
                {status === 'CONNECTED' ? 'Disconnect' : 'Connect'}
            </Button>
             <Button size="sm" variant="outline" onClick={() => ws.current?.send(JSON.stringify({type: 'ping'}))} disabled={status !== 'CONNECTED'}>
                Ping
             </Button>
        </div>
      </CardContent>
    </Card>
  );
}
