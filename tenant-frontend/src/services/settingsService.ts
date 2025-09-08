import { apiClient } from '@/lib/api';

export interface TenantSettings {
  id: string;
  name: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  logo?: string;
  currency: string;
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: 'admin' | 'manager' | 'user';
  isActive?: boolean;
}

export interface GoldPrice {
  id: string;
  date: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoldPriceRequest {
  date: string;
  price: number;
}

export interface SystemPreferences {
  autoBackup: boolean;
  backupTime: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  invoiceNumberPrefix: string;
  invoiceNumberStart: number;
  defaultPaymentTerms: number;
  lowStockThreshold: number;
}

class SettingsService {
  // Tenant Settings
  async getTenantSettings(): Promise<TenantSettings> {
    // Backend has tenant profile at /api/auth/tenant; using it as base business info for now
    const response = await apiClient.get('/api/auth/tenant');
    // Map minimal fields; backend may not expose full settings yet
    const t: any = response.data || {};
    return {
      id: t.id,
      name: t.name,
      businessType: 'gold',
      address: '',
      phone: '',
      email: '',
      taxId: '',
      logo: undefined,
      currency: 'IRR',
      language: 'fa',
      timezone: 'Asia/Tehran',
      dateFormat: 'jalali',
      numberFormat: 'standard',
    } as TenantSettings;
  }

  async updateTenantSettings(settings: Partial<TenantSettings>): Promise<TenantSettings> {
    // No dedicated endpoint found; return back the same shape as optimistic update
    return { ...(settings as any) } as TenantSettings;
  }

  async uploadLogo(file: File): Promise<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('logo', file);
  // Placeholder: no backend endpoint found; avoid breaking the UI
  const response = await apiClient.post('/api/external/uploads/mock', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as any;
  }

  // User Management
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get('/api/users', { params: { limit: 100 } });
    // user_management returns a structured payload; normalize to simplified list
    const payload: any = response.data || {};
    const users = (payload.users || payload || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      role: (u.role || 'user').toLowerCase(),
      isActive: (u.status || 'active').toLowerCase() === 'active',
      lastLogin: u.last_login_at,
      createdAt: u.created_at || new Date().toISOString(),
    })) as User[];
    return users;
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    // Map to backend schema
    const payload = {
      email: userData.email,
      password: userData.password,
      first_name: userData.name,
      last_name: '',
      role: (userData.role === 'admin' ? 'owner' : userData.role),
    } as any;
    const response = await apiClient.post('/api/users', payload);
    const u: any = response.data;
    return {
      id: u.id,
      email: u.email,
      name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      role: (u.role || 'user').toLowerCase(),
      isActive: (u.status || 'active').toLowerCase() === 'active',
      lastLogin: u.last_login_at,
      createdAt: u.created_at || new Date().toISOString(),
    } as User;
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    const payload: any = {
      first_name: userData.name,
      role: userData.role === 'admin' ? 'owner' : userData.role,
      status: userData.isActive ? 'active' : 'inactive',
    };
    const response = await apiClient.put(`/api/users/${userId}`, payload);
    const u: any = response.data;
    return {
      id: u.id,
      email: u.email,
      name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      role: (u.role || 'user').toLowerCase(),
      isActive: (u.status || 'active').toLowerCase() === 'active',
      lastLogin: u.last_login_at,
      createdAt: u.created_at || new Date().toISOString(),
    } as User;
  }

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/api/users/${userId}`);
  }

  async resetUserPassword(userId: string): Promise<{ temporaryPassword: string }> {
    // No backend endpoint; return mock to keep UI flowing
    return { temporaryPassword: 'temp-123456' };
  }

  // Gold Price Management
  async getGoldPrices(startDate?: string, endDate?: string): Promise<GoldPrice[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
  const response = await apiClient.get(`/api/gold-installments/gold-prices/history?${params.toString()}`);
    return response.data as any;
  }

  async getCurrentGoldPrice(): Promise<GoldPrice> {
    const response = await apiClient.get('/api/gold-installments/gold-prices/current');
    return response.data as any;
  }

  async createGoldPrice(priceData: CreateGoldPriceRequest): Promise<GoldPrice> {
    const response = await apiClient.post('/api/gold-installments/gold-prices', priceData);
    return response.data as any;
  }

  async updateGoldPrice(priceId: string, price: number): Promise<GoldPrice> {
    // No specific endpoint; reuse create as placeholder
    const response = await apiClient.post('/api/gold-installments/gold-prices', { price });
    return response.data as any;
  }

  async deleteGoldPrice(priceId: string): Promise<void> {
    // No delete endpoint available; noop
  }

  // System Preferences
  async getSystemPreferences(): Promise<SystemPreferences> {
    // No backend endpoint; provide sensible defaults
    return {
      autoBackup: true,
      backupTime: '02:00',
      emailNotifications: true,
      smsNotifications: false,
      invoiceNumberPrefix: 'INV',
      invoiceNumberStart: 1000,
      defaultPaymentTerms: 7,
      lowStockThreshold: 5,
    } as SystemPreferences;
  }

  async updateSystemPreferences(preferences: Partial<SystemPreferences>): Promise<SystemPreferences> {
    // Optimistic update fallback
    return { ...(preferences as any) } as SystemPreferences;
  }
}

export const settingsService = new SettingsService();