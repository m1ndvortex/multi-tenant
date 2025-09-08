import { API_BASE_URL } from '@/lib/config';

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  customer_type: 'INDIVIDUAL' | 'BUSINESS' | 'VIP';
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  credit_limit: number;
  total_debt: number;
  total_gold_debt: number;
  total_purchases: number;
  tags: string[];
  notes?: string;
  preferred_contact_method: 'phone' | 'email' | 'sms';
  email_notifications: boolean;
  sms_notifications: boolean;
  business_name?: string;
  tax_id?: string;
  business_type?: string;
  last_purchase_at?: string;
  last_contact_at?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  display_name: string;
  primary_contact: string;
  full_address: string;
  is_vip: boolean;
  has_outstanding_debt: boolean;
}

export interface CustomerCreate {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  customer_type?: 'INDIVIDUAL' | 'BUSINESS' | 'VIP';
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  credit_limit?: number;
  tags?: string[];
  notes?: string;
  preferred_contact_method?: 'phone' | 'email' | 'sms';
  email_notifications?: boolean;
  sms_notifications?: boolean;
  business_name?: string;
  tax_id?: string;
  business_type?: string;
}

export interface CustomerUpdate {
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  customer_type?: 'INDIVIDUAL' | 'BUSINESS' | 'VIP';
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  credit_limit?: number;
  tags?: string[];
  notes?: string;
  preferred_contact_method?: 'phone' | 'email' | 'sms';
  email_notifications?: boolean;
  sms_notifications?: boolean;
  business_name?: string;
  tax_id?: string;
  business_type?: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CustomerSearchParams {
  query?: string;
  status?: string;
  customer_type?: string;
  tags?: string[];
  has_debt?: boolean;
  city?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  per_page?: number;
}

export interface CustomerInteraction {
  id: string;
  tenant_id: string;
  customer_id: string;
  user_id: string;
  interaction_type: 'CALL' | 'EMAIL' | 'SMS' | 'MEETING' | 'NOTE' | 'PURCHASE' | 'PAYMENT' | 'COMPLAINT' | 'SUPPORT';
  subject: string;
  description?: string;
  outcome?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CustomerInteractionCreate {
  customer_id: string;
  interaction_type: 'CALL' | 'EMAIL' | 'SMS' | 'MEETING' | 'NOTE' | 'PURCHASE' | 'PAYMENT' | 'COMPLAINT' | 'SUPPORT';
  subject: string;
  description?: string;
  outcome?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  metadata?: Record<string, any>;
}

export interface CustomerStats {
  total_customers: number;
  active_customers: number;
  vip_customers: number;
  customers_with_debt: number;
  total_debt_amount: number;
  total_gold_debt_amount: number;
  average_customer_value: number;
  new_customers_this_month: number;
}

class CustomerService {
  private getAuthHeaders() {
  const token = localStorage.getItem('tenant_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getCustomers(params: CustomerSearchParams = {}): Promise<CustomerListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

  const response = await fetch(`${API_BASE_URL}/api/customers/?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }

    return response.json();
  }

  async getCustomer(id: string): Promise<Customer> {
    const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch customer');
    }

    return response.json();
  }

  async createCustomer(customer: CustomerCreate): Promise<Customer> {
    const response = await fetch(`${API_BASE_URL}/api/customers`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(customer),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create customer');
    }

    return response.json();
  }

  async updateCustomer(id: string, customer: CustomerUpdate): Promise<Customer> {
    const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(customer),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update customer');
    }

    return response.json();
  }

  async deleteCustomer(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete customer');
    }
  }

  async getCustomerStats(): Promise<CustomerStats> {
    const response = await fetch(`${API_BASE_URL}/api/customers/stats`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch customer stats');
    }

    return response.json();
  }

  async getCustomerTags(): Promise<{ tags: string[]; tag_counts: Record<string, number> }> {
    const response = await fetch(`${API_BASE_URL}/api/customers/tags`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch customer tags');
    }

    return response.json();
  }

  async getCustomerInteractions(customerId: string, page = 1, perPage = 20): Promise<{
    interactions: CustomerInteraction[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/api/customers/${customerId}/interactions?page=${page}&per_page=${perPage}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch customer interactions');
    }

    return response.json();
  }

  async createCustomerInteraction(interaction: CustomerInteractionCreate): Promise<CustomerInteraction> {
    const response = await fetch(
      `${API_BASE_URL}/api/customers/${interaction.customer_id}/interactions`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(interaction),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create interaction');
    }

    return response.json();
  }
}

export const customerService = new CustomerService();