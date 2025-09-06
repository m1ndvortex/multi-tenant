import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserProfileDropdown from '../UserProfileDropdown';

// Mock console.log to test menu actions
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('UserProfileDropdown', () => {
  afterEach(() => {
    mockConsoleLog.mockClear();
  });

  it('renders user profile button with correct information', () => {
    render(<UserProfileDropdown />);
    
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@hesaabplus.com')).toBeInTheDocument();
  });

  it('shows dropdown menu when clicked', async () => {
    render(<UserProfileDropdown />);
    
    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      expect(screen.getByText('تنظیمات پروفایل')).toBeInTheDocument();
      expect(screen.getByText('تنظیمات سیستم')).toBeInTheDocument();
      expect(screen.getByText('راهنما و پشتیبانی')).toBeInTheDocument();
      expect(screen.getByText('خروج از سیستم')).toBeInTheDocument();
    });
  });

  it('hides dropdown menu when clicked outside', async () => {
    render(<UserProfileDropdown />);
    
    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      expect(screen.getByText('تنظیمات پروفایل')).toBeInTheDocument();
    });
    
    // Click outside
    fireEvent.mouseDown(document.body);
    
    await waitFor(() => {
      expect(screen.queryByText('تنظیمات پروفایل')).not.toBeInTheDocument();
    });
  });

  it('calls profile settings action when clicked', async () => {
    render(<UserProfileDropdown />);
    
    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      const profileSettingsButton = screen.getByText('تنظیمات پروفایل');
      fireEvent.click(profileSettingsButton);
    });
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Profile settings clicked');
  });

  it('calls system settings action when clicked', async () => {
    render(<UserProfileDropdown />);
    
    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      const systemSettingsButton = screen.getByText('تنظیمات سیستم');
      fireEvent.click(systemSettingsButton);
    });
    
    expect(mockConsoleLog).toHaveBeenCalledWith('System settings clicked');
  });

  it('calls help action when clicked', async () => {
    render(<UserProfileDropdown />);
    
    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      const helpButton = screen.getByText('راهنما و پشتیبانی');
      fireEvent.click(helpButton);
    });
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Help clicked');
  });

  it('calls logout action when clicked', async () => {
    render(<UserProfileDropdown />);
    
    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      const logoutButton = screen.getByText('خروج از سیستم');
      fireEvent.click(logoutButton);
    });
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Logout clicked');
  });

  it('shows online status indicator', async () => {
    render(<UserProfileDropdown />);
    
    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      expect(screen.getByText('آنلاین')).toBeInTheDocument();
    });
  });

  it('rotates arrow icon when dropdown is open', () => {
    render(<UserProfileDropdown />);
    
    const profileButton = screen.getByRole('button');
    
    // Initially should not have rotate-180 class
    expect(profileButton.innerHTML).not.toContain('rotate-180');
    
    fireEvent.click(profileButton);
    
    // After clicking, should have rotate-180 class
    expect(profileButton.innerHTML).toContain('rotate-180');
  });

  it('applies custom className when provided', () => {
    const { container } = render(<UserProfileDropdown className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});