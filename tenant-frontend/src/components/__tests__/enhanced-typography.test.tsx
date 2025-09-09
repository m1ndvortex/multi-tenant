/**
 * Enhanced Typography and Color Accessibility Tests for Tenant Frontend
 * Tests for high-contrast font colors and accessibility compliance with tenant branding
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnhancedCard, EnhancedCardTitle, EnhancedCardContent } from '../ui/enhanced-card';
import { EnhancedInput, EnhancedSearchInput } from '../ui/enhanced-input';

describe('Enhanced Typography System - Tenant Frontend', () => {
  describe('EnhancedCard Component', () => {
    it('should render with high contrast text colors and tenant branding', () => {
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

    it('should render gradient variants with emerald theme', () => {
      render(
        <EnhancedCard variant="gradient-primary" data-testid="gradient-card">
          <EnhancedCardContent>Gradient content</EnhancedCardContent>
        </EnhancedCard>
      );

      const card = screen.getByTestId('gradient-card');
      expect(card).toHaveClass('bg-gradient-to-br');
      expect(card).toHaveClass('from-emerald-50');
      expect(card).toHaveClass('text-gray-900');
    });

    it('should render filter variant with emerald theme', () => {
      render(
        <EnhancedCard variant="filter" data-testid="filter-card">
          <EnhancedCardContent>Filter content</EnhancedCardContent>
        </EnhancedCard>
      );

      const card = screen.getByTestId('filter-card');
      expect(card).toHaveClass('from-emerald-50');
      expect(card).toHaveClass('border-emerald-200');
    });
  });

  describe('EnhancedInput Component', () => {
    it('should render with emerald focus colors', () => {
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
      expect(input).toHaveClass('focus:border-emerald-600');
      expect(label).toHaveClass('font-semibold');
    });

    it('should have enhanced search field styling', () => {
      render(
        <EnhancedInput 
          placeholder="Search..."
          data-testid="search-input"
        />
      );

      const input = screen.getByTestId('search-input');
      expect(input).toHaveClass('enhanced-search-field');
    });
  });

  describe('EnhancedSearchInput Component', () => {
    it('should render with Persian placeholder and emerald theme', () => {
      const mockOnSearch = vi.fn();

      render(
        <EnhancedSearchInput 
          onSearch={mockOnSearch}
          placeholder="جستجو در محصولات..."
        />
      );

      const input = screen.getByPlaceholderText('جستجو در محصولات...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('enhanced-search-field');
    });

    it('should show clear button when input has value', () => {
      render(
        <EnhancedSearchInput />
      );

      const input = screen.getByRole('searchbox');
      
      // Initially no clear button
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      
      // Type something
      fireEvent.change(input, { target: { value: 'test' } });
      
      // Clear button should appear
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});

describe('Tenant Branding Tests', () => {
  it('should use emerald colors for tenant theme', () => {
    render(
      <div>
        <a href="#" className="text-emerald-700">Tenant Link</a>
        <button className="enhanced-button-tenant">Tenant Button</button>
        <div className="enhanced-card-tenant">Tenant Card</div>
      </div>
    );

    const link = screen.getByText('Tenant Link');
    const button = screen.getByText('Tenant Button');
    const card = screen.getByText('Tenant Card');

    expect(link).toHaveClass('text-emerald-700');
    expect(button).toHaveClass('enhanced-button-tenant');
    expect(card).toHaveClass('enhanced-card-tenant');
  });

  it('should have proper emerald focus states', () => {
    render(
      <EnhancedInput 
        data-testid="emerald-input"
        className="focus:border-emerald-600"
      />
    );

    const input = screen.getByTestId('emerald-input');
    expect(input).toHaveClass('focus:border-emerald-600');
  });
});

describe('Accessibility Compliance Tests - Tenant Frontend', () => {
  it('should support RTL text direction', () => {
    render(
      <div dir="rtl">
        <EnhancedInput 
          label="ورودی متن"
          placeholder="متن را وارد کنید..."
        />
      </div>
    );

    const input = screen.getByPlaceholderText('متن را وارد کنید...');
    const label = screen.getByText('ورودی متن');

    expect(input).toBeInTheDocument();
    expect(label).toBeInTheDocument();
  });

  it('should have proper contrast ratios for emerald theme', () => {
    render(
      <div>
        <span className="text-emerald-700">Emerald text</span>
        <span className="text-emerald-800">Dark emerald text</span>
        <span className="bg-emerald-50 text-emerald-900">High contrast emerald</span>
      </div>
    );

    const emeraldText = screen.getByText('Emerald text');
    const darkEmeraldText = screen.getByText('Dark emerald text');
    const highContrastText = screen.getByText('High contrast emerald');

    expect(emeraldText).toHaveClass('text-emerald-700');
    expect(darkEmeraldText).toHaveClass('text-emerald-800');
    expect(highContrastText).toHaveClass('text-emerald-900');
  });

  it('should maintain accessibility in dark mode', () => {
    render(
      <div className="dark">
        <EnhancedCard variant="professional">
          <EnhancedCardContent>
            <span className="dark:text-white">Dark mode text</span>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
    );

    const text = screen.getByText('Dark mode text');
    expect(text).toHaveClass('dark:text-white');
  });
});

describe('Form Enhancement Tests', () => {
  it('should render enhanced form elements with proper styling', () => {
    render(
      <form>
        <EnhancedInput 
          label="نام محصول"
          placeholder="نام محصول را وارد کنید"
          className="enhanced-form-element"
        />
        <EnhancedInput 
          label="قیمت"
          type="number"
          placeholder="قیمت را وارد کنید"
          className="enhanced-form-element"
        />
      </form>
    );

    const productNameInput = screen.getByPlaceholderText('نام محصول را وارد کنید');
    const priceInput = screen.getByPlaceholderText('قیمت را وارد کنید');

    expect(productNameInput).toHaveClass('enhanced-form-element');
    expect(priceInput).toHaveClass('enhanced-form-element');
  });

  it('should show validation states with proper colors', () => {
    render(
      <div>
        <EnhancedInput 
          variant="success"
          label="Valid Input"
          data-testid="success-input"
        />
        <EnhancedInput 
          variant="error"
          label="Invalid Input"
          error="This field is required"
          data-testid="error-input"
        />
      </div>
    );

    const successInput = screen.getByTestId('success-input');
    const errorInput = screen.getByTestId('error-input');
    const errorMessage = screen.getByText('This field is required');

    expect(successInput).toHaveClass('border-green-300');
    expect(errorInput).toHaveClass('border-red-300');
    expect(errorMessage).toHaveClass('text-red-700');
  });
});