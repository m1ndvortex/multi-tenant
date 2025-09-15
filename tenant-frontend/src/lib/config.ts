/**
 * Configuration constants for the tenant frontend application
 */

export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || (typeof process !== 'undefined' ? (process as any).env?.VITE_API_URL : '') || '';

export const APP_CONFIG = {
  name: 'HesaabPlus',
  version: '2.0.0',
  description: 'Business Management Platform',
  supportEmail: 'support@hesaabplus.com',
};

export const CHART_COLORS = {
  primary: '#10b981', // green-500
  secondary: '#0891b2', // cyan-600
  accent: '#8b5cf6', // violet-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  success: '#22c55e', // green-500
  info: '#3b82f6', // blue-500
};

export const PAGINATION_DEFAULTS = {
  pageSize: 20,
  maxPageSize: 100,
};

export const DATE_FORMATS = {
  display: 'YYYY/MM/DD',
  api: 'YYYY-MM-DD',
  persian: 'jYYYY/jMM/jDD',
};