/**
 * Animation Hooks for Cybersecurity Theme
 * React hooks for managing animations, performance, and RTL configurations
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useMotionValue, useSpring, useTransform, useAnimation } from 'framer-motion';
import { 
  performanceMonitor, 
  rtlManager, 
  animationPresets, 
  cyberAnimations,
  getOptimizedTransitions,
  type PerformanceConfig,
  type RTLConfig,
  type PerformanceMetrics
} from './animations';
import { useLazyAnimation } from './lazy-animations';
import { useReducedMotion } from './reduced-motion';

/**
 * Hook for managing animation performance and configuration
 */
export const useAnimationConfig = () => {
  const [performanceConfig, setPerformanceConfig] = useState<PerformanceConfig>(
    performanceMonitor.getPerformanceConfig()
  );
  const [metrics, setMetrics] = useState<PerformanceMetrics>(
    performanceMonitor.getMetrics()
  );
  const [rtlConfig, setRtlConfig] = useState<RTLConfig>(
    rtlManager.getConfig()
  );

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setPerformanceConfig(performanceMonitor.getPerformanceConfig());
    };

    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateRTLConfig = useCallback((config: Partial<RTLConfig>) => {
    rtlManager.updateConfig(config);
    setRtlConfig(rtlManager.getConfig());
  }, []);

  return {
    performanceConfig,
    metrics,
    rtlConfig,
    shouldAnimate: performanceMonitor.shouldEnableAnimation(),
    transitions: getOptimizedTransitions(),
    updateRTLConfig,
  };
};

/**
 * Hook for cybersecurity-themed hover animations
 */
export const useCyberHover = (
  intensity: 'low' | 'medium' | 'high' = 'medium',
  glowColor: string = 'rgba(0, 255, 255, 0.4)'
) => {
  const controls = useAnimation();
  const [isHovered, setIsHovered] = useState(false);

  const glowIntensity = {
    low: 10,
    medium: 20,
    high: 30,
  }[intensity];

  const handleHoverStart = useCallback(() => {
    setIsHovered(true);
    if (performanceMonitor.shouldEnableAnimation()) {
      controls.start({
        scale: 1.05,
        boxShadow: `0 0 ${glowIntensity}px ${glowColor}`,
        borderColor: glowColor,
        transition: getOptimizedTransitions().fast,
      });
    }
  }, [controls, glowIntensity, glowColor]);

  const handleHoverEnd = useCallback(() => {
    setIsHovered(false);
    if (performanceMonitor.shouldEnableAnimation()) {
      controls.start({
        scale: 1,
        boxShadow: '0 0 0px transparent',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        transition: getOptimizedTransitions().fast,
      });
    }
  }, [controls]);

  return {
    controls,
    isHovered,
    handleHoverStart,
    handleHoverEnd,
    animate: controls,
    whileHover: performanceMonitor.shouldEnableAnimation() ? {
      scale: 1.05,
      boxShadow: `0 0 ${glowIntensity}px ${glowColor}`,
      borderColor: glowColor,
    } : {},
  };
};

/**
 * Hook for neon glow text effects
 */
export const useNeonText = (color: string = '#00D4FF') => {
  const controls = useAnimation();
  const [isActive, setIsActive] = useState(false);

  const activateGlow = useCallback(() => {
    setIsActive(true);
    if (performanceMonitor.shouldEnableAnimation()) {
      controls.start({
        textShadow: [
          `0 0 5px ${color}`,
          `0 0 10px ${color}`,
          `0 0 20px ${color}`,
        ].join(', '),
        color: '#ffffff',
        transition: getOptimizedTransitions().fast,
      });
    }
  }, [controls, color]);

  const deactivateGlow = useCallback(() => {
    setIsActive(false);
    if (performanceMonitor.shouldEnableAnimation()) {
      controls.start({
        textShadow: `0 0 5px ${color}`,
        color: color,
        transition: getOptimizedTransitions().fast,
      });
    }
  }, [controls, color]);

  return {
    controls,
    isActive,
    activateGlow,
    deactivateGlow,
    animate: controls,
    whileHover: performanceMonitor.shouldEnableAnimation() ? {
      textShadow: `0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color}`,
      color: '#ffffff',
    } : {},
  };
};

/**
 * Hook for page transition animations with RTL support
 */
export const usePageTransition = () => {
  const rtlConfig = rtlManager.getConfig();
  const direction = rtlConfig.isRTL ? 100 : -100;
  const transitions = getOptimizedTransitions();

  return {
    initial: { opacity: 0, x: direction },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -direction },
    transition: transitions.smooth,
  };
};

/**
 * Hook for staggered animations
 */
export const useStaggerAnimation = (
  delay: number = 0.1,
  duration: number = 0.3
) => {
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  const optimizedDelay = shouldAnimate ? delay : 0;
  const optimizedDuration = performanceMonitor.getOptimizedDuration(duration);

  return {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: optimizedDuration,
        staggerChildren: optimizedDelay,
      },
    },
  };
};

/**
 * Hook for cybersecurity loading animations
 */
export const useCyberLoading = (type: 'spinner' | 'dots' | 'pulse' = 'spinner') => {
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  
  const animations = {
    spinner: {
      animate: {
        rotate: shouldAnimate ? 360 : 0,
        transition: {
          duration: shouldAnimate ? 1 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "linear",
        },
      },
    },
    dots: cyberAnimations.loadingDots,
    pulse: animationPresets.cyberPulse,
  };

  return animations[type];
};

/**
 * Hook for modal animations with glassmorphism
 */
export const useModalAnimation = () => {
  const transitions = getOptimizedTransitions();
  
  return {
    overlay: {
      hidden: {
        opacity: 0,
        backdropFilter: "blur(0px) saturate(100%)",
      },
      visible: {
        opacity: 1,
        backdropFilter: "blur(20px) saturate(180%)",
        transition: transitions.smooth,
      },
      exit: {
        opacity: 0,
        backdropFilter: "blur(0px) saturate(100%)",
        transition: transitions.fast,
      },
    },
    content: {
      hidden: {
        opacity: 0,
        scale: 0.8,
        y: 50,
      },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: transitions.bounce,
      },
      exit: {
        opacity: 0,
        scale: 0.8,
        y: 50,
        transition: transitions.fast,
      },
    },
  };
};

/**
 * Hook for card entrance animations
 */
export const useCardAnimation = (variant: 'primary' | 'secondary' | 'accent' = 'primary') => {
  const transitions = getOptimizedTransitions();
  const colors = {
    primary: "rgba(0, 255, 255, 0.4)",
    secondary: "rgba(0, 255, 136, 0.4)",
    accent: "rgba(255, 107, 53, 0.4)",
  };

  return {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.95,
      rotateX: -15,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: transitions.bounce,
    },
    hover: {
      y: -8,
      scale: 1.02,
      rotateX: 5,
      boxShadow: `0 20px 40px ${colors[variant]}`,
      borderColor: colors[variant],
      transition: transitions.fast,
    },
  };
};

/**
 * Hook for scanning line effect
 */
export const useScanningLine = () => {
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  
  return {
    animate: {
      y: shouldAnimate ? ["-100%", "100%"] : "0%",
      opacity: shouldAnimate ? [0, 0.8, 1, 0.8, 0] : 1,
      boxShadow: shouldAnimate ? [
        "0 0 0px rgba(0, 255, 255, 0)",
        "0 0 20px rgba(0, 255, 255, 0.8)",
        "0 0 40px rgba(0, 255, 255, 1)",
        "0 0 20px rgba(0, 255, 255, 0.8)",
        "0 0 0px rgba(0, 255, 255, 0)",
      ] : "0 0 0px rgba(0, 255, 255, 0)",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(2.5),
        repeat: shouldAnimate ? Infinity : 0,
        ease: "linear",
      },
    },
  };
};

/**
 * Hook for matrix-style reveal animation
 */
export const useMatrixReveal = () => {
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  
  return {
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(10px)",
      textShadow: "0 0 0px rgba(0, 255, 136, 0)",
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      textShadow: "0 0 10px rgba(0, 255, 136, 0.8)",
      transition: {
        delay: shouldAnimate ? i * 0.1 : 0,
        duration: performanceMonitor.getOptimizedDuration(0.6),
        ease: "easeOut",
      },
    }),
  };
};

/**
 * Hook for glitch effect
 */
export const useGlitchEffect = () => {
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  
  return {
    animate: {
      x: shouldAnimate ? [0, -3, 3, -1, 1, 0] : 0,
      y: shouldAnimate ? [0, 1, -1, 0] : 0,
      textShadow: shouldAnimate ? [
        "0 0 0px currentColor",
        "3px 0 0px #ff0066, -3px 0 0px #00ffff",
        "-2px 0 0px #ff0066, 2px 0 0px #00ff88",
        "0 0 0px currentColor",
      ] : "0 0 0px currentColor",
      filter: shouldAnimate ? [
        "hue-rotate(0deg)",
        "hue-rotate(90deg)",
        "hue-rotate(180deg)",
        "hue-rotate(0deg)",
      ] : "hue-rotate(0deg)",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(0.4),
        repeat: shouldAnimate ? Infinity : 0,
        repeatDelay: performanceMonitor.getOptimizedDuration(4),
      },
    },
  };
};

/**
 * Hook for holographic background effect
 */
export const useHolographicEffect = () => {
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  
  return {
    animate: {
      background: shouldAnimate ? [
        "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 50%, rgba(255,107,53,0.1) 100%)",
        "linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(255,107,53,0.1) 50%, rgba(165,94,234,0.1) 100%)",
        "linear-gradient(225deg, rgba(255,107,53,0.1) 0%, rgba(165,94,234,0.1) 50%, rgba(0,212,255,0.1) 100%)",
        "linear-gradient(315deg, rgba(165,94,234,0.1) 0%, rgba(0,212,255,0.1) 50%, rgba(0,255,136,0.1) 100%)",
        "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 50%, rgba(255,107,53,0.1) 100%)",
      ] : "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 50%, rgba(255,107,53,0.1) 100%)",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(5),
        repeat: shouldAnimate ? Infinity : 0,
        ease: "linear",
      },
    },
  };
};

/**
 * Enhanced Hook for Performance Monitoring with Advanced Features
 */
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(
    performanceMonitor.getMetrics()
  );
  const [config, setConfig] = useState<PerformanceConfig>(
    performanceMonitor.getPerformanceConfig()
  );
  const [deviceInfo, setDeviceInfo] = useState(
    performanceMonitor.getDeviceInfo()
  );
  const [performanceHistory, setPerformanceHistory] = useState(
    performanceMonitor.getPerformanceHistory()
  );

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setConfig(performanceMonitor.getPerformanceConfig());
      setDeviceInfo(performanceMonitor.getDeviceInfo());
      setPerformanceHistory(performanceMonitor.getPerformanceHistory());
    };

    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  const registerAnimation = useCallback((id: string) => {
    performanceMonitor.registerAnimationInstance(id);
  }, []);

  const unregisterAnimation = useCallback((id: string) => {
    performanceMonitor.unregisterAnimationInstance(id);
  }, []);

  return {
    metrics,
    config,
    deviceInfo,
    performanceHistory,
    shouldAnimate: performanceMonitor.shouldEnableAnimation(),
    getOptimizedDuration: performanceMonitor.getOptimizedDuration.bind(performanceMonitor),
    registerAnimation,
    unregisterAnimation,
  };
};

/**
 * Hook for RTL-aware animations
 */
export const useRTLAnimation = () => {
  const [rtlConfig, setRtlConfig] = useState<RTLConfig>(
    rtlManager.getConfig()
  );

  const updateConfig = useCallback((config: Partial<RTLConfig>) => {
    rtlManager.updateConfig(config);
    setRtlConfig(rtlManager.getConfig());
  }, []);

  const getSlideDirection = useCallback((direction: 'left' | 'right' | 'in' | 'out') => {
    return rtlManager.getSlideDirection(direction);
  }, []);

  const getRotationDirection = useCallback((clockwise: boolean = true) => {
    return rtlManager.getRotationDirection(clockwise);
  }, []);

  return {
    rtlConfig,
    updateConfig,
    getSlideDirection,
    getRotationDirection,
    getScaleOrigin: rtlManager.getScaleOrigin.bind(rtlManager),
  };
};

/**
 * Hook for spring animations with cybersecurity theme
 */
export const useCyberSpring = (
  value: number,
  config?: { stiffness?: number; damping?: number; mass?: number }
) => {
  const performanceConfig = performanceMonitor.getPerformanceConfig();
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  
  const springConfig = {
    stiffness: config?.stiffness || (performanceConfig.performanceLevel === 'low' ? 200 : 300),
    damping: config?.damping || (performanceConfig.performanceLevel === 'low' ? 20 : 15),
    mass: config?.mass || 0.8,
  };

  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, shouldAnimate ? springConfig : { stiffness: 1000, damping: 50 });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return spring;
};

/**
 * Hook for transform animations
 */
export const useCyberTransform = (
  input: number[],
  output: string[] | number[]
) => {
  const motionValue = useMotionValue(0);
  const transform = useTransform(motionValue, input, output as any);
  
  return {
    motionValue,
    transform,
    set: motionValue.set.bind(motionValue),
  };
};

/**
 * Hook for animation sequence control
 */
export const useAnimationSequence = () => {
  const controls = useAnimation();
  const [isPlaying, setIsPlaying] = useState(false);
  const sequenceRef = useRef<Promise<any> | null>(null);

  const playSequence = useCallback(async (sequence: any[]) => {
    if (isPlaying || !performanceMonitor.shouldEnableAnimation()) return;
    
    setIsPlaying(true);
    try {
      sequenceRef.current = controls.start(sequence);
      await sequenceRef.current;
    } catch (error) {
      console.warn('Animation sequence interrupted:', error);
    } finally {
      setIsPlaying(false);
      sequenceRef.current = null;
    }
  }, [controls, isPlaying]);

  const stopSequence = useCallback(() => {
    if (sequenceRef.current) {
      controls.stop();
      setIsPlaying(false);
      sequenceRef.current = null;
    }
  }, [controls]);

  return {
    controls,
    isPlaying,
    playSequence,
    stopSequence,
  };
};

/**
 * Hook for cybersecurity-themed button animations
 */
export const useCyberButton = (variant: 'primary' | 'secondary' | 'danger' = 'primary') => {
  const colors = {
    primary: '#00D4FF',
    secondary: '#00FF88',
    danger: '#FF4757',
  };

  const color = colors[variant];
  const transitions = getOptimizedTransitions();

  return {
    rest: { 
      scale: 1, 
      boxShadow: "0 0 0px transparent",
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    hover: performanceMonitor.shouldEnableAnimation() ? {
      scale: 1.05,
      boxShadow: `0 0 20px ${color}40, 0 0 40px ${color}20`,
      borderColor: `${color}60`,
      transition: transitions.fast,
    } : {},
    tap: performanceMonitor.shouldEnableAnimation() ? {
      scale: 0.98,
      boxShadow: `0 0 15px ${color}80`,
      transition: transitions.sharp,
    } : {},
  };
};

/**
 * Hook for Automatic Animation Quality Adjustment
 */
export const useAdaptiveAnimations = () => {
  const { metrics, config, deviceInfo } = usePerformanceMonitor();
  const { isEnabled: reducedMotionEnabled } = useReducedMotion();
  const [qualityLevel, setQualityLevel] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    // Determine quality level based on performance metrics
    let newQualityLevel: 'high' | 'medium' | 'low' = 'high';

    if (reducedMotionEnabled || !config.enableAnimations) {
      newQualityLevel = 'low';
    } else if (
      metrics.frameRate < 30 || 
      metrics.memoryUsage > config.memoryThreshold * 0.8 ||
      deviceInfo.isLowEndDevice
    ) {
      newQualityLevel = 'low';
    } else if (
      metrics.frameRate < 50 || 
      metrics.memoryUsage > config.memoryThreshold * 0.6 ||
      deviceInfo.connectionSpeed === 'slow'
    ) {
      newQualityLevel = 'medium';
    }

    if (newQualityLevel !== qualityLevel) {
      setQualityLevel(newQualityLevel);
      console.log(`Animation quality adjusted to: ${newQualityLevel}`);
    }
  }, [metrics, config, deviceInfo, reducedMotionEnabled, qualityLevel]);

  const getAdaptiveVariants = useCallback((baseVariants: any) => {
    switch (qualityLevel) {
      case 'low':
        return {
          ...baseVariants,
          transition: { duration: 0.1, ease: 'linear' },
        };
      case 'medium':
        return {
          ...baseVariants,
          transition: { 
            duration: (baseVariants.transition?.duration || 0.3) * 0.75,
            ease: 'easeOut'
          },
        };
      default:
        return baseVariants;
    }
  }, [qualityLevel]);

  return {
    qualityLevel,
    getAdaptiveVariants,
    shouldUseComplexAnimations: qualityLevel === 'high',
    shouldUseMediumAnimations: qualityLevel !== 'low',
  };
};

/**
 * Hook for Memory-Aware Animation Management
 */
export const useMemoryAwareAnimations = () => {
  const { metrics, config } = usePerformanceMonitor();
  const [memoryPressure, setMemoryPressure] = useState<'low' | 'medium' | 'high'>('low');
  const activeAnimations = useRef<Set<string>>(new Set());

  useEffect(() => {
    const memoryUsageRatio = metrics.memoryUsage / config.memoryThreshold;
    
    let newMemoryPressure: 'low' | 'medium' | 'high' = 'low';
    if (memoryUsageRatio > 0.8) {
      newMemoryPressure = 'high';
    } else if (memoryUsageRatio > 0.6) {
      newMemoryPressure = 'medium';
    }

    if (newMemoryPressure !== memoryPressure) {
      setMemoryPressure(newMemoryPressure);
      
      // Cleanup animations if memory pressure is high
      if (newMemoryPressure === 'high') {
        cleanupAnimations();
      }
    }
  }, [metrics.memoryUsage, config.memoryThreshold, memoryPressure]);

  const registerAnimation = useCallback((id: string) => {
    if (memoryPressure !== 'high') {
      activeAnimations.current.add(id);
      performanceMonitor.registerAnimationInstance(id);
    }
  }, [memoryPressure]);

  const unregisterAnimation = useCallback((id: string) => {
    activeAnimations.current.delete(id);
    performanceMonitor.unregisterAnimationInstance(id);
  }, []);

  const cleanupAnimations = useCallback(() => {
    activeAnimations.current.forEach(id => {
      performanceMonitor.unregisterAnimationInstance(id);
    });
    activeAnimations.current.clear();
    console.log('Cleaned up animations due to memory pressure');
  }, []);

  const shouldAllowNewAnimation = useCallback(() => {
    return memoryPressure !== 'high' && activeAnimations.current.size < 10;
  }, [memoryPressure]);

  return {
    memoryPressure,
    registerAnimation,
    unregisterAnimation,
    shouldAllowNewAnimation,
    activeAnimationCount: activeAnimations.current.size,
  };
};

/**
 * Hook for Lazy Animation Loading with Performance Awareness
 */
export const usePerformanceAwareLazyAnimation = (componentName: string) => {
  const { Component, isLoaded } = useLazyAnimation(componentName);
  const { shouldAllowNewAnimation } = useMemoryAwareAnimations();
  const { qualityLevel } = useAdaptiveAnimations();

  const shouldLoad = shouldAllowNewAnimation() && qualityLevel !== 'low';

  return {
    Component: shouldLoad ? Component : null,
    isLoaded: shouldLoad && isLoaded,
    shouldLoad,
    qualityLevel,
  };
};

/**
 * Hook for Animation Instance Lifecycle Management
 */
export const useAnimationLifecycle = (animationId: string) => {
  const { registerAnimation, unregisterAnimation } = useMemoryAwareAnimations();
  const [isActive, setIsActive] = useState(false);

  const startAnimation = useCallback(() => {
    if (!isActive) {
      registerAnimation(animationId);
      setIsActive(true);
    }
  }, [animationId, registerAnimation, isActive]);

  const stopAnimation = useCallback(() => {
    if (isActive) {
      unregisterAnimation(animationId);
      setIsActive(false);
    }
  }, [animationId, unregisterAnimation, isActive]);

  useEffect(() => {
    return () => {
      if (isActive) {
        unregisterAnimation(animationId);
      }
    };
  }, [animationId, unregisterAnimation, isActive]);

  return {
    isActive,
    startAnimation,
    stopAnimation,
  };
};

/**
 * Hook for Performance-Optimized Framer Motion Controls
 */
export const useOptimizedMotionControls = () => {
  const controls = useAnimation();
  const { getOptimizedDuration } = usePerformanceMonitor();
  const { getAdaptiveVariants } = useAdaptiveAnimations();

  const animateWithOptimization = useCallback(async (variants: any) => {
    const optimizedVariants = getAdaptiveVariants(variants);
    
    // Optimize transition duration
    if (optimizedVariants.transition?.duration) {
      optimizedVariants.transition.duration = getOptimizedDuration(
        optimizedVariants.transition.duration
      );
    }

    return controls.start(optimizedVariants);
  }, [controls, getAdaptiveVariants, getOptimizedDuration]);

  return {
    controls,
    animateWithOptimization,
    start: controls.start,
    stop: controls.stop,
    set: controls.set,
  };
};

/**
 * Hook for Accessibility-Aware Animations
 */
export const useAccessibleAnimations = () => {
  const { isEnabled: reducedMotionEnabled, getVariants, isAnimationAllowed } = useReducedMotion();
  const { qualityLevel } = useAdaptiveAnimations();

  const getAccessibleVariants = useCallback((originalVariants: any) => {
    if (reducedMotionEnabled) {
      return getVariants(originalVariants);
    }
    
    // Apply quality-based optimizations
    if (qualityLevel === 'low') {
      return {
        ...originalVariants,
        transition: { duration: 0.1, ease: 'linear' },
      };
    }

    return originalVariants;
  }, [reducedMotionEnabled, getVariants, qualityLevel]);

  return {
    reducedMotionEnabled,
    getAccessibleVariants,
    isAnimationAllowed,
    qualityLevel,
  };
};