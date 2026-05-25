'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRealtimeStore } from '@/store';
import { WSMessage } from '@/types';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { setOnlineCount, setNewMessage } = useRealtimeStore();
  const reconnectTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);

          switch (data.type) {
            case 'visitor:count':
              setOnlineCount((data.payload as { count: number }).count);
              break;
            case 'message:new':
              setNewMessage(true);
              break;
            case 'data:update':
              window.dispatchEvent(new CustomEvent('data:update', { detail: data.payload }));
              break;
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected, reconnecting...');
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WS connection error:', e);
      reconnectTimeout.current = setTimeout(connect, 3000);
    }
  }, [setOnlineCount, setNewMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return wsRef;
}
