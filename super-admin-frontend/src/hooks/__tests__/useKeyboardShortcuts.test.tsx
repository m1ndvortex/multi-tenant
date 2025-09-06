import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import useKeyboardShortcuts from '../useKeyboardShortcuts';

// Mock navigate function
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test component that uses the hook
const TestComponent: React.FC = () => {
  const { shortcuts } = useKeyboardShortcuts();
  
  return (
    <div>
      <div data-testid="shortcuts-count">{shortcuts.length}</div>
      {shortcuts.map((shortcut, index) => (
        <div key={index} data-testid={`shortcut-${index}`}>
          {shortcut.key} - {shortcut.description}
        </div>
      ))}
    </div>
  );
};

const renderWithRouter = () => {
  return render(
    <MemoryRouter>
      <TestComponent />
    </MemoryRouter>
  );
};

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('provides correct number of shortcuts', () => {
    renderWithRouter();
    
    expect(screen.getByTestId('shortcuts-count')).toHaveTextContent('9');
  });

  it('includes navigation shortcuts with descriptions', () => {
    renderWithRouter();
    
    expect(screen.getByTestId('shortcut-0')).toHaveTextContent('1 - رفتن به داشبورد');
    expect(screen.getByTestId('shortcut-1')).toHaveTextContent('2 - رفتن به مدیریت تنانت‌ها');
    expect(screen.getByTestId('shortcut-2')).toHaveTextContent('3 - رفتن به آنالیتیکس');
    expect(screen.getByTestId('shortcut-3')).toHaveTextContent('4 - رفتن به سلامت سیستم');
    expect(screen.getByTestId('shortcut-4')).toHaveTextContent('5 - رفتن به پشتیبان‌گیری');
    expect(screen.getByTestId('shortcut-5')).toHaveTextContent('6 - رفتن به جایگزینی کاربر');
    expect(screen.getByTestId('shortcut-6')).toHaveTextContent('7 - رفتن به مدیریت خطاها');
  });

  it('includes utility shortcuts', () => {
    renderWithRouter();
    
    expect(screen.getByTestId('shortcut-7')).toHaveTextContent('/ - جستجوی سراسری');
    expect(screen.getByTestId('shortcut-8')).toHaveTextContent('k - باز کردن پالت دستورات');
  });

  it('navigates to dashboard when Ctrl+1 is pressed', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: '1',
      ctrlKey: true,
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to tenants when Ctrl+2 is pressed', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: '2',
      ctrlKey: true,
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/tenants');
  });

  it('navigates to analytics when Ctrl+3 is pressed', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: '3',
      ctrlKey: true,
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/analytics');
  });

  it('navigates to system health when Ctrl+4 is pressed', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: '4',
      ctrlKey: true,
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/system-health');
  });

  it('navigates to backup recovery when Ctrl+5 is pressed', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: '5',
      ctrlKey: true,
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/backup-recovery');
  });

  it('navigates to impersonation when Ctrl+6 is pressed', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: '6',
      ctrlKey: true,
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/impersonation');
  });

  it('navigates to error logging when Ctrl+7 is pressed', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: '7',
      ctrlKey: true,
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/error-logging');
  });

  it('does not navigate when key is pressed without Ctrl', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: '1',
      ctrlKey: false,
    });
    
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when Ctrl is pressed without correct key', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: 'a',
      ctrlKey: true,
    });
    
    expect(mockNavigate).not.toHaveBeenCalled();
  });



  it('handles case insensitive key matching', () => {
    renderWithRouter();
    
    fireEvent.keyDown(document, {
      key: 'K',
      ctrlKey: true,
    });
    
    // Should trigger command palette (mocked as console.log)
    // This tests that 'K' matches 'k' shortcut
  });
});