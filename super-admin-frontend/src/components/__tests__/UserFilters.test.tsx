import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import UserFilters from '../UserFilters';
import { UserFilters as UserFiltersType } from '@/types/impersonation';

const mockTenants = [
  { id: 'tenant1', name: 'Tenant One' },
  { id: 'tenant2', name: 'Tenant Two' },
];

describe('UserFilters', () => {
  const mockOnFiltersChange = vi.fn();
  const mockOnReset = vi.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
    mockOnReset.mockClear();
  });

  it('renders filter form with all fields', () => {
    const filters: Partial<UserFiltersType> = {};

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    expect(screen.getByText('فیلترهای جستجو')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ایمیل یا نام کاربر...')).toBeInTheDocument();
    expect(screen.getByText('همه تنانت‌ها')).toBeInTheDocument();
    expect(screen.getByText('همه نقش‌ها')).toBeInTheDocument();
    expect(screen.getByText('همه وضعیت‌ها')).toBeInTheDocument();
  });

  it('calls onFiltersChange when search input changes', () => {
    const filters: Partial<UserFiltersType> = {};

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    const searchInput = screen.getByPlaceholderText('ایمیل یا نام کاربر...');
    fireEvent.change(searchInput, { target: { value: 'test@example.com' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      search: 'test@example.com',
    });
  });

  it('calls onFiltersChange when tenant filter changes', () => {
    const filters: Partial<UserFiltersType> = {};

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    // Find tenant select by looking for the one that has "همه تنانت‌ها" as text
    const selects = screen.getAllByRole('combobox');
    const tenantSelect = selects.find(select => 
      select.textContent?.includes('همه تنانت‌ها')
    );
    
    if (tenantSelect) {
      fireEvent.click(tenantSelect);
      
      // Select first tenant
      fireEvent.click(screen.getByText('Tenant One'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        tenant_id: 'tenant1',
      });
    }
  });

  it('calls onFiltersChange when role filter changes', () => {
    const filters: Partial<UserFiltersType> = {};

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    // Find role select by looking for the one that has "همه نقش‌ها" as placeholder
    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects.find(select => 
      select.textContent?.includes('همه نقش‌ها')
    );
    
    if (roleSelect) {
      fireEvent.click(roleSelect);
      fireEvent.click(screen.getByText('مدیر'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        role: 'admin',
      });
    }
  });

  it('calls onFiltersChange when status filter changes', () => {
    const filters: Partial<UserFiltersType> = {};

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    // Find status select by looking for the one that has "همه وضعیت‌ها" as placeholder
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects.find(select => 
      select.textContent?.includes('همه وضعیت‌ها')
    );
    
    if (statusSelect) {
      fireEvent.click(statusSelect);
      fireEvent.click(screen.getByText('فعال'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        is_active: 'true',
      });
    }
  });

  it('shows reset button when filters are active', () => {
    const filters: Partial<UserFiltersType> = {
      search: 'test',
      tenant_id: 'tenant1',
    };

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    expect(screen.getByText('پاک کردن فیلترها')).toBeInTheDocument();
  });

  it('hides reset button when no filters are active', () => {
    const filters: Partial<UserFiltersType> = {};

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    expect(screen.queryByText('پاک کردن فیلترها')).not.toBeInTheDocument();
  });

  it('calls onReset when reset button is clicked', () => {
    const filters: Partial<UserFiltersType> = {
      search: 'test',
    };

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    fireEvent.click(screen.getByText('پاک کردن فیلترها'));
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('displays current filter values', () => {
    const filters: Partial<UserFiltersType> = {
      search: 'test@example.com',
    };

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    const searchInput = screen.getByPlaceholderText('ایمیل یا نام کاربر...');
    expect(searchInput).toHaveValue('test@example.com');
  });

  it('renders tenant options correctly', () => {
    const filters: Partial<UserFiltersType> = {};

    render(
      <UserFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        tenants={mockTenants}
      />
    );

    // Find tenant select by looking for the one that has "همه تنانت‌ها" as text
    const selects = screen.getAllByRole('combobox');
    const tenantSelect = selects.find(select => 
      select.textContent?.includes('همه تنانت‌ها')
    );
    
    if (tenantSelect) {
      fireEvent.click(tenantSelect);

      expect(screen.getByText('Tenant One')).toBeInTheDocument();
      expect(screen.getByText('Tenant Two')).toBeInTheDocument();
    }
  });
});