import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Settings from '@/pages/Settings';

// Mock the settings components
vi.mock('@/components/settings/TenantSettings', () => ({
  default: () => <div data-testid="tenant-settings">Tenant Settings Component</div>,
}));

vi.mock('@/components/settings/UserManagement', () => ({
  default: () => <div data-testid="user-management">User Management Component</div>,
}));

vi.mock('@/components/settings/GoldPriceManagement', () => ({
  default: () => <div data-testid="gold-price-management">Gold Price Management Component</div>,
}));

vi.mock('@/components/settings/SystemPreferences', () => ({
  default: () => <div data-testid="system-preferences">System Preferences Component</div>,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const SettingsWrapper = () => (
  <BrowserRouter>
    <Settings />
  </BrowserRouter>
);

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings page with header', () => {
    render(<SettingsWrapper />);

    expect(screen.getByText('تنظیمات')).toBeInTheDocument();
    expect(screen.getByText('مدیریت تنظیمات سیستم و حساب کاربری')).toBeInTheDocument();
  });

  it('should render all tab triggers', () => {
    render(<SettingsWrapper />);

    expect(screen.getByText('اطلاعات کسب‌وکار')).toBeInTheDocument();
    expect(screen.getByText('مدیریت کاربران')).toBeInTheDocument();
    expect(screen.getByText('قیمت طلا')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات سیستم')).toBeInTheDocument();
    expect(screen.getByText('سایر تنظیمات')).toBeInTheDocument();
  });

  it('should show business settings tab by default', () => {
    render(<SettingsWrapper />);

    expect(screen.getByTestId('tenant-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('user-management')).not.toBeInTheDocument();
  });

  it('should switch to user management tab', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    const userManagementTab = screen.getByText('مدیریت کاربران');
    await user.click(userManagementTab);

    expect(screen.getByTestId('user-management')).toBeInTheDocument();
    expect(screen.queryByTestId('tenant-settings')).not.toBeInTheDocument();
  });

  it('should switch to gold price tab', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    const goldPriceTab = screen.getByText('قیمت طلا');
    await user.click(goldPriceTab);

    expect(screen.getByTestId('gold-price-management')).toBeInTheDocument();
    expect(screen.queryByTestId('tenant-settings')).not.toBeInTheDocument();
  });

  it('should switch to system preferences tab', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    const preferencesTab = screen.getByText('تنظیمات سیستم');
    await user.click(preferencesTab);

    expect(screen.getByTestId('system-preferences')).toBeInTheDocument();
    expect(screen.queryByTestId('tenant-settings')).not.toBeInTheDocument();
  });

  it('should switch to external settings tab', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    const externalTab = screen.getByText('سایر تنظیمات');
    await user.click(externalTab);

    expect(screen.getByText('پشتیبان‌گیری و خروجی داده‌ها')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات اعلان‌ها')).toBeInTheDocument();
    expect(screen.getByText('امنیت و حریم خصوصی')).toBeInTheDocument();
  });

  it('should navigate to backup page from external settings', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    // Switch to external settings tab
    const externalTab = screen.getByText('سایر تنظیمات');
    await user.click(externalTab);

    // Click backup management button
    const backupButtons = screen.getAllByText('مدیریت');
    const backupButton = backupButtons[0]; // First management button should be backup
    await user.click(backupButton);

    expect(mockNavigate).toHaveBeenCalledWith('/backup');
  });

  it('should navigate to notifications page from external settings', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    // Switch to external settings tab
    const externalTab = screen.getByText('سایر تنظیمات');
    await user.click(externalTab);

    // Click notifications management button
    const managementButtons = screen.getAllByText('مدیریت');
    const notificationsButton = managementButtons[1]; // Second management button should be notifications
    await user.click(notificationsButton);

    expect(mockNavigate).toHaveBeenCalledWith('/notifications');
  });

  it('should display security settings as coming soon', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    // Switch to external settings tab
    const externalTab = screen.getByText('سایر تنظیمات');
    await user.click(externalTab);

    expect(screen.getByText('به زودی...')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات امنیتی در نسخه‌های آینده اضافه خواهد شد')).toBeInTheDocument();
  });

  it('should have proper tab styling', () => {
    render(<SettingsWrapper />);

    // Check that tabs container has gradient background
    const tabsContainer = screen.getByRole('tablist').parentElement;
    expect(tabsContainer).toHaveClass('bg-gradient-to-r', 'from-green-50', 'via-teal-50', 'to-blue-50');
  });

  it('should display icons in tab triggers', () => {
    render(<SettingsWrapper />);

    // Check that icons are present in tabs (they should be SVG elements)
    const icons = screen.container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(5); // At least one icon per tab plus header icon
  });

  it('should maintain tab state when switching', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    // Switch to user management
    const userManagementTab = screen.getByText('مدیریت کاربران');
    await user.click(userManagementTab);
    expect(screen.getByTestId('user-management')).toBeInTheDocument();

    // Switch to gold price
    const goldPriceTab = screen.getByText('قیمت طلا');
    await user.click(goldPriceTab);
    expect(screen.getByTestId('gold-price-management')).toBeInTheDocument();

    // Switch back to business settings
    const businessTab = screen.getByText('اطلاعات کسب‌وکار');
    await user.click(businessTab);
    expect(screen.getByTestId('tenant-settings')).toBeInTheDocument();
  });

  it('should have responsive tab layout', () => {
    render(<SettingsWrapper />);

    const tabsList = screen.getByRole('tablist');
    expect(tabsList).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-5');
  });

  it('should display proper card variants in external settings', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    // Switch to external settings tab
    const externalTab = screen.getByText('سایر تنظیمات');
    await user.click(externalTab);

    // Check that cards have proper styling classes
    const cards = screen.container.querySelectorAll('[class*="gradient"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<SettingsWrapper />);

    // Tab to the first tab trigger
    await user.tab();
    
    // Use arrow keys to navigate between tabs
    await user.keyboard('{ArrowRight}');
    
    // Should focus on the next tab
    const userManagementTab = screen.getByText('مدیریت کاربران');
    expect(userManagementTab).toHaveFocus();
  });
});