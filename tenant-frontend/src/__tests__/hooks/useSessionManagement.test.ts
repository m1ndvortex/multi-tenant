import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSessionManagement } from '@/hooks/useSessionManagement';

// Mock dependencies
const mockLogout = vi.fn();
const mockToast = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    logout: mockLogout,
    isAuthenticated: true,
    token: 'mock-token',
  }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock timers
vi.useFakeTimers();

describe('useSessionManagement Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    
    // Mock Date.now
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('initializes with default timeout settings', () => {
    const { result } = renderHook(() => useSessionManagement());

    expect(result.current.timeRemaining).toBe(30); // 30 minutes default
    expect(result.current.showWarning).toBe(false);
  });

  it('accepts custom timeout options', () => {
    const { result } = renderHook(() => 
      useSessionManagement({
        timeoutMinutes: 60,
        warningMinutes: 10,
        checkIntervalSeconds: 30,
      })
    );

    expect(result.current.timeRemaining).toBe(60);
  });

  it('updates activity on user interaction', () => {
    const { result } = renderHook(() => useSessionManagement());

    // Simulate user activity
    act(() => {
      result.current.updateActivity();
    });

    expect(result.current.showWarning).toBe(false);
  });

  it('shows warning before timeout', () => {
    const { result } = renderHook(() => 
      useSessionManagement({
        timeoutMinutes: 10,
        warningMinutes: 5,
        checkIntervalSeconds: 1,
      })
    );

    // Fast forward to warning time (5 minutes before timeout)
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
    });

    expect(result.current.showWarning).toBe(true);
    expect(mockToast).toHaveBeenCalledWith({
      title: "هشدار انقضای جلسه",
      description: expect.stringContaining("جلسه شما در"),
      variant: "destructive",
    });
  });

  it('automatically logs out after timeout', () => {
    const { result } = renderHook(() => 
      useSessionManagement({
        timeoutMinutes: 10,
        warningMinutes: 5,
        checkIntervalSeconds: 1,
      })
    );

    // Fast forward past timeout
    act(() => {
      vi.advanceTimersByTime(11 * 60 * 1000); // 11 minutes
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: "جلسه منقضی شد",
      description: "به دلیل عدم فعالیت، از سیستم خارج شدید",
      variant: "destructive",
    });
  });

  it('extends session when requested', () => {
    const { result } = renderHook(() => 
      useSessionManagement({
        timeoutMinutes: 10,
        warningMinutes: 5,
        checkIntervalSeconds: 1,
      })
    );

    // Show warning first
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
    });

    expect(result.current.showWarning).toBe(true);

    // Extend session
    act(() => {
      result.current.extendSession();
    });

    expect(result.current.showWarning).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({
      title: "جلسه تمدید شد",
      description: "جلسه شما با موفقیت تمدید شد",
      variant: "default",
    });
  });

  it('tracks time remaining correctly', () => {
    const { result } = renderHook(() => 
      useSessionManagement({
        timeoutMinutes: 10,
        warningMinutes: 5,
        checkIntervalSeconds: 1,
      })
    );

    // Initially should be 10 minutes
    expect(result.current.timeRemaining).toBe(10);

    // After 3 minutes, should be 7 minutes remaining
    act(() => {
      vi.advanceTimersByTime(3 * 60 * 1000);
    });

    expect(result.current.timeRemaining).toBe(7);
  });

  it('handles unauthenticated state', () => {
    // Mock unauthenticated state
    vi.mocked(vi.importActual('@/contexts/AuthContext')).then(actual => {
      vi.mocked(actual.useAuth).mockReturnValue({
        logout: mockLogout,
        isAuthenticated: false,
        token: null,
      });
    });

    const { result } = renderHook(() => useSessionManagement());

    // Should not set up timers when not authenticated
    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('cleans up timers on unmount', () => {
    const { unmount } = renderHook(() => useSessionManagement());

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('listens to user activity events', () => {
    const { result } = renderHook(() => useSessionManagement());

    // Mock DOM events
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    // Check that event listeners are added
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), true);
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), true);
    expect(addEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any(Function), true);
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), true);
    expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);

    // Simulate user activity
    act(() => {
      const mouseEvent = new MouseEvent('mousedown');
      document.dispatchEvent(mouseEvent);
    });

    // Should reset warning state
    expect(result.current.showWarning).toBe(false);
  });

  it('prevents multiple warnings for same session', () => {
    const { result } = renderHook(() => 
      useSessionManagement({
        timeoutMinutes: 10,
        warningMinutes: 5,
        checkIntervalSeconds: 1,
      })
    );

    // Fast forward to warning time
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
    });

    expect(mockToast).toHaveBeenCalledTimes(1);

    // Continue time without user activity
    act(() => {
      vi.advanceTimersByTime(1 * 60 * 1000); // 1 more minute
    });

    // Should not show warning again
    expect(mockToast).toHaveBeenCalledTimes(1);
  });
});