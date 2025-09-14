/**
 * Reduced Motion Support System
 * Provides accessibility-compliant animation controls and alternatives
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Variants } from 'framer-motion';
// Removed unused import: performanceMonitor

/**
 * Reduced Motion Configuration
 */
interface ReducedMotionConfig {
  enabled: boolean;
  respectSystemPreference: boolean;
  allowEssentialAnimations: boolean;
  alternativeIndicators: boolean;
  transitionDuration: number;
  customPreferences: {
    allowHoverEffects: boolean;
    allowFadeTransitions: boolean;
    allowScaleTransitions: boolean;
    allowColorTransitions: boolean;
    allowPositionTransitions: boolean;
  };
}

/**
 * Default Reduced Motion Configuration
 */
const defaultReducedMotionConfig: ReducedMotionConfig = {
  enabled: false,
  respectSystemPreference: true,
  allowEssentialAnimations: true,
  alternativeIndicators: true,
  transitionDuration: 0.1, // Very short transitions
  customPreferences: {
    allowHoverEffects: true,
    allowFadeTransitions: true,
    allowScaleTransitions: false,
    allowColorTransitions: true,
    allowPositionTransitions: false,
  },
};

/**
 * Reduced Motion Manager
 */
class ReducedMotionManager {
  private config: ReducedMotionConfig = { ...defaultReducedMotionConfig };
  private mediaQuery: MediaQueryList | null = null;
  private listeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    this.initializeMediaQuery();
    this.loadUserPreferences();
  }

  /**
   * Initialize Media Query for System Preference
   */
  private initializeMediaQuery() {
    if (typeof window !== 'undefined') {
      try {
        this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.updateFromSystemPreference();
        
        // Listen for changes in system preference
        this.mediaQuery.addEventListener('change', this.handleMediaQueryChange.bind(this));
      } catch (error) {
        console.warn('Reduced motion media query not supported:', error);
      }
    }
  }

  /**
   * Handle Media Query Changes
   */
  private handleMediaQueryChange(_event: MediaQueryListEvent) {
    if (this.config.respectSystemPreference) {
      this.updateFromSystemPreference();
    }
  }

  /**
   * Update Configuration from System Preference
   */
  private updateFromSystemPreference() {
    if (this.mediaQuery && this.config.respectSystemPreference) {
      const wasEnabled = this.config.enabled;
      this.config.enabled = this.mediaQuery.matches;
      
      if (wasEnabled !== this.config.enabled) {
        this.notifyListeners();
        console.log(`Reduced motion ${this.config.enabled ? 'enabled' : 'disabled'} by system preference`);
      }
    }
  }

  /**
   * Load User Preferences from Storage
   */
  private loadUserPreferences() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('reducedMotionConfig');
        if (stored) {
          const userConfig = JSON.parse(stored);
          this.config = { ...this.config, ...userConfig };
        }
      } catch (error) {
        console.warn('Failed to load reduced motion preferences:', error);
      }
    }
  }

  /**
   * Save User Preferences to Storage
   */
  private saveUserPreferences() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('reducedMotionConfig', JSON.stringify(this.config));
      } catch (error) {
        console.warn('Failed to save reduced motion preferences:', error);
      }
    }
  }

  /**
   * Update Configuration
   */
  public updateConfig(updates: Partial<ReducedMotionConfig>) {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...updates };
    
    if (wasEnabled !== this.config.enabled) {
      this.notifyListeners();
    }
    
    this.saveUserPreferences();
  }

  /**
   * Get Current Configuration
   */
  public getConfig(): ReducedMotionConfig {
    return { ...this.config };
  }

  /**
   * Check if Reduced Motion is Enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if Animation Type is Allowed
   */
  public isAnimationAllowed(type: keyof ReducedMotionConfig['customPreferences']): boolean {
    if (!this.config.enabled) return true;
    return this.config.customPreferences[type];
  }

  /**
   * Get Reduced Motion Variants
   */
  public getReducedVariants(originalVariants: Variants): Variants {
    if (!this.config.enabled) return originalVariants;

    const reducedVariants: Variants = {};

    for (const [key, variant] of Object.entries(originalVariants)) {
      if (typeof variant === 'object' && variant !== null) {
        reducedVariants[key] = this.reduceVariant(variant);
      } else {
        reducedVariants[key] = variant;
      }
    }

    return reducedVariants;
  }

  /**
   * Reduce Individual Variant
   */
  private reduceVariant(variant: any): any {
    const reduced = { ...variant };

    // Remove or reduce position animations
    if (!this.config.customPreferences.allowPositionTransitions) {
      delete reduced.x;
      delete reduced.y;
      delete reduced.translateX;
      delete reduced.translateY;
    }

    // Remove or reduce scale animations
    if (!this.config.customPreferences.allowScaleTransitions) {
      delete reduced.scale;
      delete reduced.scaleX;
      delete reduced.scaleY;
    }

    // Keep fade transitions if allowed
    if (!this.config.customPreferences.allowFadeTransitions) {
      delete reduced.opacity;
    }

    // Keep color transitions if allowed
    if (!this.config.customPreferences.allowColorTransitions) {
      delete reduced.backgroundColor;
      delete reduced.borderColor;
      delete reduced.color;
    }

    // Reduce transition duration
    if (reduced.transition) {
      reduced.transition = {
        ...reduced.transition,
        duration: this.config.transitionDuration,
        type: 'tween',
        ease: 'linear',
      };
    }

    return reduced;
  }

  /**
   * Get Alternative Indicators for Animations
   */
  public getAlternativeIndicators(): {
    loadingIndicator: string;
    successIndicator: string;
    errorIndicator: string;
    activeIndicator: string;
  } {
    return {
      loadingIndicator: '⏳', // Hourglass emoji
      successIndicator: '✅', // Check mark
      errorIndicator: '❌', // Cross mark
      activeIndicator: '▶️', // Play button
    };
  }

  /**
   * Create Accessible Animation Variants
   */
  public createAccessibleVariants(baseVariants: Variants): {
    standard: Variants;
    reduced: Variants;
    alternative: Variants;
  } {
    return {
      standard: baseVariants,
      reduced: this.getReducedVariants(baseVariants),
      alternative: this.createAlternativeVariants(baseVariants),
    };
  }

  /**
   * Create Alternative Variants (No Animation)
   */
  private createAlternativeVariants(baseVariants: Variants): Variants {
    const alternative: Variants = {};

    for (const [key, variant] of Object.entries(baseVariants)) {
      if (typeof variant === 'object' && variant !== null) {
        // Keep only the final state without transitions
        alternative[key] = {
          ...variant,
          transition: { duration: 0 },
        };
      } else {
        alternative[key] = variant;
      }
    }

    return alternative;
  }

  /**
   * Add Change Listener
   */
  public addListener(callback: (enabled: boolean) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify Listeners
   */
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.config.enabled));
  }

  /**
   * Cleanup Resources
   */
  public cleanup() {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.handleMediaQueryChange.bind(this));
    }
    this.listeners.clear();
  }
}

// Global reduced motion manager instance
export const reducedMotionManager = new ReducedMotionManager();

/**
 * React Hook for Reduced Motion
 */
export const useReducedMotion = () => {
  const [isEnabled, setIsEnabled] = useState(reducedMotionManager.isEnabled());
  const [config, setConfig] = useState(reducedMotionManager.getConfig());

  useEffect(() => {
    const unsubscribe = reducedMotionManager.addListener((enabled) => {
      setIsEnabled(enabled);
      setConfig(reducedMotionManager.getConfig());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateConfig = useCallback((updates: Partial<ReducedMotionConfig>) => {
    reducedMotionManager.updateConfig(updates);
  }, []);

  const getVariants = useCallback((originalVariants: Variants) => {
    return reducedMotionManager.getReducedVariants(originalVariants);
  }, []);

  const isAnimationAllowed = useCallback((type: keyof ReducedMotionConfig['customPreferences']) => {
    return reducedMotionManager.isAnimationAllowed(type);
  }, []);

  return {
    isEnabled,
    config,
    updateConfig,
    getVariants,
    isAnimationAllowed,
    alternativeIndicators: reducedMotionManager.getAlternativeIndicators(),
  };
};

/**
 * Higher-Order Component for Reduced Motion Support
 */
export const withReducedMotion = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P & { variants?: Variants }) => {
    const { getVariants } = useReducedMotion();
    
    const processedProps = {
      ...props,
      variants: props.variants ? getVariants(props.variants) : undefined,
    };

    return React.createElement(Component, processedProps);
  };
};

/**
 * Utility Functions for Reduced Motion
 */
export const reducedMotionUtils = {
  // Check if system prefers reduced motion
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get safe animation duration
  getSafeDuration: (baseDuration: number): number => {
    const isReduced = reducedMotionManager.isEnabled();
    return isReduced ? reducedMotionManager.getConfig().transitionDuration : baseDuration;
  },

  // Create conditional animation
  conditionalAnimation: (animation: any, fallback: any = {}) => {
    const isReduced = reducedMotionManager.isEnabled();
    return isReduced ? fallback : animation;
  },

  // Get accessibility-friendly transition
  getAccessibleTransition: (baseTransition: any = {}) => {
    const isReduced = reducedMotionManager.isEnabled();
    if (isReduced) {
      return {
        duration: reducedMotionManager.getConfig().transitionDuration,
        type: 'tween',
        ease: 'linear',
      };
    }
    return baseTransition;
  },

  // Create ARIA live region announcement
  announceChange: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (typeof document === 'undefined') return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only'; // Screen reader only
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },
};

/**
 * Reduced Motion Animation Presets
 */
export const reducedMotionPresets = {
  // Fade only (no movement)
  fadeOnly: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.1, ease: 'linear' }
    },
  },

  // Instant appearance
  instant: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0 } },
  },

  // Color change only
  colorChange: {
    rest: { color: 'rgba(255, 255, 255, 0.8)' },
    active: { 
      color: 'rgba(0, 255, 255, 1)',
      transition: { duration: 0.1, ease: 'linear' }
    },
  },

  // Border highlight
  borderHighlight: {
    rest: { borderColor: 'rgba(255, 255, 255, 0.1)' },
    active: { 
      borderColor: 'rgba(0, 255, 255, 0.6)',
      transition: { duration: 0.1, ease: 'linear' }
    },
  },
};

export default reducedMotionManager;