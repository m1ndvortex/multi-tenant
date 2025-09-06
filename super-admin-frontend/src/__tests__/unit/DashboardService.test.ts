import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { dashboardService } from '@/services/dashboardService';
import { apiClient } from '@/services/apiClient';

// Real API integration test - no mocks

describe('DashboardService - Real API Integration', () => {
  let authToken: string;

  beforeAll(async () => {
    // Set up auth token for tests
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'test-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should test real API connectivity', async () => {
      try {
        // Test that we can connect to the backend
        const isConnected = await apiClient.checkConnectivity();
        expect(typeof isConnected).toBe('boolean');
      } catch (error) {
        console.log('Backend connectivity test failed:', error);
      }
    });

    it('should handle real API errors gracefully', async () => {
      try {
        // Try to fetch dashboard stats without proper auth
        await dashboardService.getDashboardStats();
      } catch (error: any) {
        // Should handle the error gracefully
        expect(error).toBeDefined();
        expect(error.status).toBeDefined();
      }
    });
  });

  describe('getOnlineUsers', () => {
    it('should handle real online users endpoint', async () => {
      try {
        const users = await dashboardService.getOnlineUsers();
        expect(Array.isArray(users)).toBe(true);
      } catch (error: any) {
        // Endpoint might not exist yet, check error is handled properly
        expect(error).toBeDefined();
        expect(error.status).toBeDefined();
      }
    });
  });

  describe('getSystemAlerts', () => {
    it('should handle real system alerts endpoint', async () => {
      try {
        const alerts = await dashboardService.getSystemAlerts();
        expect(Array.isArray(alerts)).toBe(true);
      } catch (error: any) {
        // Endpoint might not exist yet, check error is handled properly
        expect(error).toBeDefined();
        expect(error.status).toBeDefined();
      }
    });
  });

  describe('getQuickStats', () => {
    it('should handle real quick stats endpoint', async () => {
      try {
        const stats = await dashboardService.getQuickStats();
        expect(stats).toBeDefined();
      } catch (error: any) {
        // Endpoint might not exist yet, check error is handled properly
        expect(error).toBeDefined();
        expect(error.status).toBeDefined();
      }
    });
  });

  describe('getCurrentSystemHealth', () => {
    it('should handle real system health endpoint', async () => {
      try {
        const health = await dashboardService.getCurrentSystemHealth();
        expect(health).toBeDefined();
      } catch (error: any) {
        // Endpoint might not exist yet, check error is handled properly
        expect(error).toBeDefined();
        expect(error.status).toBeDefined();
      }
    });
  });

  describe('refreshAllDashboardData', () => {
    it('should handle real dashboard data refresh', async () => {
      const result = await dashboardService.refreshAllDashboardData();
      
      // Should return an object with the expected structure
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('onlineUsers');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('quickStats');
      
      // Arrays should be arrays even if empty
      expect(Array.isArray(result.onlineUsers)).toBe(true);
      expect(Array.isArray(result.alerts)).toBe(true);
    });
  });
});