import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { cyberTheme, generateCyberThemeCSS, rtlConfig, type CyberTheme, type RTLConfiguration } from '../lib/theme/cybersecurity';

type Theme = 'light' | 'dark' | 'cyber' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark' | 'cyber';
  setCyberTheme: () => void;
  isRTL: boolean;
  toggleRTL: () => void;
  cyberThemeConfig: CyberTheme;
  rtlConfiguration: RTLConfiguration;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('super-admin-theme') as Theme;
    return stored || 'cyber'; // Default to cybersecurity theme
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark' | 'cyber'>('cyber');
  const [isRTL, setIsRTL] = useState<boolean>(() => {
    const stored = localStorage.getItem('super-admin-rtl');
    return stored ? stored === 'true' : true; // Default to RTL for Persian
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const body = document.body;
    
    const updateTheme = () => {
      let newTheme: 'light' | 'dark' | 'cyber' = 'cyber';
      
      if (theme === 'system') {
        newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else if (theme === 'cyber') {
        newTheme = 'cyber';
      } else {
        newTheme = theme as 'light' | 'dark';
      }
      
      setActualTheme(newTheme);
      
      // Remove all theme classes
      root.classList.remove('light', 'dark', 'cyber-theme');
      body.classList.remove('light', 'dark', 'cyber-theme');
      
      // Add appropriate theme class
      if (newTheme === 'cyber') {
        root.classList.add('cyber-theme');
        body.classList.add('cyber-theme');
        injectCyberThemeCSS();
      } else {
        root.classList.add(newTheme);
        body.classList.add(newTheme);
      }
    };

    updateTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [theme]);

  useEffect(() => {
    // Apply RTL settings
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('rtl', isRTL);
    localStorage.setItem('super-admin-rtl', isRTL.toString());
  }, [isRTL]);

  const injectCyberThemeCSS = () => {
    const existingStyle = document.getElementById('cyber-theme-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'cyber-theme-styles';
    style.textContent = generateCyberThemeCSS(cyberTheme);
    document.head.appendChild(style);
  };

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('super-admin-theme', newTheme);
  };

  const setCyberTheme = () => {
    handleSetTheme('cyber');
  };

  const toggleRTL = () => {
    setIsRTL(prev => !prev);
  };

  const value: ThemeContextType = {
    theme,
    setTheme: handleSetTheme,
    actualTheme,
    setCyberTheme,
    isRTL,
    toggleRTL,
    cyberThemeConfig: cyberTheme,
    rtlConfiguration: rtlConfig,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};