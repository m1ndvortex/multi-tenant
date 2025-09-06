/**
 * Invoice customization service for managing templates, branding, and custom fields
 */

import { apiClient } from '@/lib/api';

// Types
export interface InvoiceTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  template_type: 'GENERAL' | 'GOLD' | 'CUSTOM';
  is_active: boolean;
  is_default: boolean;
  layout_config?: any;
  header_config?: any;
  footer_config?: any;
  item_table_config?: any;
  branding_config?: any;
  custom_css?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCustomField {
  id: string;
  tenant_id: string;
  template_id: string;
  field_name: string;
  display_name: string;
  field_type: 'TEXT' | 'NUMBER' | 'DECIMAL' | 'DATE' | 'BOOLEAN' | 'SELECT';
  is_required: boolean;
  is_line_item_field: boolean;
  default_value?: string;
  validation_rules?: any;
  select_options?: Array<{ label: string; value: string }>;
  display_order: number;
  column_width?: string;
  is_visible_on_print: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceNumberingScheme {
  id: string;
  tenant_id: string;
  template_id?: string;
  name: string;
  description?: string;
  prefix?: string;
  suffix?: string;
  number_format: string;
  current_sequence: number;
  sequence_reset_frequency: 'NEVER' | 'YEARLY' | 'MONTHLY' | 'DAILY';
  last_reset_date?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceBranding {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  logo_url?: string;
  logo_width?: string;
  logo_height?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  text_color?: string;
  background_color?: string;
  font_family?: string;
  header_font_size?: string;
  body_font_size?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  tax_id?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTemplateWithFields extends InvoiceTemplate {
  custom_fields: InvoiceCustomField[];
  numbering_schemes: InvoiceNumberingScheme[];
}

// Create types
export interface CreateInvoiceTemplate {
  name: string;
  description?: string;
  template_type: 'GENERAL' | 'GOLD' | 'CUSTOM';
  is_active?: boolean;
  is_default?: boolean;
  layout_config?: any;
  header_config?: any;
  footer_config?: any;
  item_table_config?: any;
  branding_config?: any;
  custom_css?: string;
}

export interface CreateInvoiceCustomField {
  template_id: string;
  field_name: string;
  display_name: string;
  field_type: 'TEXT' | 'NUMBER' | 'DECIMAL' | 'DATE' | 'BOOLEAN' | 'SELECT';
  is_required?: boolean;
  is_line_item_field?: boolean;
  default_value?: string;
  validation_rules?: any;
  select_options?: Array<{ label: string; value: string }>;
  display_order?: number;
  column_width?: string;
  is_visible_on_print?: boolean;
}

export interface CreateInvoiceNumberingScheme {
  template_id?: string;
  name: string;
  description?: string;
  prefix?: string;
  suffix?: string;
  number_format?: string;
  current_sequence?: number;
  sequence_reset_frequency?: 'NEVER' | 'YEARLY' | 'MONTHLY' | 'DAILY';
  is_active?: boolean;
  is_default?: boolean;
}

export interface CreateInvoiceBranding {
  name: string;
  description?: string;
  logo_url?: string;
  logo_width?: string;
  logo_height?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  text_color?: string;
  background_color?: string;
  font_family?: string;
  header_font_size?: string;
  body_font_size?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  tax_id?: string;
  is_active?: boolean;
  is_default?: boolean;
}

// Response types
export interface TemplateListResponse {
  templates: InvoiceTemplate[];
  total: number;
  page: number;
  per_page: number;
}

export interface CustomFieldListResponse {
  custom_fields: InvoiceCustomField[];
  total: number;
}

export interface NumberingSchemeListResponse {
  numbering_schemes: InvoiceNumberingScheme[];
  total: number;
}

export interface BrandingListResponse {
  branding_configs: InvoiceBranding[];
  total: number;
}

export interface InvoiceNumberPreviewResponse {
  scheme_name: string;
  current_sequence: number;
  preview_numbers: string[];
  next_sequence: number;
}

class InvoiceCustomizationService {
  private baseUrl = '/api/invoice-customization';

  // Template Management
  async getTemplates(params?: {
    template_type?: 'GENERAL' | 'GOLD' | 'CUSTOM';
    is_active?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<TemplateListResponse> {
    const response = await apiClient.get<TemplateListResponse>(`${this.baseUrl}/templates`, { params });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<InvoiceTemplateWithFields> {
    const response = await apiClient.get<InvoiceTemplateWithFields>(`${this.baseUrl}/templates/${templateId}`);
    return response.data;
  }

  async createTemplate(templateData: CreateInvoiceTemplate): Promise<InvoiceTemplate> {
    const response = await apiClient.post<InvoiceTemplate>(`${this.baseUrl}/templates`, templateData);
    return response.data;
  }

  async updateTemplate(templateId: string, templateData: Partial<CreateInvoiceTemplate>): Promise<InvoiceTemplate> {
    const response = await apiClient.put<InvoiceTemplate>(`${this.baseUrl}/templates/${templateId}`, templateData);
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/templates/${templateId}`);
  }

  async getDefaultTemplate(templateType: 'GENERAL' | 'GOLD' | 'CUSTOM'): Promise<InvoiceTemplate> {
    const response = await apiClient.get<InvoiceTemplate>(`${this.baseUrl}/templates/default/${templateType}`);
    return response.data;
  }

  // Custom Field Management
  async getCustomFields(params?: {
    template_id?: string;
    is_line_item_field?: boolean;
  }): Promise<CustomFieldListResponse> {
    const response = await apiClient.get(`${this.baseUrl}/custom-fields`, { params });
    return response.data as any;
  }

  async createCustomField(fieldData: CreateInvoiceCustomField): Promise<InvoiceCustomField> {
    const response = await apiClient.post(`${this.baseUrl}/custom-fields`, fieldData);
    return response.data as any;
  }

  async updateCustomField(fieldId: string, fieldData: Partial<CreateInvoiceCustomField>): Promise<InvoiceCustomField> {
    const response = await apiClient.put(`${this.baseUrl}/custom-fields/${fieldId}`, fieldData);
    return response.data as any;
  }

  async deleteCustomField(fieldId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/custom-fields/${fieldId}`);
  }

  // Numbering Scheme Management
  async getNumberingSchemes(): Promise<NumberingSchemeListResponse> {
    const response = await apiClient.get(`${this.baseUrl}/numbering-schemes`);
    return response.data as any;
  }

  async createNumberingScheme(schemeData: CreateInvoiceNumberingScheme): Promise<InvoiceNumberingScheme> {
    const response = await apiClient.post(`${this.baseUrl}/numbering-schemes`, schemeData);
    return response.data as any;
  }

  async getDefaultNumberingScheme(): Promise<InvoiceNumberingScheme> {
    const response = await apiClient.get(`${this.baseUrl}/numbering-schemes/default`);
    return response.data as any;
  }

  async previewInvoiceNumbers(schemeId: string, count: number = 1): Promise<InvoiceNumberPreviewResponse> {
    const response = await apiClient.post(`${this.baseUrl}/numbering-schemes/${schemeId}/preview`, { count });
    return response.data as any;
  }

  async generateInvoiceNumber(schemeId?: string): Promise<{ invoice_number: string }> {
    const response = await apiClient.post(`${this.baseUrl}/generate-invoice-number`, { scheme_id: schemeId });
    return response.data as any;
  }

  // Branding Management
  async getBrandingConfigs(): Promise<BrandingListResponse> {
    const response = await apiClient.get(`${this.baseUrl}/branding`);
    return response.data as any;
  }

  async createBranding(brandingData: CreateInvoiceBranding): Promise<InvoiceBranding> {
    const response = await apiClient.post(`${this.baseUrl}/branding`, brandingData);
    return response.data as any;
  }

  async updateBranding(brandingId: string, brandingData: Partial<CreateInvoiceBranding>): Promise<InvoiceBranding> {
    const response = await apiClient.put(`${this.baseUrl}/branding/${brandingId}`, brandingData);
    return response.data as any;
  }

  async deleteBranding(brandingId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/branding/${brandingId}`);
  }

  async getDefaultBranding(): Promise<InvoiceBranding> {
    const response = await apiClient.get(`${this.baseUrl}/branding/default`);
    return response.data as any;
  }

  // Logo Upload
  async uploadLogo(file: File): Promise<{ logo_url: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await apiClient.post('/api/upload/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data as any;
  }
}

export const invoiceCustomizationService = new InvoiceCustomizationService();