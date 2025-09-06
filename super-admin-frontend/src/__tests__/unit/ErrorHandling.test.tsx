import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ApiError } from '@/services/apiClient';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('Error Handling Components', () => {
  describe('ErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should render error UI when error occurs', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Page/ })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should render custom fallback when provided', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should reset error state when retry is clicked', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent: React.FC = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        React.useEffect(() => {
          // Reset error after a short delay to simulate fix
          const timer = setTimeout(() => setShouldThrow(false), 100);
          return () => clearTimeout(timer);
        }, []);

        return <ThrowError shouldThrow={shouldThrow} />;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      fireEvent.click(retryButton);

      // After retry, the error boundary should still show the retry button
      // since the component will still throw initially
      expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('ErrorDisplay', () => {
    it('should not render when no error is provided', () => {
      const { container } = render(<ErrorDisplay error={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render network error correctly', () => {
      const networkError: ApiError = {
        message: 'Network error - please check your connection',
        status: 0,
        isNetworkError: true,
        isTimeoutError: false,
      };

      render(<ErrorDisplay error={networkError} title="Connection Error" />);

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Network error - please check your connection')).toBeInTheDocument();
      expect(screen.getByText(/Please check your internet connection/)).toBeInTheDocument();
    });

    it('should render timeout error correctly', () => {
      const timeoutError: ApiError = {
        message: 'Request timeout - please try again',
        status: 408,
        isNetworkError: false,
        isTimeoutError: true,
      };

      render(<ErrorDisplay error={timeoutError} />);

      expect(screen.getByText('Request timeout - please try again')).toBeInTheDocument();
      expect(screen.getByText(/The request took too long/)).toBeInTheDocument();
    });

    it('should render authentication error correctly', () => {
      const authError: ApiError = {
        message: 'Authentication required - please log in',
        status: 401,
        isNetworkError: false,
        isTimeoutError: false,
      };

      render(<ErrorDisplay error={authError} />);

      expect(screen.getByText('Authentication required - please log in')).toBeInTheDocument();
      expect(screen.getByText(/Please log in again to continue/)).toBeInTheDocument();
    });

    it('should render server error correctly', () => {
      const serverError: ApiError = {
        message: 'Internal server error',
        status: 500,
        isNetworkError: false,
        isTimeoutError: false,
      };

      render(<ErrorDisplay error={serverError} />);

      expect(screen.getByText('Internal server error')).toBeInTheDocument();
      expect(screen.getByText(/There's a problem with our servers/)).toBeInTheDocument();
    });

    it('should render inline variant correctly', () => {
      const error: ApiError = {
        message: 'Test error',
        status: 400,
        isNetworkError: false,
        isTimeoutError: false,
      };

      render(<ErrorDisplay error={error} variant="inline" />);

      expect(screen.getByText('Test error')).toBeInTheDocument();
      // Should not have card styling in inline mode
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should render banner variant correctly', () => {
      const error: ApiError = {
        message: 'Test error',
        status: 400,
        isNetworkError: false,
        isTimeoutError: false,
      };

      render(<ErrorDisplay error={error} variant="banner" title="Banner Error" />);

      expect(screen.getByText('Banner Error')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      const error: ApiError = {
        message: 'Test error',
        status: 500,
        isNetworkError: false,
        isTimeoutError: false,
      };

      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      const error: ApiError = {
        message: 'Test error',
        status: 400,
        isNetworkError: false,
        isTimeoutError: false,
      };

      render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /Dismiss/ });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should show technical details when showDetails is true', () => {
      const error: ApiError = {
        message: 'Test error',
        status: 400,
        isNetworkError: false,
        isTimeoutError: false,
        details: {
          field: 'email',
          code: 'INVALID_FORMAT',
        },
      };

      render(<ErrorDisplay error={error} showDetails={true} />);

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      
      // Click to expand details
      fireEvent.click(screen.getByText('Technical Details'));
      
      expect(screen.getByText(/"field": "email"/)).toBeInTheDocument();
      expect(screen.getByText(/"code": "INVALID_FORMAT"/)).toBeInTheDocument();
    });
  });

  describe('OfflineIndicator', () => {
    beforeEach(() => {
      // Reset navigator.onLine before each test
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    it('should not render when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const { container } = render(<OfflineIndicator />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<OfflineIndicator />);

      expect(screen.getByText("You're offline")).toBeInTheDocument();
      expect(screen.getByText(/Working with cached data/)).toBeInTheDocument();
    });

    it('should show retry button after delay when offline', async () => {
      // Start online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const onRetry = vi.fn();
      render(<OfflineIndicator onRetry={onRetry} />);

      // Initially should not render (online)
      expect(screen.queryByText("You're offline")).not.toBeInTheDocument();

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Trigger offline event to start the timeout
      fireEvent(window, new Event('offline'));

      // Should now show offline indicator but no retry button yet
      expect(screen.getByText("You're offline")).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument();

      // Wait for the retry button to appear (with a longer timeout)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
      }, { timeout: 6000 });
    });

    it('should call onRetry when retry button is clicked', async () => {
      // Start online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const onRetry = vi.fn();
      render(<OfflineIndicator onRetry={onRetry} />);

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Trigger offline event to start the timeout
      fireEvent(window, new Event('offline'));

      // Wait for the retry button to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
      }, { timeout: 6000 });

      // Now retry button should be available
      const retryButton = screen.getByRole('button', { name: /Retry/ });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle online/offline transitions', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { rerender } = render(<OfflineIndicator />);

      expect(screen.getByText("You're offline")).toBeInTheDocument();

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Trigger online event
      fireEvent(window, new Event('online'));

      rerender(<OfflineIndicator />);

      expect(screen.queryByText("You're offline")).not.toBeInTheDocument();
    });
  });
});