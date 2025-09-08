import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  subscription_type: 'free' | 'pro';
  subscription_expires_at: string | null;
  is_active: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.tenant_id) {
      fetchTenant();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchTenant = async () => {
    try {
  const response = await axios.get('/api/auth/tenant');
      setTenant(response.data);
    } catch (error) {
      console.error('Failed to fetch tenant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTenant = async () => {
    if (isAuthenticated && user?.tenant_id) {
      await fetchTenant();
    }
  };

  const value: TenantContextType = {
    tenant,
    isLoading,
    refreshTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};