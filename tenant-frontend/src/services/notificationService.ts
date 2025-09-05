import { api } from '@/lib/api';

export interface NotificationSettings {
  id: string;
  tenant_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  invoice_notifications: boolean;
  payment_reminders: boolean;
  marketing_notifications: boolean;
  reminder_days_before: number;
  overdue_reminder_frequency: number;
  email_template_id?: string;
  sms_template_id?: string;
}

export interface NotificationHistory {
  id: string;
  tenant_id: string;
  recipient_email?: string;
  recipient_phone?: string;
  notification_type: 'email' | 'sms';
  subject?: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  sent_at?: string;
  error_message?: string;
  invoice_id?: string;
  customer_id?: string;
}

export interface ManualReminderRequest {
  invoice_id: string;
  notification_type: 'email' | 'sms' | 'both';
  custom_message?: string;
}

export interface MarketingCampaign {
  id?: string;
  tenant_id: string;
  name: string;
  message: string;
  notification_type: 'email' | 'sms' | 'both';
  target_segments: string[];
  customer_tags: string[];
  scheduled_at?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  total_recipients?: number;
  sent_count?: number;
  failed_count?: number;
  created_at?: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  customer_count: number;
  criteria: {
    tags?: string[];
    total_debt_min?: number;
    total_debt_max?: number;
    last_purchase_days?: number;
  };
}

class NotificationService {
  // Notification Settings
  async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await api.get('/notifications/settings');
    return response.data;
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await api.put('/notifications/settings', settings);
    return response.data;
  }

  // Notification History
  async getNotificationHistory(params?: {
    page?: number;
    limit?: number;
    notification_type?: 'email' | 'sms';
    status?: 'sent' | 'failed' | 'pending';
    date_from?: string;
    date_to?: string;
  }): Promise<{
    notifications: NotificationHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get('/notifications/history', { params });
    return response.data;
  }

  // Manual Reminders
  async sendManualReminder(request: ManualReminderRequest): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/notifications/manual-reminder', request);
    return response.data;
  }

  async getUnpaidInvoices(): Promise<Array<{
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    total_amount: number;
    due_date: string;
    days_overdue: number;
  }>> {
    const response = await api.get('/notifications/unpaid-invoices');
    return response.data;
  }

  // Marketing Campaigns
  async getMarketingCampaigns(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    campaigns: MarketingCampaign[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get('/notifications/campaigns', { params });
    return response.data;
  }

  async createMarketingCampaign(campaign: Omit<MarketingCampaign, 'id' | 'tenant_id' | 'created_at'>): Promise<MarketingCampaign> {
    const response = await api.post('/notifications/campaigns', campaign);
    return response.data;
  }

  async updateMarketingCampaign(id: string, campaign: Partial<MarketingCampaign>): Promise<MarketingCampaign> {
    const response = await api.put(`/notifications/campaigns/${id}`, campaign);
    return response.data;
  }

  async deleteMarketingCampaign(id: string): Promise<void> {
    await api.delete(`/notifications/campaigns/${id}`);
  }

  async sendMarketingCampaign(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/notifications/campaigns/${id}/send`);
    return response.data;
  }

  // Customer Segmentation
  async getCustomerSegments(): Promise<CustomerSegment[]> {
    const response = await api.get('/notifications/segments');
    return response.data;
  }

  async getCustomerTags(): Promise<string[]> {
    const response = await api.get('/customers/tags');
    return response.data;
  }

  // Templates
  async getEmailTemplates(): Promise<Array<{ id: string; name: string; subject: string; content: string }>> {
    const response = await api.get('/notifications/email-templates');
    return response.data;
  }

  async getSmsTemplates(): Promise<Array<{ id: string; name: string; content: string }>> {
    const response = await api.get('/notifications/sms-templates');
    return response.data;
  }
}

export const notificationService = new NotificationService();