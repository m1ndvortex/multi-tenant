/**
 * Ultra-Smooth Animation Configuration System
 * Provides zero-lag, buttery-smooth animations with adaptive quality
 */

import { motion, AnimationControls, Variants, Transition } from 'framer-motion';
import { ultraPerformanceMonitor } from './ultra-performance-monitor';
import React from 'react';
import React from 'react';
import React from 'react';
import React from 'react';
import React from 'react';

interface UltraSmoothConfig {
  quality: 'ultra' | 'high' | 'medium' | 'low' | 'minimal';
  targetFPS: number;
  enableGPU: boolean;
  enableWillChange: boolean;
  enableTransform3D: boolean;
  enableSubpixelRendering: boolean;
  enableMotionBlur: boolean;
  adaptiveQuality: boolean;
}

interface AnimationPreset {
  name: string;
  variants: Variants;
  transition: Transition;
  quality: 'ultra' | 'high' | 'medium' | 'low' | 'minimal';
  gpuOptimized: boolean;
}

class UltraSmoothAnimationSystem {
  private config: UltraSmoothConfig = {
    quality: 'ultra',
    targetFPS: 120,
    enableGPU: true,
    enableWillChange: true,
    enableTransform3D: true,
    enableSubpixelRendering: true,
    enableMotionBlur: false,
    adaptiveQuality: true,
  };

  private presets = new Map<string, AnimationPreset>();
  private activeAnimations = new Set<string>();
  private animationQueue: Array<() => void> = [];
  private isProcessingQueue = false;

  constructor() {
    this.initializePresets();
    this.setupPerformanceListeners();
    this.optimizeForDevice();
  }

  /**
   * Initialize ultra-smooth animation presets
   */
  private initializePresets(): void {
    // Ultra-smooth page transitions
    this.presets.set('page-transition-ultra', {
      name: 'Ultra Page Transition',
      quality: 'ultra',
      gpuOptimized: true,
      variants: {
        initial: { 
          opacity: 0, 
          y: 8, 
          scale: 0.99,
          filter: 'blur(0.5px)',
        },
        animate: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          filter: 'blur(0px)',
        },
        exit: { 
          opacity: 0, 
          y: -8, 
          scale: 0.99,
          filter: 'blur(0.5px)',
        },
      },
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8,
        velocity: 2,
      },
    });

    // Ultra-smooth card entrance
    this.presets.set('card-entrance-ultra', {
      name: 'Ultra Card Entrance',
      quality: 'ultra',
      gpuOptimized: true,
      variants: {
        initial: { 
          opacity: 0, 
          y: 12, 
          scale: 0.98,
          rotateX: 2,
        },
        animate: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          rotateX: 0,
        },
      },
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 25,
        mass: 0.6,
      },
    });

    // Ultra-smooth hover effects
    this.presets.set('hover-ultra', {
      name: 'Ultra Hover Effect',
      quality: 'ultra',
      gpuOptimized: true,
      variants: {
        initial: { 
          scale: 1,
          boxShadow: '0 0 0 rgba(0, 212, 255, 0)',
        },
        hover: { 
          scale: 1.02,
          boxShadow: '0 8px 32px rgba(0, 212, 255, 0.3)',
        },
        tap: { 
          scale: 0.98,
        },
      },
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 20,
        mass: 0.4,
      },
    });

    // Ultra-smooth glass morphism
    this.presets.set('glass-morph-ultra', {
      name: 'Ultra Glass Morphism',
      quality: 'ultra',
      gpuOptimized: true,
      variants: {
        initial: { 
          backdropFilter: 'blur(0px) saturate(100%)',
          background: 'rgba(255, 255, 255, 0)',
        },
        animate: { 
          backdropFilter: 'blur(20px) saturate(180%)',
          background: 'rgba(255, 255, 255, 0.1)',
        },
      },
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    });

    // Performance-optimized versions for lower-end devices
    this.createOptimizedPresets();
  }

  /**
   * Create performance-optimized versions of presets
   */
  private createOptimizedPresets(): void {
    // High quality versions (remove some effects)
    this.presets.set('page-transition-high', {
      ...this.presets.get('page-transition-ultra')!,
      quality: 'high',
      variants: {
        initial: { opacity: 0, y: 8, scale: 0.99 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.99 },
      },
    });

    // Medium quality versions (simpler animations)
    this.presets.set('page-transition-medium', {
      ...this.presets.get('page-transition-ultra')!,
      quality: 'medium',
      variants: {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
      },
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    });

    // Low quality versions (minimal animations)
    this.presets.set('page-transition-low', {
      ...this.presets.get('page-transition-ultra')!,
      quality: 'low',
      variants: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      },
      transition: {
        duration: 0.15,
        ease: 'linear',
      },
    });

    // Minimal versions (almost no animation)
    this.presets.set('page-transition-minimal', {
      ...this.presets.get('page-transition-ultra')!,
      quality: 'minimal',
      variants: {
        initial: { opacity: 0.8 },
        animate: { opacity: 1 },
        exit: { opacity: 0.8 },
      },
      transition: {
        duration: 0.1,
      },
    });
  }

  /**
   * Setup performance monitoring listeners
   */
  private setupPerformanceListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for performance changes
    window.addEventListener('animation-quality-change', (event: any) => {
      this.config.quality = event.detail.quality;
      this.updateActiveAnimations();
    });

    window.addEventListener('performance-emergency', () => {
      this.config.quality = 'minimal';
      this.pauseNonCriticalAnimations();
    });

    window.addEventListener('throttle-animations', () => {
      this.throttleAnimations();
    });
  }

  /**
   * Optimize configuration for current device
   */
  private optimizeForDevice(): void {
    if (typeof navigator === 'undefined') return;

    // Detect device capabilities
    const cpuCores = navigator.hardwareConcurrency || 4;
    const isLowEndDevice = cpuCores <= 2;
    
    // Check for GPU acceleration
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        this.config.enableGPU = !!gl;
      } else {
        this.config.enableGPU = false;
      }
    } catch (error) {
      // Fallback for test environments
      this.config.enableGPU = false;
    }

    // Adjust quality based on device
    if (isLowEndDevice) {
      this.config.quality = 'medium';
      this.config.targetFPS = 60;
      this.config.enableMotionBlur = false;
    }

    // Check for reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          this.config.quality = 'minimal';
          this.config.adaptiveQuality = false;
        }
      } catch (error) {
        // Fallback for test environments
      }
    }
  }

  /**
   * Get optimized animation preset based on current performance
   */
  getPreset(baseName: string): AnimationPreset | null {
    const qualitySuffix = this.config.adaptiveQuality 
      ? this.getAdaptiveQuality() 
      : this.config.quality;
    
    const presetName = `${baseName}-${qualitySuffix}`;
    return this.presets.get(presetName) || this.presets.get(`${baseName}-medium`);
  }

  /**
   * Get adaptive quality based on current performance
   */
  private getAdaptiveQuality(): string {
    const metrics = ultraPerformanceMonitor.getMetrics();
    
    // Ultra quality: 120+ FPS, <1% jank, low memory pressure
    if (metrics.frameRate >= 120 && 
        metrics.jankPercentage < 1 && 
        metrics.memoryPressure === 'low') {
      return 'ultra';
    }
    
    // High quality: 90+ FPS, <3% jank, low-medium memory pressure
    if (metrics.frameRate >= 90 && 
        metrics.jankPercentage < 3 && 
        metrics.memoryPressure !== 'critical') {
      return 'high';
    }
    
    // Medium quality: 60+ FPS, <5% jank
    if (metrics.frameRate >= 60 && metrics.jankPercentage < 5) {
      return 'medium';
    }
    
    // Low quality: 30+ FPS
    if (metrics.frameRate >= 30) {
      return 'low';
    }
    
    // Minimal quality: fallback
    return 'minimal';
  }

  /**
   * Create ultra-smooth motion component
   */
  createMotionComponent(
    element: keyof typeof motion,
    presetName: string,
    additionalProps: any = {}
  ) {
    const preset = this.getPreset(presetName);
    if (!preset) {
      console.warn(`Animation preset not found: ${presetName}`);
      return motion[element];
    }

    const optimizedProps = {
      ...additionalProps,
      variants: preset.variants,
      transition: preset.transition,
      ...this.getOptimizationProps(preset),
    };

    return motion[element](optimizedProps);
  }

  /**
   * Get optimization props for GPU acceleration
   */
  private getOptimizationProps(preset: AnimationPreset): any {
    const props: any = {};

    if (this.config.enableGPU && preset.gpuOptimized) {
      props.style = {
        ...props.style,
        willChange: this.config.enableWillChange ? 'transform, opacity' : 'auto',
        transform: this.config.enableTransform3D ? 'translateZ(0)' : undefined,
        backfaceVisibility: 'hidden',
        perspective: 1000,
      };
    }

    if (this.config.enableSubpixelRendering) {
      props.style = {
        ...props.style,
        WebkitFontSmoothing: 'subpixel-antialiased',
      };
    }

    return props;
  }

  /**
   * Queue animation for smooth execution
   */
  queueAnimation(animationFn: () => void): void {
    this.animationQueue.push(animationFn);
    this.processAnimationQueue();
  }

  /**
   * Process animation queue with frame rate limiting
   */
  private processAnimationQueue(): void {
    if (this.isProcessingQueue || this.animationQueue.length === 0) return;

    this.isProcessingQueue = true;

    const processNext = () => {
      if (this.animationQueue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      const animation = this.animationQueue.shift();
      if (animation) {
        animation();
      }

      // Limit to target FPS
      const frameDelay = 1000 / this.config.targetFPS;
      setTimeout(processNext, frameDelay);
    };

    requestAnimationFrame(processNext);
  }

  /**
   * Update active animations when quality changes
   */
  private updateActiveAnimations(): void {
    // Notify all active animations to update their quality
    window.dispatchEvent(new CustomEvent('animation-quality-update', {
      detail: { quality: this.config.quality }
    }));
  }

  /**
   * Pause non-critical animations during performance issues
   */
  private pauseNonCriticalAnimations(): void {
    window.dispatchEvent(new CustomEvent('pause-non-critical-animations'));
  }

  /**
   * Throttle animations to improve performance
   */
  private throttleAnimations(): void {
    // Reduce animation frequency
    this.config.targetFPS = Math.max(30, this.config.targetFPS * 0.7);
    
    window.dispatchEvent(new CustomEvent('animation-throttle', {
      detail: { targetFPS: this.config.targetFPS }
    }));
  }

  /**
   * Get current configuration
   */
  getConfig(): UltraSmoothConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<UltraSmoothConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateActiveAnimations();
  }

  /**
   * Get performance-optimized transition
   */
  getOptimizedTransition(baseTransition: Transition): Transition {
    const quality = this.getAdaptiveQuality();
    
    switch (quality) {
      case 'ultra':
        return {
          ...baseTransition,
          type: 'spring',
          stiffness: baseTransition.stiffness || 400,
          damping: baseTransition.damping || 30,
        };
      
      case 'high':
        return {
          ...baseTransition,
          type: 'spring',
          stiffness: (baseTransition.stiffness || 400) * 0.8,
          damping: (baseTransition.damping || 30) * 1.2,
        };
      
      case 'medium':
        return {
          duration: 0.2,
          ease: 'easeOut',
        };
      
      case 'low':
        return {
          duration: 0.15,
          ease: 'linear',
        };
      
      case 'minimal':
        return {
          duration: 0.1,
        };
      
      default:
        return baseTransition;
    }
  }

  /**
   * Create staggered animation for lists
   */
  createStaggeredAnimation(itemCount: number, baseDelay: number = 0.05): any {
    const quality = this.getAdaptiveQuality();
    
    // Reduce stagger delay for lower quality
    const delayMultiplier = {
      ultra: 1,
      high: 0.8,
      medium: 0.6,
      low: 0.4,
      minimal: 0.2,
    }[quality] || 0.6;

    return {
      animate: {
        transition: {
          staggerChildren: baseDelay * delayMultiplier,
          delayChildren: 0.1 * delayMultiplier,
        },
      },
    };
  }
}

// Singleton instance
export const ultraSmoothAnimations = new UltraSmoothAnimationSystem();

// React hook for ultra-smooth animations
export function useUltraSmoothAnimation(presetName: string) {
  const [preset, setPreset] = React.useState(ultraSmoothAnimations.getPreset(presetName));
  const [config, setConfig] = React.useState(ultraSmoothAnimations.getConfig());

  React.useEffect(() => {
    const handleQualityUpdate = () => {
      setPreset(ultraSmoothAnimations.getPreset(presetName));
      setConfig(ultraSmoothAnimations.getConfig());
    };

    window.addEventListener('animation-quality-update', handleQualityUpdate);
    return () => window.removeEventListener('animation-quality-update', handleQualityUpdate);
  }, [presetName]);

  const createMotionComponent = React.useCallback((
    element: keyof typeof motion,
    additionalProps: any = {}
  ) => {
    return ultraSmoothAnimations.createMotionComponent(element, presetName, additionalProps);
  }, [presetName]);

  const getOptimizedTransition = React.useCallback((baseTransition: Transition) => {
    return ultraSmoothAnimations.getOptimizedTransition(baseTransition);
  }, []);

  return {
    preset,
    config,
    createMotionComponent,
    getOptimizedTransition,
    queueAnimation: ultraSmoothAnimations.queueAnimation.bind(ultraSmoothAnimations),
  };
}

// Utility function for creating ultra-smooth motion components
export const UltraMotion = {
  div: (props: any) => motion.div({
    ...ultraSmoothAnimations.getOptimizationProps({ gpuOptimized: true } as AnimationPreset),
    ...props,
  }),
  
  button: (props: any) => motion.button({
    ...ultraSmoothAnimations.getOptimizationProps({ gpuOptimized: true } as AnimationPreset),
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: ultraSmoothAnimations.getOptimizedTransition({ type: 'spring', stiffness: 400, damping: 20 }),
    ...props,
  }),
  
  card: (props: any) => motion.div({
    ...ultraSmoothAnimations.getOptimizationProps({ gpuOptimized: true } as AnimationPreset),
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
    transition: ultraSmoothAnimations.getOptimizedTransition({ type: 'spring', stiffness: 300, damping: 25 }),
    ...props,
  }),
};

export default ultraSmoothAnimations;