import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  role: string;
  is_super_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: (redirectToLogin?: boolean) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Session timeout configuration (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes in milliseconds

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('super_admin_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTimer, setSessionTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on cleanup
  useEffect(() => {
    return () => {
      if (sessionTimer) clearTimeout(sessionTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [sessionTimer, refreshTimer]);

  // Setup axios interceptors for handling 401 responses
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response?.status === 401 && token) {
          // Token is invalid or expired
          logout(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [token]);

  useEffect(() => {
    const maybeBootstrapAuth = async () => {
      if (token) {
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // If the token is expired or about to expire soon, proactively refresh before other requests start.
        try {
          const expSeconds = getTokenExpiry(token);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const isExpiringSoon = expSeconds !== null && (expSeconds - nowSeconds) < 60; // 60s buffer
          if (expSeconds !== null && expSeconds <= nowSeconds) {
            await refreshToken();
          } else if (isExpiringSoon) {
            await refreshToken();
          }
        } catch {
          // If parsing fails, try to verify; refresh will occur via interceptors if needed
        }

        // Verify token and get user info
        await verifyToken();

        // Setup session management
        setupSessionManagement();
      } else {
        setIsLoading(false);
      }
    };

    // Fire and forget; internal calls await as needed
    void maybeBootstrapAuth();
  }, [token]);

  

  const setupSessionManagement = useCallback(() => {
    // Clear existing timers
    if (sessionTimer) clearTimeout(sessionTimer);
    if (refreshTimer) clearTimeout(refreshTimer);

    // Setup session timeout
    const newSessionTimer = setTimeout(() => {
      logout(true);
    }, SESSION_TIMEOUT);

    // Setup token refresh
    const newRefreshTimer = setTimeout(() => {
      refreshToken();
    }, TOKEN_REFRESH_INTERVAL);

    setSessionTimer(newSessionTimer);
    setRefreshTimer(newRefreshTimer);
  }, [sessionTimer, refreshTimer]);

  const verifyToken = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Token verification failed:', error);
      logout(true);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const storedRefresh = localStorage.getItem('super_admin_refresh_token');
      if (!storedRefresh) throw new Error('No refresh token');
      const response = await axios.post('/api/auth/refresh', { refresh_token: storedRefresh });
      const { access_token, refresh_token } = response.data;
      
      setToken(access_token);
      localStorage.setItem('super_admin_token', access_token);
      if (refresh_token) {
        localStorage.setItem('super_admin_refresh_token', refresh_token);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Reset session management timers
      setupSessionManagement();
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout(true);
    }
  };

  // Helper: decode JWT and extract exp (in seconds since epoch). Returns null on failure.
  function getTokenExpiry(jwtToken: string): number | null {
    try {
      const parts = jwtToken.split('.');
      if (parts.length !== 3) return null;
      const payloadJson = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const exp = payloadJson?.exp;
      return typeof exp === 'number' ? exp : null;
    } catch {
      return null;
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/super-admin/login', {
        email,
        password,
      });
      
      const { access_token, refresh_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('super_admin_token', access_token);
      if (refresh_token) {
        localStorage.setItem('super_admin_refresh_token', refresh_token);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = useCallback((redirectToLogin: boolean = false) => {
    // Clear timers
    if (sessionTimer) clearTimeout(sessionTimer);
    if (refreshTimer) clearTimeout(refreshTimer);
    
    // Clear state and storage
    setUser(null);
    setToken(null);
    localStorage.removeItem('super_admin_token');
  localStorage.removeItem('super_admin_refresh_token');
    delete axios.defaults.headers.common['Authorization'];

    // Redirect to login with session expired flag if needed
    if (redirectToLogin && window.location.pathname !== '/login') {
      window.location.href = '/login?expired=true';
    }
  }, [sessionTimer, refreshTimer]);

  // Listen for global unauthorized events from apiClient
  useEffect(() => {
    const handler = () => logout(true);
    window.addEventListener('auth:unauthorized', handler as EventListener);
    return () => window.removeEventListener('auth:unauthorized', handler as EventListener);
  }, [logout]);

  // Reset session timer on user activity
  useEffect(() => {
    const resetSessionTimer = () => {
      if (token && user) {
        setupSessionManagement();
      }
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetSessionTimer, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetSessionTimer, true);
      });
    };
  }, [token, user, setupSessionManagement]);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};