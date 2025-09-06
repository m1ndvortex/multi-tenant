import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SystemStatusIndicator from '../SystemStatusIndicator';

const mockSystemHealthHealthy = {
  cpu_usage: 45,
  memory_usage: 60,
  database_status: 'healthy' as const,
  redis_status: 'healthy' as const,
  celery_status: 'healthy' as const,
};

const mockSystemHealthWarning = {
  cpu_usage: 75,
  memory_usage: 85,
  database_status: 'healthy' as const,
  redis_status: 'warning' as const,
  celery_status: 'healthy' as const,
};

const mockSystemHealthError = {
  cpu_usage: 95,
  memory_usage: 90,
  database_status: 'error' as const,
  redis_status: 'healthy' as const,
  celery_status: 'healthy' as const,
};

describe('SystemStatusIndicator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when no system health data provided', () => {
    render(<SystemStatusIndicator />);

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
    
    // Should show gray pulsing indicator
    const loadingIndicator = document.querySelector('.bg-gray-400.animate-pulse');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('renders healthy system status correctly', () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    expect(screen.getByText('سیستم سالم')).toBeInTheDocument();
    
    // Should show green status
    const healthyButton = screen.getByRole('button');
    expect(healthyButton).toHaveClass('text-green-600', 'bg-green-100');
  });

  it('renders warning system status correctly', () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthWarning} />);

    expect(screen.getByText('سیستم هشدار')).toBeInTheDocument();
    
    // Should show yellow status
    const warningButton = screen.getByRole('button');
    expect(warningButton).toHaveClass('text-yellow-600', 'bg-yellow-100');
  });

  it('renders error system status correctly', () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthError} />);

    expect(screen.getByText('سیستم خطا')).toBeInTheDocument();
    
    // Should show red status
    const errorButton = screen.getByRole('button');
    expect(errorButton).toHaveClass('text-red-600', 'bg-red-100');
  });

  it('expands and shows detailed information when clicked', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      expect(screen.getByText('جزئیات وضعیت سیستم')).toBeInTheDocument();
      expect(screen.getByText('استفاده از CPU')).toBeInTheDocument();
      expect(screen.getByText('استفاده از حافظه')).toBeInTheDocument();
      expect(screen.getByText('وضعیت سرویس‌ها')).toBeInTheDocument();
    });
  });

  it('displays CPU usage correctly', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    // Check progress bar color (should be green for 45%)
    const cpuProgressBar = document.querySelector('.bg-green-500');
    expect(cpuProgressBar).toBeInTheDocument();
  });

  it('displays memory usage correctly', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  it('shows correct progress bar colors for high usage', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthError} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      // CPU usage 95% should show red
      const redProgressBars = document.querySelectorAll('.bg-red-500');
      expect(redProgressBars.length).toBeGreaterThan(0);
    });
  });

  it('shows correct progress bar colors for medium usage', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthWarning} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      // CPU usage 75% should show yellow
      const yellowProgressBars = document.querySelectorAll('.bg-yellow-500');
      expect(yellowProgressBars.length).toBeGreaterThan(0);
    });
  });

  it('displays service statuses correctly', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthWarning} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      expect(screen.getByText('دیتابیس')).toBeInTheDocument();
      expect(screen.getByText('Redis')).toBeInTheDocument();
      expect(screen.getByText('Celery')).toBeInTheDocument();
      
      // Should show mixed statuses
      expect(screen.getAllByText('سالم')).toHaveLength(2); // database and celery
      expect(screen.getByText('هشدار')).toBeInTheDocument(); // redis
    });
  });

  it('shows correct service status colors', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthError} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      // Should have red status for database error
      const errorStatus = document.querySelector('.text-red-600.bg-red-100');
      expect(errorStatus).toBeInTheDocument();
      
      // Should have green statuses for healthy services
      const healthyStatuses = document.querySelectorAll('.text-green-600.bg-green-100');
      expect(healthyStatuses.length).toBeGreaterThan(0);
    });
  });

  it('displays last updated timestamp', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      expect(screen.getByText(/آخرین بروزرسانی:/)).toBeInTheDocument();
    });
  });

  it('collapses when clicked again', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    const statusButton = screen.getByRole('button');
    
    // Expand
    fireEvent.click(statusButton);
    await waitFor(() => {
      expect(screen.getByText('جزئیات وضعیت سیستم')).toBeInTheDocument();
    });

    // Collapse
    fireEvent.click(statusButton);
    await waitFor(() => {
      expect(screen.queryByText('جزئیات وضعیت سیستم')).not.toBeInTheDocument();
    });
  });

  it('shows correct arrow rotation when expanded', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    const statusButton = screen.getByRole('button');
    const arrows = statusButton.querySelectorAll('svg');
    const dropdownArrow = arrows[arrows.length - 1]; // Last SVG is the dropdown arrow
    
    // Initially not rotated
    expect(dropdownArrow).not.toHaveClass('rotate-180');
    
    // Click to expand
    fireEvent.click(statusButton);
    
    await waitFor(() => {
      expect(dropdownArrow).toHaveClass('rotate-180');
    });
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <SystemStatusIndicator 
        systemHealth={mockSystemHealthHealthy} 
        className="custom-class" 
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    const statusButton = screen.getByRole('button');
    expect(statusButton).toHaveAttribute('title', 'وضعیت سیستم');
  });

  it('handles overall status calculation correctly', () => {
    // Test error priority
    render(<SystemStatusIndicator systemHealth={mockSystemHealthError} />);
    expect(screen.getByText('سیستم خطا')).toBeInTheDocument();
  });

  it('shows correct icons for different statuses', () => {
    const { rerender } = render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);
    
    // Healthy should show checkmark icon
    let statusButton = screen.getByRole('button');
    let icon = statusButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
    
    // Warning should show warning icon
    rerender(<SystemStatusIndicator systemHealth={mockSystemHealthWarning} />);
    statusButton = screen.getByRole('button');
    icon = statusButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
    
    // Error should show error icon
    rerender(<SystemStatusIndicator systemHealth={mockSystemHealthError} />);
    statusButton = screen.getByRole('button');
    icon = statusButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders progress bars with correct widths', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      const progressBars = document.querySelectorAll('[style*="width: 45%"], [style*="width: 60%"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  it('maintains proper z-index for dropdown', async () => {
    render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      const dropdown = document.querySelector('.z-50');
      expect(dropdown).toBeInTheDocument();
    });
  });

  it('uses gradient design system correctly', () => {
    const { container } = render(<SystemStatusIndicator systemHealth={mockSystemHealthHealthy} />);

    // Should have transition classes
    const transitionElements = container.querySelectorAll('.transition-all');
    expect(transitionElements.length).toBeGreaterThan(0);
  });
});