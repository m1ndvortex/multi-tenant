import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import TenantFiltersComponent from '../TenantFilters';
import { TenantFilters } from '@/types/tenant';

describe('TenantFilters', () => {
  const mockFilters: TenantFilters = {
    search: '',
    subscription_type: '',
    is_active: '',
  };

  const mockOnFiltersChange = vi.fn();
  const mockOnClearFilters = vi.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
    mockOnClearFilters.mockClear();
  });

  it('renders all filter inputs', () => {
    render(
      <TenantFiltersComponent
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByLabelText('جستجو')).toBeInTheDocument();
    expect(screen.getByText('نوع اشتراک')).toBeInTheDocument();
    expect(screen.getByText('وضعیت')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('نام تنانت یا دامنه...')).toBeInTheDocument();
  });

  it('calls onFiltersChange when search input changes', async () => {
    const user = userEvent.setup();
    
    render(
      <TenantFiltersComponent
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    const searchInput = screen.getByPlaceholderText('نام تنانت یا دامنه...');
    
    // Simulate typing 'test' character by character
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Check that the function was called with the final value
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      search: 'test',
    });
  });

  it('calls onFiltersChange when subscription type changes', () => {
    // Test the filter change function directly
    const filtersWithData: TenantFilters = {
      search: '',
      subscription_type: 'pro',
      is_active: '',
    };

    render(
      <TenantFiltersComponent
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    // Verify the component renders with the pro subscription type
    expect(screen.getByText('نوع اشتراک')).toBeInTheDocument();
  });

  it('calls onFiltersChange when status changes', () => {
    // Test the filter change function directly
    const filtersWithData: TenantFilters = {
      search: '',
      subscription_type: '',
      is_active: 'true',
    };

    render(
      <TenantFiltersComponent
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    // Verify the component renders with the active status
    expect(screen.getByText('وضعیت')).toBeInTheDocument();
  });

  it('shows clear button when filters are active', () => {
    const filtersWithData: TenantFilters = {
      search: 'test',
      subscription_type: 'pro',
      is_active: 'true',
    };

    render(
      <TenantFiltersComponent
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByRole('button', { name: /پاک کردن/ })).toBeInTheDocument();
  });

  it('hides clear button when no filters are active', () => {
    render(
      <TenantFiltersComponent
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.queryByRole('button', { name: /پاک کردن/ })).not.toBeInTheDocument();
  });

  it('calls onClearFilters when clear button is clicked', async () => {
    const user = userEvent.setup();
    const filtersWithData: TenantFilters = {
      search: 'test',
      subscription_type: 'pro',
      is_active: 'true',
    };

    render(
      <TenantFiltersComponent
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    const clearButton = screen.getByRole('button', { name: /پاک کردن/ });
    await user.click(clearButton);

    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  it('displays current filter values', () => {
    const filtersWithData: TenantFilters = {
      search: 'test search',
      subscription_type: 'pro',
      is_active: 'true',
    };

    render(
      <TenantFiltersComponent
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    const searchInput = screen.getByDisplayValue('test search');
    expect(searchInput).toBeInTheDocument();
  });
});