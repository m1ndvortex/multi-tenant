import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null),
  },
  writable: true,
})

// Mock all UI components that might be missing
vi.mock('@/components/ui/badge', () => ({
  Badge: vi.fn(({ children, variant, className, ...props }) => 
    React.createElement('span', { className: `badge ${variant} ${className}`, ...props }, children)
  )
}));

vi.mock('@/components/ui/label', () => ({
  Label: vi.fn(({ children, htmlFor, className, ...props }) => 
    React.createElement('label', { htmlFor, className, ...props }, children)
  )
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: vi.fn(({ className, ...props }) => 
    React.createElement('textarea', { className, ...props })
  )
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: vi.fn(({ children, open, onOpenChange }) => 
    open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null
  ),
  DialogContent: vi.fn(({ children, className }) => 
    React.createElement('div', { className, 'data-testid': 'dialog-content' }, children)
  ),
  DialogHeader: vi.fn(({ children }) => 
    React.createElement('div', { 'data-testid': 'dialog-header' }, children)
  ),
  DialogTitle: vi.fn(({ children }) => 
    React.createElement('h2', { 'data-testid': 'dialog-title' }, children)
  ),
  DialogFooter: vi.fn(({ children }) => 
    React.createElement('div', { 'data-testid': 'dialog-footer' }, children)
  )
}));

vi.mock('@/components/ui/pagination', () => ({
  default: vi.fn(({ currentPage, totalPages, onPageChange }) => 
    React.createElement('div', { 'data-testid': 'pagination' }, [
      React.createElement('button', { 
        key: 'prev',
        onClick: () => onPageChange(currentPage - 1), 
        disabled: currentPage === 1 
      }, 'Previous'),
      React.createElement('span', { key: 'info' }, `${currentPage} of ${totalPages}`),
      React.createElement('button', { 
        key: 'next',
        onClick: () => onPageChange(currentPage + 1), 
        disabled: currentPage === totalPages 
      }, 'Next')
    ])
  )
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn()
  })
}));

// Mock services
vi.mock('@/services/subscriptionService', () => ({
  subscriptionService: {
    getSubscriptionOverview: vi.fn(),
    getSubscriptionStats: vi.fn(),
    formatExpiryDate: vi.fn((date) => 'مدت زمان باقی مانده'),
    getSubscriptionStatusColor: vi.fn(() => 'text-green-600'),
    getSubscriptionTypeLabel: vi.fn((type) => type === 'pro' ? 'حرفه‌ای' : 'رایگان'),
    getSubscriptionStatusLabel: vi.fn((status) => status === 'active' ? 'فعال' : 'تعلیق'),
  }
}));

vi.mock('@/hooks/useTenants', () => ({
  useTenants: vi.fn(() => ({
    data: {
      tenants: [
        {
          id: '1',
          name: 'Test Tenant 1',
          email: 'tenant1@example.com',
          subscription_type: 'pro',
          status: 'active',
          is_active: true,
          subscription_expires_at: '2024-12-31T00:00:00Z',
        },
        {
          id: '2',
          name: 'Test Tenant 2',
          email: 'tenant2@example.com',
          subscription_type: 'free',
          status: 'active',
          is_active: true,
          subscription_expires_at: null,
        }
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
        itemsPerPage: 10
      }
    },
    isLoading: false,
    refetch: vi.fn()
  }))
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const MockIcon = ({ className, ...props }: any) => 
    React.createElement('svg', { className, 'data-testid': 'mock-icon', ...props });
  
  return {
    CreditCard: MockIcon,
    TrendingUp: MockIcon,
    AlertTriangle: MockIcon,
    CheckCircle: MockIcon,
    Clock: MockIcon,
    Users: MockIcon,
    DollarSign: MockIcon,
    Calendar: MockIcon,
    BarChart3: MockIcon,
    Building2: MockIcon,
    Plus: MockIcon,
    Search: MockIcon,
    Filter: MockIcon,
    RefreshCw: MockIcon,
    Infinity: MockIcon,
    Play: MockIcon,
    Pause: MockIcon,
    ArrowUpDown: MockIcon,
    Settings: MockIcon,
    History: MockIcon,
    Shield: MockIcon,
    User: MockIcon,
    FileText: MockIcon,
    Package: MockIcon
  };
});