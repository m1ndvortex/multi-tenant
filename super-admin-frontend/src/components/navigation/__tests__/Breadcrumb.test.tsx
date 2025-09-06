import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Breadcrumb from '../Breadcrumb';

const renderWithRouter = (component: React.ReactElement, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
};

describe('Breadcrumb', () => {
  it('renders home breadcrumb on root path', () => {
    renderWithRouter(<Breadcrumb />, ['/']);
    
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
  });

  it('renders correct breadcrumb for tenants page', () => {
    renderWithRouter(<Breadcrumb />, ['/tenants']);
    
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('مدیریت تنانت‌ها')).toBeInTheDocument();
  });

  it('renders correct breadcrumb for analytics page', () => {
    renderWithRouter(<Breadcrumb />, ['/analytics']);
    
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('آنالیتیکس')).toBeInTheDocument();
  });

  it('renders correct breadcrumb for system health page', () => {
    renderWithRouter(<Breadcrumb />, ['/system-health']);
    
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('سلامت سیستم')).toBeInTheDocument();
  });

  it('renders correct breadcrumb for backup recovery page', () => {
    renderWithRouter(<Breadcrumb />, ['/backup-recovery']);
    
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('پشتیبان‌گیری')).toBeInTheDocument();
  });

  it('renders correct breadcrumb for impersonation page', () => {
    renderWithRouter(<Breadcrumb />, ['/impersonation']);
    
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('جایگزینی کاربر')).toBeInTheDocument();
  });

  it('renders correct breadcrumb for error logging page', () => {
    renderWithRouter(<Breadcrumb />, ['/error-logging']);
    
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('مدیریت خطاها')).toBeInTheDocument();
  });

  it('renders home link as clickable when not on home page', () => {
    renderWithRouter(<Breadcrumb />, ['/tenants']);
    
    const homeLink = screen.getByRole('link', { name: /داشبورد/ });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders current page as non-clickable text', () => {
    renderWithRouter(<Breadcrumb />, ['/tenants']);
    
    const currentPage = screen.getByText('مدیریت تنانت‌ها');
    expect(currentPage).not.toHaveAttribute('href');
  });

  it('includes navigation arrows between breadcrumb items', () => {
    renderWithRouter(<Breadcrumb />, ['/tenants']);
    
    // Check for SVG arrow elements by their path content
    const arrows = document.querySelectorAll('svg path[d="M9 5l7 7-7 7"]');
    expect(arrows.length).toBeGreaterThan(0);
  });

  it('applies custom className when provided', () => {
    const { container } = renderWithRouter(<Breadcrumb className="custom-class" />, ['/']);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});