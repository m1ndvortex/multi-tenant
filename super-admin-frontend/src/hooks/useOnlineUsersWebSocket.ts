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

  // Handle tab visibility changes to pause/resume updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isActive = !document.hidden;
      isTabActiveRef.current = isActive;
      
      if (isActive && shouldConnectRef.current && !wsRef.current) {
        // Tab became active, reconnect if needed
        connect();
      } else if (!isActive && wsRef.current) {
        // Tab became inactive, disconnect to conserve resources
        disconnect();
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
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Create new WebSocket connection
      wsRef.current = onlineUsersService.createWebSocketConnection();

      wsRef.current.onopen = () => {
        console.log('Online Users WebSocket connected');
        setIsConnected(true);
        setupPingInterval();
        onConnect?.();
        
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
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
              setUsers(prev => {
                const existingIndex = prev.findIndex(u => u.user_id === message.data.user_id);
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
              setUsers(prev => prev.filter(u => u.user_id !== message.data.user_id));
              break;
              
            case 'activity_update':
              setUsers(prev => prev.map(user => 
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

      wsRef.current.onclose = (event) => {
        console.log('Online Users WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        onDisconnect?.();
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

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
        onError?.(error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      onError?.(error as Event);
    }
  }, [autoReconnect, reconnectInterval, onConnect, onDisconnect, onError, setupPingInterval]);

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
  }, [enabled, connect, disconnect]);

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