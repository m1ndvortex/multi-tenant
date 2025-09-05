import { api } from '@/lib/api';

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
    const response = await api.get('/settings/tenant');
    return response.data;
  }

  async updateTenantSettings(settings: Partial<TenantSettings>): Promise<TenantSettings> {
    const response = await api.put('/settings/tenant', settings);
    return response.data;
  }

  async uploadLogo(file: File): Promise<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post('/settings/tenant/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // User Management
  async getUsers(): Promise<User[]> {
    const response = await api.get('/settings/users');
    return response.data;
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await api.post('/settings/users', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    const response = await api.put(`/settings/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/settings/users/${userId}`);
  }

  async resetUserPassword(userId: string): Promise<{ temporaryPassword: string }> {
    const response = await api.post(`/settings/users/${userId}/reset-password`);
    return response.data;
  }

  // Gold Price Management
  async getGoldPrices(startDate?: string, endDate?: string): Promise<GoldPrice[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/settings/gold-prices?${params.toString()}`);
    return response.data;
  }

  async getCurrentGoldPrice(): Promise<GoldPrice> {
    const response = await api.get('/settings/gold-prices/current');
    return response.data;
  }

  async createGoldPrice(priceData: CreateGoldPriceRequest): Promise<GoldPrice> {
    const response = await api.post('/settings/gold-prices', priceData);
    return response.data;
  }

  async updateGoldPrice(priceId: string, price: number): Promise<GoldPrice> {
    const response = await api.put(`/settings/gold-prices/${priceId}`, { price });
    return response.data;
  }

  async deleteGoldPrice(priceId: string): Promise<void> {
    await api.delete(`/settings/gold-prices/${priceId}`);
  }

  // System Preferences
  async getSystemPreferences(): Promise<SystemPreferences> {
    const response = await api.get('/settings/preferences');
    return response.data;
  }

  async updateSystemPreferences(preferences: Partial<SystemPreferences>): Promise<SystemPreferences> {
    const response = await api.put('/settings/preferences', preferences);
    return response.data;
  }
}

export const settingsService = new SettingsService();