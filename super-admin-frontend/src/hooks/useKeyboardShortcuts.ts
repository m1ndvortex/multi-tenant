import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    {
      key: '1',
      ctrlKey: true,
      action: () => navigate('/'),
      description: 'رفتن به داشبورد'
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => navigate('/tenants'),
      description: 'رفتن به مدیریت تنانت‌ها'
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => navigate('/subscriptions'),
      description: 'رفتن به مدیریت اشتراک‌ها'
    },
    {
      key: '4',
      ctrlKey: true,
      action: () => navigate('/analytics'),
      description: 'رفتن به آنالیتیکس'
    },
    {
      key: '5',
      ctrlKey: true,
      action: () => navigate('/system-health'),
      description: 'رفتن به سلامت سیستم'
    },
    {
      key: '6',
      ctrlKey: true,
      action: () => navigate('/backup-recovery'),
      description: 'رفتن به پشتیبان‌گیری'
    },
    {
      key: '7',
      ctrlKey: true,
      action: () => navigate('/impersonation'),
      description: 'رفتن به جایگزینی کاربر'
    },
    {
      key: '8',
      ctrlKey: true,
      action: () => navigate('/error-logging'),
      description: 'رفتن به مدیریت خطاها'
    },
    {
      key: '9',
      ctrlKey: true,
      action: () => navigate('/online-users'),
      description: 'رفتن به کاربران آنلاین'
    },
    {
      key: '/',
      ctrlKey: true,
      action: () => {
        // TODO: Implement global search
        console.log('Global search triggered');
      },
      description: 'جستجوی سراسری'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        // TODO: Implement command palette
        console.log('Command palette triggered');
      },
      description: 'باز کردن پالت دستورات'
    }
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchingShortcut = shortcuts.find(shortcut => {
        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.altKey === event.altKey &&
          !!shortcut.shiftKey === event.shiftKey
        );
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  return {
    shortcuts: shortcuts.map(({ action, ...shortcut }) => shortcut)
  };
};

export default useKeyboardShortcuts;