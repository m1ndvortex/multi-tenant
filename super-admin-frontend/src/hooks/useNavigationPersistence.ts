import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationState {
  lastVisitedRoute: string;
  routeHistory: string[];
  sidebarCollapsed: boolean;
  preferences: {
    defaultRoute: string;
    rememberLastRoute: boolean;
  };
}

const STORAGE_KEY = 'hesaabplus_navigation_state';
const MAX_HISTORY_LENGTH = 10;

const useNavigationPersistence = () => {
  const location = useLocation();
  const [navigationState, setNavigationState] = useState<NavigationState>(() => {
    // Load from localStorage on initialization
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load navigation state from localStorage:', error);
    }
    
    // Default state
    return {
      lastVisitedRoute: '/',
      routeHistory: ['/'],
      sidebarCollapsed: false,
      preferences: {
        defaultRoute: '/',
        rememberLastRoute: true
      }
    };
  });

  // Save to localStorage whenever state changes
  const saveNavigationState = (newState: NavigationState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setNavigationState(newState);
    } catch (error) {
      console.warn('Failed to save navigation state to localStorage:', error);
    }
  };

  // Update route history when location changes
  useEffect(() => {
    const currentPath = location.pathname;
    
    setNavigationState(prevState => {
      const newHistory = [currentPath, ...prevState.routeHistory.filter(path => path !== currentPath)]
        .slice(0, MAX_HISTORY_LENGTH);
      
      const newState = {
        ...prevState,
        lastVisitedRoute: currentPath,
        routeHistory: newHistory
      };
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (error) {
        console.warn('Failed to save navigation state:', error);
      }
      
      return newState;
    });
  }, [location.pathname]);

  const updateSidebarState = (collapsed: boolean) => {
    const newState = {
      ...navigationState,
      sidebarCollapsed: collapsed
    };
    saveNavigationState(newState);
  };

  const updatePreferences = (preferences: Partial<NavigationState['preferences']>) => {
    const newState = {
      ...navigationState,
      preferences: {
        ...navigationState.preferences,
        ...preferences
      }
    };
    saveNavigationState(newState);
  };

  const getLastVisitedRoute = (): string => {
    if (navigationState.preferences.rememberLastRoute) {
      return navigationState.lastVisitedRoute;
    }
    return navigationState.preferences.defaultRoute;
  };

  const getRouteHistory = (): string[] => {
    return navigationState.routeHistory;
  };

  const clearHistory = () => {
    const newState = {
      ...navigationState,
      routeHistory: [location.pathname],
      lastVisitedRoute: location.pathname
    };
    saveNavigationState(newState);
  };

  const isRouteInHistory = (path: string): boolean => {
    return navigationState.routeHistory.includes(path);
  };

  const getRecentRoutes = (limit: number = 5): string[] => {
    return navigationState.routeHistory.slice(0, limit);
  };

  return {
    navigationState,
    updateSidebarState,
    updatePreferences,
    getLastVisitedRoute,
    getRouteHistory,
    clearHistory,
    isRouteInHistory,
    getRecentRoutes
  };
};

export default useNavigationPersistence;