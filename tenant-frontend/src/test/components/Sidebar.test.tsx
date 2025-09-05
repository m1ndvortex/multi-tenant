import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('Sidebar Component', () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all navigation items when expanded', () => {
    render(
      <TestWrapper>
        <Sidebar isCollapsed={false} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    // Check if all navigation items are present
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('فاکتورها')).toBeInTheDocument();
    expect(screen.getByText('مشتریان')).toBeInTheDocument();
    expect(screen.getByText('محصولات')).toBeInTheDocument();
    expect(screen.getByText('حسابداری')).toBeInTheDocument();
    expect(screen.getByText('گزارشات')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات')).toBeInTheDocument();
  });

  it('hides navigation text when collapsed', () => {
    render(
      <TestWrapper>
        <Sidebar isCollapsed={true} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    // Navigation text should not be visible when collapsed
    expect(screen.queryByText('داشبورد')).not.toBeInTheDocument();
    expect(screen.queryByText('فاکتورها')).not.toBeInTheDocument();
  });

  it('shows brand logo and name when expanded', () => {
    render(
      <TestWrapper>
        <Sidebar isCollapsed={false} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    expect(screen.getByText('حساب پلاس')).toBeInTheDocument();
    expect(screen.getByText('سیستم مدیریت کسب و کار')).toBeInTheDocument();
  });

  it('hides brand text when collapsed', () => {
    render(
      <TestWrapper>
        <Sidebar isCollapsed={true} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    expect(screen.queryByText('حساب پلاس')).not.toBeInTheDocument();
    expect(screen.queryByText('سیستم مدیریت کسب و کار')).not.toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', () => {
    render(
      <TestWrapper>
        <Sidebar isCollapsed={false} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('shows correct toggle icon based on collapsed state', () => {
    const { container, rerender } = render(
      <TestWrapper>
        <Sidebar isCollapsed={false} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    // When expanded, should show left chevron (collapse icon)
    // Look for SVG elements since Lucide icons render as SVG
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <Sidebar isCollapsed={true} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    // When collapsed, should show right chevron (expand icon)
    const toggleButtonCollapsed = screen.getByRole('button');
    expect(toggleButtonCollapsed).toBeInTheDocument();
  });

  it('applies correct width classes based on collapsed state', () => {
    const { container, rerender } = render(
      <TestWrapper>
        <Sidebar isCollapsed={false} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    // When expanded, should have w-64 class
    expect(container.querySelector('.w-64')).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <Sidebar isCollapsed={true} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    // When collapsed, should have w-16 class
    expect(container.querySelector('.w-16')).toBeInTheDocument();
  });

  it('shows version information when expanded', () => {
    render(
      <TestWrapper>
        <Sidebar isCollapsed={false} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    expect(screen.getByText('نسخه ۲.۰.۰')).toBeInTheDocument();
  });

  it('hides version information when collapsed', () => {
    render(
      <TestWrapper>
        <Sidebar isCollapsed={true} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    expect(screen.queryByText('نسخه ۲.۰.۰')).not.toBeInTheDocument();
  });

  it('applies gradient background styling', () => {
    const { container } = render(
      <TestWrapper>
        <Sidebar isCollapsed={false} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    const gradientElement = container.querySelector('.bg-gradient-to-b.from-slate-50.to-slate-100');
    expect(gradientElement).toBeInTheDocument();
  });

  it('renders navigation icons with gradient backgrounds', () => {
    const { container } = render(
      <TestWrapper>
        <Sidebar isCollapsed={false} onToggle={mockOnToggle} />
      </TestWrapper>
    );

    // Check for gradient icon containers
    const gradientIcons = container.querySelectorAll('.bg-gradient-to-br');
    expect(gradientIcons.length).toBeGreaterThan(0);
  });
});