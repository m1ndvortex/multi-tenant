/**
 * WebSocket Hook for Real-Time Online Users Monitoring
 * Handles WebSocket connection with automatic pause/resume based on tab visibility
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  OnlineUser, 
  OnlineUsersStats, 
  OnlineUsersWebSocketMessage,
  UseOnlineUsersWebSocketOptions,
  UseOnlineUsersWebSocketReturn
} from '../types/onlineUsers';
import { onlineUsersService } from '../services/onlineUsersService';

export const useOnlineUsersWebSocket = (
  options: UseOnlineUsersWebSocketOptions = {}
): UseOnlineUsersWebSocketReturn => {
  const {
    enabled = true,
    autoReconnect = true,
    reconnectInterval = 5000,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<OnlineUsersStats | null>(null);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTabActiveRef = useRef(true);
  const shouldConnectRef = useRef(enabled);
  // Store callbacks in refs to prevent changing dependencies causing reconnect loops
  const onConnectRef = useRef<typeof onConnect>(onConnect);
  const onDisconnectRef = useRef<typeof onDisconnect>(onDisconnect);
  const onErrorRef = useRef<typeof onError>(onError);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);
  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Handle tab visibility changes to pause/resume updates (avoid disconnect churn)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isActive = !document.hidden;
      isTabActiveRef.current = isActive;
      
      // Don't aggressively disconnect on tab hide; just resume if needed when active again
      if (isActive && shouldConnectRef.current && !wsRef.current) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const sendMessage = useCallback((message: Partial<OnlineUsersWebSocketMessage>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const fullMessage: OnlineUsersWebSocketMessage = {
        type: message.type || 'ping',
        data: message.data || {},
        timestamp: new Date().toISOString(),
        ...message
      };
      
      wsRef.current.send(JSON.stringify(fullMessage));
    }
  }, []);

  const setupPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    pingIntervalRef.current = setInterval(() => {
      if (isTabActiveRef.current) {
        sendMessage({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds when tab is active
  }, [sendMessage]);

  const connect = useCallback(() => {
    if (!shouldConnectRef.current || !isTabActiveRef.current) {
      return;
    }

    try {
      // If a connection already exists and is open or connecting, do not create a new one
      if (wsRef.current &&
          (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      // Close any lingering connection before creating a new one
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* noop */ }
      }

      // Create new WebSocket connection
      wsRef.current = onlineUsersService.createWebSocketConnection();

      wsRef.current.onopen = () => {
        console.log('Online Users WebSocket connected');
        setIsConnected(true);
        setupPingInterval();
        onConnectRef.current?.();
        
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event: MessageEvent<string>) => {
        try {
          const message: OnlineUsersWebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'initial_stats':
            case 'stats_update':
              setStats(message.data as OnlineUsersStats);
              break;
              
            case 'users_update':
              if (message.data.users) {
                setUsers(message.data.users as OnlineUser[]);
              }
              break;
              
            case 'user_online':
              setUsers((prev: OnlineUser[]) => {
                const existingIndex = prev.findIndex((u: OnlineUser) => u.user_id === message.data.user_id);
                if (existingIndex >= 0) {
                  // Update existing user
                  const updated = [...prev];
                  updated[existingIndex] = { ...updated[existingIndex], ...message.data, is_online: true };
                  return updated;
                } else {
                  // Add new online user
                  return [...prev, { ...message.data, is_online: true }];
                }
              });
              break;
              
            case 'user_offline':
              setUsers((prev: OnlineUser[]) => prev.filter((u: OnlineUser) => u.user_id !== message.data.user_id));
              break;
              
            case 'activity_update':
              setUsers((prev: OnlineUser[]) => prev.map((user: OnlineUser) => 
                user.user_id === message.data.user_id 
                  ? { ...user, last_activity: message.data.last_activity }
                  : user
              ));
              break;
              
            case 'pong':
              // Handle pong response
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event: CloseEvent) => {
        console.log('Online Users WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        onDisconnectRef.current?.();
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Ensure reference cleared so future connects can proceed
        wsRef.current = null;

        // Auto-reconnect if enabled and tab is active
        if (autoReconnect && shouldConnectRef.current && isTabActiveRef.current && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Online Users WebSocket error:', error);
        onErrorRef.current?.(error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      onErrorRef.current?.(error as Event);
    }
  }, [autoReconnect, reconnectInterval, setupPingInterval]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    
    // Clear timeouts and intervals
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    shouldConnectRef.current = true;
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Initial connection setup
  useEffect(() => {
    shouldConnectRef.current = enabled;
    
    if (enabled && isTabActiveRef.current) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled]);

  // Request initial data when connected
  useEffect(() => {
    if (isConnected && isTabActiveRef.current) {
      // Request initial stats and users
      sendMessage({ type: 'request_stats' });
      sendMessage({ type: 'request_users' });
    }
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    stats,
    users,
    sendMessage,
    reconnect,
    disconnect
  };
};