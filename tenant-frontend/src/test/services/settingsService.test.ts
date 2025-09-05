import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsService } from '@/services/settingsService';
import { api } from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = api as any;

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tenant Settings', () => {
    const mockTenantSettings = {
      id: '1',
      name: 'Test Business',
      businessType: 'retail',
      address: 'Test Address',
      phone: '09123456789',
      email: 'test@example.com',
      taxId: '123456789',
      logo: 'https://example.com/logo.png',
      currency: 'IRR',
      language: 'fa',
      timezone: 'Asia/Tehran',
      dateFormat: 'jalali',
      numberFormat: 'fa-IR',
    };

    it('should get tenant settings', async () => {
      mockApi.get.mockResolvedValue({ data: mockTenantSettings });

      const result = await settingsService.getTenantSettings();

      expect(mockApi.get).toHaveBeenCalledWith('/settings/tenant');
      expect(result).toEqual(mockTenantSettings);
    });

    it('should update tenant settings', async () => {
      const updateData = { name: 'Updated Business' };
      const updatedSettings = { ...mockTenantSettings, ...updateData };
      mockApi.put.mockResolvedValue({ data: updatedSettings });

      const result = await settingsService.updateTenantSettings(updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/settings/tenant', updateData);
      expect(result).toEqual(updatedSettings);
    });

    it('should upload logo', async () => {
      const mockFile = new File(['test'], 'logo.png', { type: 'image/png' });
      const mockResponse = { logoUrl: 'https://example.com/new-logo.png' };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await settingsService.uploadLogo(mockFile);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/settings/tenant/logo',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('User Management', () => {
    const mockUsers = [
      {
        id: '1',
        email: 'user1@example.com',
        name: 'User 1',
        role: 'admin' as const,
        isActive: true,
        lastLogin: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        email: 'user2@example.com',
        name: 'User 2',
        role: 'user' as const,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    it('should get users', async () => {
      mockApi.get.mockResolvedValue({ data: mockUsers });

      const result = await settingsService.getUsers();

      expect(mockApi.get).toHaveBeenCalledWith('/settings/users');
      expect(result).toEqual(mockUsers);
    });

    it('should create user', async () => {
      const newUserData = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user' as const,
        password: 'password123',
      };
      const createdUser = {
        id: '3',
        ...newUserData,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      };
      mockApi.post.mockResolvedValue({ data: createdUser });

      const result = await settingsService.createUser(newUserData);

      expect(mockApi.post).toHaveBeenCalledWith('/settings/users', newUserData);
      expect(result).toEqual(createdUser);
    });

    it('should update user', async () => {
      const userId = '1';
      const updateData = { name: 'Updated User', role: 'manager' as const };
      const updatedUser = { ...mockUsers[0], ...updateData };
      mockApi.put.mockResolvedValue({ data: updatedUser });

      const result = await settingsService.updateUser(userId, updateData);

      expect(mockApi.put).toHaveBeenCalledWith(`/settings/users/${userId}`, updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should delete user', async () => {
      const userId = '1';
      mockApi.delete.mockResolvedValue({});

      await settingsService.deleteUser(userId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/settings/users/${userId}`);
    });

    it('should reset user password', async () => {
      const userId = '1';
      const mockResponse = { temporaryPassword: 'temp123' };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await settingsService.resetUserPassword(userId);

      expect(mockApi.post).toHaveBeenCalledWith(`/settings/users/${userId}/reset-password`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Gold Price Management', () => {
    const mockGoldPrices = [
      {
        id: '1',
        date: '2024-01-01',
        price: 1500000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        date: '2024-01-02',
        price: 1520000,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ];

    it('should get gold prices', async () => {
      mockApi.get.mockResolvedValue({ data: mockGoldPrices });

      const result = await settingsService.getGoldPrices();

      expect(mockApi.get).toHaveBeenCalledWith('/settings/gold-prices?');
      expect(result).toEqual(mockGoldPrices);
    });

    it('should get gold prices with date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      mockApi.get.mockResolvedValue({ data: mockGoldPrices });

      const result = await settingsService.getGoldPrices(startDate, endDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/settings/gold-prices?startDate=${startDate}&endDate=${endDate}`
      );
      expect(result).toEqual(mockGoldPrices);
    });

    it('should get current gold price', async () => {
      const currentPrice = mockGoldPrices[1];
      mockApi.get.mockResolvedValue({ data: currentPrice });

      const result = await settingsService.getCurrentGoldPrice();

      expect(mockApi.get).toHaveBeenCalledWith('/settings/gold-prices/current');
      expect(result).toEqual(currentPrice);
    });

    it('should create gold price', async () => {
      const newPriceData = { date: '2024-01-03', price: 1530000 };
      const createdPrice = {
        id: '3',
        ...newPriceData,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };
      mockApi.post.mockResolvedValue({ data: createdPrice });

      const result = await settingsService.createGoldPrice(newPriceData);

      expect(mockApi.post).toHaveBeenCalledWith('/settings/gold-prices', newPriceData);
      expect(result).toEqual(createdPrice);
    });

    it('should update gold price', async () => {
      const priceId = '1';
      const newPrice = 1550000;
      const updatedPrice = { ...mockGoldPrices[0], price: newPrice };
      mockApi.put.mockResolvedValue({ data: updatedPrice });

      const result = await settingsService.updateGoldPrice(priceId, newPrice);

      expect(mockApi.put).toHaveBeenCalledWith(`/settings/gold-prices/${priceId}`, { price: newPrice });
      expect(result).toEqual(updatedPrice);
    });

    it('should delete gold price', async () => {
      const priceId = '1';
      mockApi.delete.mockResolvedValue({});

      await settingsService.deleteGoldPrice(priceId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/settings/gold-prices/${priceId}`);
    });
  });

  describe('System Preferences', () => {
    const mockPreferences = {
      autoBackup: true,
      backupTime: '02:00',
      emailNotifications: true,
      smsNotifications: false,
      invoiceNumberPrefix: 'INV',
      invoiceNumberStart: 1000,
      defaultPaymentTerms: 30,
      lowStockThreshold: 10,
    };

    it('should get system preferences', async () => {
      mockApi.get.mockResolvedValue({ data: mockPreferences });

      const result = await settingsService.getSystemPreferences();

      expect(mockApi.get).toHaveBeenCalledWith('/settings/preferences');
      expect(result).toEqual(mockPreferences);
    });

    it('should update system preferences', async () => {
      const updateData = { autoBackup: false, backupTime: '03:00' };
      const updatedPreferences = { ...mockPreferences, ...updateData };
      mockApi.put.mockResolvedValue({ data: updatedPreferences });

      const result = await settingsService.updateSystemPreferences(updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/settings/preferences', updateData);
      expect(result).toEqual(updatedPreferences);
    });
  });
});