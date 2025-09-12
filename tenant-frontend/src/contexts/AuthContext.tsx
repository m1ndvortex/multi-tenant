import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { sendOffline } from '@/services/onlineActivityService';

interface User {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
  name?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  logout: (reason?: string) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('tenant_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token and get user info
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
      
      // Update last activity timestamp
      localStorage.setItem('last_activity', Date.now().toString());
    } catch (error) {
      console.error('Token verification failed:', error);
      logout('توکن نامعتبر است');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout('خطا در بروزرسانی اطلاعات کاربر');
    }
  };

  const login = async (email: string, password: string, tenantId?: string) => {
    try {
      // Prefer tenant login when tenantId is available
      const url = tenantId ? '/api/auth/tenant/login' : '/api/auth/login';
      const payload: any = { email, password };
      if (tenantId) payload.tenant_id = tenantId;
      const response = await axios.post(url, payload);
      
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('tenant_token', access_token);
      localStorage.setItem('last_activity', Date.now().toString());
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async (reason?: string) => {
    // Try to mark user offline before clearing token
    try {
      await sendOffline();
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('tenant_token');
    localStorage.removeItem('last_activity');
    delete axios.defaults.headers.common['Authorization'];
    
    if (reason) {
      console.log('Logout reason:', reason);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};