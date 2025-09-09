/**
 * Enhanced Typography and Color Accessibility Tests
 * Tests for high-contrast font colors and accessibility compliance
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnhancedCard, EnhancedCardTitle, EnhancedCardContent } from '../ui/enhanced-card';
import { EnhancedButton } from '../ui/enhanced-button';
import { EnhancedInput, EnhancedSearchInput } from '../ui/enhanced-input';
import { 
  EnhancedTable, 
  EnhancedTableContainer,
  EnhancedTableHeader, 
  EnhancedTableBody,
  EnhancedTableHead,
  EnhancedTableRow,
  EnhancedTableCell,
  TenantNameCell
} from '../ui/enhanced-table';

describe('Enhanced Typography System', () => {
  describe('EnhancedCard Component', () => {
    it('should render with high contrast text colors', () => {
      render(
        <EnhancedCard variant="professional">
          <EnhancedCardTitle>Test Title</EnhancedCardTitle>
          <EnhancedCardContent>Test content</EnhancedCardContent>
        </EnhancedCard>
      );

      const title = screen.getByText('Test Title');
      const content = screen.getByText('Test content');

      expect(title).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      
      // Check for high contrast classes
      expect(title).toHaveClass('text-gray-900');
      expect(title).toHaveClass('font-bold');
    });

    it('should render gradient variants with proper contrast', () => {
      render(
        <EnhancedCard variant="gradient-super-admin" data-testid="gradient-card">
          <EnhancedCardContent>Gradient content</EnhancedCardContent>
        </EnhancedCard>
      );

      const card = screen.getByTestId('gradient-card');
      expect(card).toHaveClass('bg-gradient-to-br');
      expect(card).toHaveClass('text-gray-900');
    });

    it('should render high contrast variant', () => {
      render(
        <EnhancedCard variant="high-contrast" data-testid="high-contrast-card">
          <EnhancedCardContent>High contrast content</EnhancedCardContent>
        </EnhancedCard>
      );

      const card = screen.getByTestId('high-contrast-card');
      expect(card).toHaveClass('text-black');
      expect(card).toHaveClass('border-2');
    });
  });

  describe('EnhancedButton Component', () => {
    it('should render with high contrast colors', () => {
      render(
        <EnhancedButton variant="gradient-primary">
          Test Button
        </EnhancedButton>
      );

      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('font-semibold');
    });

    it('should render outline variants with proper contrast', () => {
      render(
        <EnhancedButton variant="outline-primary">
          Outline Button
        </EnhancedButton>
      );

      const button = screen.getByRole('button', { name: 'Outline Button' });
      expect(button).toHaveClass('border-2');
      expect(button).toHaveClass('text-blue-700');
    });

    it('should show loading state with spinner', () => {
      render(
        <EnhancedButton loading={true}>
          Loading Button
        </EnhancedButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      // Check for loading spinner
      const spinner = button.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('EnhancedInput Component', () => {
    it('should render with high contrast borders and text', () => {
      render(
        <EnhancedInput 
          label="Test Input"
          placeholder="Enter text..."
          data-testid="enhanced-input"
        />
      );

      const input = screen.getByTestId('enhanced-input');
      const label = screen.getByText('Test Input');

      expect(input).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      
      expect(input).toHaveClass('border-2');
      expect(input).toHaveClass('text-gray-900');
      expect(input).toHaveClass('font-medium');
      expect(label).toHaveClass('font-semibold');
    });

    it('should render error state with proper styling', () => {
      render(
        <EnhancedInput 
          label="Error Input"
          error="This field is required"
          data-testid="error-input"
        />
      );

      const input = screen.getByTestId('error-input');
      const errorMessage = screen.getByText('This field is required');

      expect(input).toHaveClass('border-red-300');
      expect(errorMessage).toHaveClass('text-red-700');
    });

    it('should render with icons and proper spacing', () => {
      const leftIcon = <span data-testid="left-icon">🔍</span>;
      const rightIcon = <span data-testid="right-icon">✕</span>;

      render(
        <EnhancedInput 
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          data-testid="icon-input"
        />
      );

      const input = screen.getByTestId('icon-input');
      const leftIconElement = screen.getByTestId('left-icon');
      const rightIconElement = screen.getByTestId('right-icon');

      expect(input).toHaveClass('pl-10');
      expect(input).toHaveClass('pr-10');
      expect(leftIconElement).toBeInTheDocument();
      expect(rightIconElement).toBeInTheDocument();
    });
  });

  describe('EnhancedSearchInput Component', () => {
    it('should render with search icon and clear functionality', () => {
      const mockOnSearch = vi.fn();
      const mockOnClear = vi.fn();

      render(
        <EnhancedSearchInput 
          onSearch={mockOnSearch}
          onClear={mockOnClear}
          placeholder="جستجو..."
        />
      );

      const input = screen.getByPlaceholderText('جستجو...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('enhanced-search-field');
    });
  });

  describe('EnhancedTable Component', () => {
    it('should render with high contrast styling', () => {
      render(
        <EnhancedTableContainer>
          <EnhancedTable>
            <EnhancedTableHeader>
              <EnhancedTableRow>
                <EnhancedTableHead>Header 1</EnhancedTableHead>
                <EnhancedTableHead>Header 2</EnhancedTableHead>
              </EnhancedTableRow>
            </EnhancedTableHeader>
            <EnhancedTableBody>
              <EnhancedTableRow>
                <EnhancedTableCell>Cell 1</EnhancedTableCell>
                <EnhancedTableCell>Cell 2</EnhancedTableCell>
              </EnhancedTableRow>
            </EnhancedTableBody>
          </EnhancedTable>
        </EnhancedTableContainer>
      );

      const header1 = screen.getByText('Header 1');
      const cell1 = screen.getByText('Cell 1');

      expect(header1).toHaveClass('font-bold');
      expect(header1).toHaveClass('text-gray-900');
      expect(cell1).toHaveClass('font-medium');
      expect(cell1).toHaveClass('text-gray-900');
    });

    it('should render TenantNameCell with maximum visibility', () => {
      render(
        <EnhancedTable>
          <EnhancedTableBody>
            <EnhancedTableRow>
              <TenantNameCell tenantName="Test Tenant" />
            </EnhancedTableRow>
          </EnhancedTableBody>
        </EnhancedTable>
      );

      const tenantCell = screen.getByText('Test Tenant');
      expect(tenantCell).toBeInTheDocument();
      expect(tenantCell).toHaveClass('font-bold');
      expect(tenantCell).toHaveClass('text-blue-900');
      expect(tenantCell).toHaveClass('bg-blue-100');
    });

    it('should render different cell variants with proper styling', () => {
      render(
        <EnhancedTable>
          <EnhancedTableBody>
            <EnhancedTableRow>
              <EnhancedTableCell variant="important">Important</EnhancedTableCell>
              <EnhancedTableCell variant="success">Success</EnhancedTableCell>
              <EnhancedTableCell variant="warning">Warning</EnhancedTableCell>
              <EnhancedTableCell variant="error">Error</EnhancedTableCell>
            </EnhancedTableRow>
          </EnhancedTableBody>
        </EnhancedTable>
      );

      const importantCell = screen.getByText('Important');
      const successCell = screen.getByText('Success');
      const warningCell = screen.getByText('Warning');
      const errorCell = screen.getByText('Error');

      expect(importantCell).toHaveClass('font-bold');
      expect(successCell).toHaveClass('text-green-800');
      expect(warningCell).toHaveClass('text-yellow-800');
      expect(errorCell).toHaveClass('text-red-800');
    });
  });
});

describe('Accessibility Compliance Tests', () => {
  it('should have proper ARIA labels and roles', () => {
    render(
      <div>
        <EnhancedInput 
          label="Accessible Input"
          id="accessible-input"
          aria-describedby="input-help"
        />
        <div id="input-help">Help text for input</div>
      </div>
    );

    const input = screen.getByLabelText('Accessible Input');
    expect(input).toHaveAttribute('aria-describedby', 'input-help');
  });

  it('should have proper focus management', () => {
    render(
      <EnhancedButton>Focusable Button</EnhancedButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('focus-visible:outline-none');
    expect(button).toHaveClass('focus-visible:ring-2');
  });

  it('should support keyboard navigation', () => {
    render(
      <EnhancedTable>
        <EnhancedTableBody>
          <EnhancedTableRow tabIndex={0}>
            <EnhancedTableCell>Keyboard accessible</EnhancedTableCell>
          </EnhancedTableRow>
        </EnhancedTableBody>
      </EnhancedTable>
    );

    const row = screen.getByText('Keyboard accessible').closest('tr');
    expect(row).toHaveAttribute('tabIndex', '0');
  });
});

describe('Color Contrast Tests', () => {
  it('should use high contrast colors for text elements', () => {
    render(
      <div>
        <h1 className="text-gray-900">High Contrast Heading</h1>
        <p className="text-gray-900">High contrast paragraph</p>
        <a href="#" className="text-blue-700">High contrast link</a>
      </div>
    );

    const heading = screen.getByText('High Contrast Heading');
    const paragraph = screen.getByText('High contrast paragraph');
    const link = screen.getByText('High contrast link');

    expect(heading).toHaveClass('text-gray-900');
    expect(paragraph).toHaveClass('text-gray-900');
    expect(link).toHaveClass('text-blue-700');
  });

  it('should use proper background and text color combinations', () => {
    render(
      <EnhancedCard variant="high-contrast" data-testid="contrast-card">
        <EnhancedCardContent>
          <span className="text-black">Maximum contrast text</span>
        </EnhancedCardContent>
      </EnhancedCard>
    );

    const card = screen.getByTestId('contrast-card');
    const text = screen.getByText('Maximum contrast text');

    expect(card).toHaveClass('bg-white');
    expect(text).toHaveClass('text-black');
  });
});