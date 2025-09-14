/**
 * RTL-Aware Animation Utilities
 * Specialized animations that adapt to right-to-left layouts
 */

import { Variants } from 'framer-motion';
import { rtlManager, getOptimizedTransitions, performanceMonitor } from './animations';

/**
 * RTL-aware slide animations
 */
export const createRTLSlideAnimations = () => {
  const rtlConfig = rtlManager.getConfig();
  const transitions = getOptimizedTransitions();
  // const shouldAnimate = performanceMonitor.shouldEnableAnimation();

  return {
    // Slide in from start (left in LTR, right in RTL)
    slideInFromStart: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? 50 : -50,
      },
      visible: {
        opacity: 1,
        x: 0,
        transition: transitions.smooth,
      },
      exit: {
        opacity: 0,
        x: rtlConfig.isRTL ? -50 : 50,
        transition: transitions.fast,
      },
    },

    // Slide in from end (right in LTR, left in RTL)
    slideInFromEnd: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? -50 : 50,
      },
      visible: {
        opacity: 1,
        x: 0,
        transition: transitions.smooth,
      },
      exit: {
        opacity: 0,
        x: rtlConfig.isRTL ? 50 : -50,
        transition: transitions.fast,
      },
    },

    // Navigation drawer animation
    drawerSlide: {
      hidden: {
        x: rtlConfig.isRTL ? '100%' : '-100%',
        opacity: 0,
      },
      visible: {
        x: 0,
        opacity: 1,
        transition: transitions.smooth,
      },
      exit: {
        x: rtlConfig.isRTL ? '100%' : '-100%',
        opacity: 0,
        transition: transitions.fast,
      },
    },

    // Modal slide animation
    modalSlide: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? 100 : -100,
        scale: 0.95,
      },
      visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: transitions.bounce,
      },
      exit: {
        opacity: 0,
        x: rtlConfig.isRTL ? -100 : 100,
        scale: 0.95,
        transition: transitions.fast,
      },
    },

    // Notification slide animation
    notificationSlide: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? -300 : 300,
        y: 0,
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: transitions.bounce,
      },
      exit: {
        opacity: 0,
        x: rtlConfig.isRTL ? -300 : 300,
        y: 0,
        transition: transitions.fast,
      },
    },
  };
};

/**
 * RTL-aware navigation animations
 */
export const createRTLNavigationAnimations = () => {
  const rtlConfig = rtlManager.getConfig();
  const transitions = getOptimizedTransitions();

  return {
    // Navigation item hover
    navItemHover: {
      rest: {
        x: 0,
        scale: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
      },
      hover: {
        x: rtlConfig.isRTL ? -5 : 5,
        scale: 1.02,
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
        transition: transitions.fast,
      },
      tap: {
        scale: 0.98,
        transition: transitions.sharp,
      },
    },

    // Breadcrumb animation
    breadcrumbSlide: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? 20 : -20,
      },
      visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: {
          delay: i * 0.1,
          duration: transitions.smooth.duration,
        },
      }),
    },

    // Tab switching animation
    tabSwitch: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? 30 : -30,
      },
      visible: {
        opacity: 1,
        x: 0,
        transition: transitions.smooth,
      },
      exit: {
        opacity: 0,
        x: rtlConfig.isRTL ? -30 : 30,
        transition: transitions.fast,
      },
    },

    // Dropdown menu animation
    dropdownSlide: {
      hidden: {
        opacity: 0,
        scale: 0.95,
        transformOrigin: rtlConfig.isRTL ? 'top right' : 'top left',
      },
      visible: {
        opacity: 1,
        scale: 1,
        transition: transitions.bounce,
      },
      exit: {
        opacity: 0,
        scale: 0.95,
        transition: transitions.fast,
      },
    },
  };
};

/**
 * RTL-aware form animations
 */
export const createRTLFormAnimations = () => {
  const rtlConfig = rtlManager.getConfig();
  const transitions = getOptimizedTransitions();

  return {
    // Form field focus animation
    fieldFocus: {
      rest: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 0 0px transparent',
      },
      focus: {
        borderColor: 'rgba(0, 255, 255, 0.6)',
        boxShadow: rtlConfig.isRTL 
          ? '-2px 0 10px rgba(0, 255, 255, 0.3)'
          : '2px 0 10px rgba(0, 255, 255, 0.3)',
        transition: transitions.fast,
      },
    },

    // Label animation
    labelFloat: {
      rest: {
        y: 0,
        x: rtlConfig.isRTL ? -10 : 10,
        scale: 1,
        color: 'rgba(255, 255, 255, 0.6)',
      },
      focus: {
        y: -20,
        x: 0,
        scale: 0.85,
        color: 'rgba(0, 255, 255, 1)',
        transition: transitions.smooth,
      },
    },

    // Error message slide
    errorSlide: {
      hidden: {
        opacity: 0,
        height: 0,
        x: rtlConfig.isRTL ? 20 : -20,
      },
      visible: {
        opacity: 1,
        height: 'auto',
        x: 0,
        transition: transitions.smooth,
      },
      exit: {
        opacity: 0,
        height: 0,
        x: rtlConfig.isRTL ? -20 : 20,
        transition: transitions.fast,
      },
    },

    // Success message slide
    successSlide: {
      hidden: {
        opacity: 0,
        scale: 0.8,
        x: rtlConfig.isRTL ? -30 : 30,
      },
      visible: {
        opacity: 1,
        scale: 1,
        x: 0,
        transition: transitions.bounce,
      },
      exit: {
        opacity: 0,
        scale: 0.8,
        x: rtlConfig.isRTL ? 30 : -30,
        transition: transitions.fast,
      },
    },
  };
};

/**
 * RTL-aware table animations
 */
export const createRTLTableAnimations = () => {
  const rtlConfig = rtlManager.getConfig();
  const transitions = getOptimizedTransitions();

  return {
    // Row hover animation
    rowHover: {
      rest: {
        backgroundColor: 'transparent',
        x: 0,
      },
      hover: {
        backgroundColor: 'rgba(0, 255, 255, 0.05)',
        x: rtlConfig.isRTL ? -2 : 2,
        transition: transitions.fast,
      },
    },

    // Cell animation
    cellSlide: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? 20 : -20,
      },
      visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: {
          delay: i * 0.05,
          duration: transitions.smooth.duration,
        },
      }),
    },

    // Sort indicator animation
    sortIndicator: {
      hidden: {
        opacity: 0,
        rotate: rtlConfig.isRTL ? -90 : 90,
      },
      visible: {
        opacity: 1,
        rotate: 0,
        transition: transitions.smooth,
      },
    },

    // Pagination animation
    paginationSlide: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? -50 : 50,
      },
      visible: {
        opacity: 1,
        x: 0,
        transition: transitions.smooth,
      },
    },
  };
};

/**
 * RTL-aware card animations
 */
export const createRTLCardAnimations = () => {
  const rtlConfig = rtlManager.getConfig();
  const transitions = getOptimizedTransitions();

  return {
    // Card entrance with RTL consideration
    cardEntrance: {
      hidden: {
        opacity: 0,
        y: 30,
        x: rtlConfig.isRTL ? 20 : -20,
        scale: 0.95,
        rotateY: rtlConfig.isRTL ? 15 : -15,
      },
      visible: {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        rotateY: 0,
        transition: transitions.bounce,
      },
      hover: {
        y: -8,
        scale: 1.02,
        rotateY: rtlConfig.isRTL ? -5 : 5,
        boxShadow: '0 20px 40px rgba(0, 255, 255, 0.15)',
        transition: transitions.fast,
      },
    },

    // Card flip animation
    cardFlip: {
      front: {
        rotateY: 0,
      },
      back: {
        rotateY: rtlConfig.isRTL ? -180 : 180,
      },
    },

    // Card stack animation
    cardStack: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? 100 : -100,
        rotateZ: rtlConfig.isRTL ? 10 : -10,
      },
      visible: (i: number) => ({
        opacity: 1,
        x: 0,
        rotateZ: 0,
        transition: {
          delay: i * 0.1,
          type: 'spring',
          stiffness: transitions.bounce.stiffness,
          damping: transitions.bounce.damping,
        },
      }),
    },
  };
};

/**
 * RTL-aware text animations
 */
export const createRTLTextAnimations = () => {
  const rtlConfig = rtlManager.getConfig();
  const transitions = getOptimizedTransitions();

  return {
    // Text reveal animation
    textReveal: {
      hidden: {
        opacity: 0,
        x: rtlConfig.isRTL ? 50 : -50,
        filter: 'blur(10px)',
      },
      visible: {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: transitions.smooth,
      },
    },

    // Typing effect
    typing: {
      hidden: {
        width: 0,
        borderRight: rtlConfig.isRTL ? 'none' : '2px solid #00D4FF',
        borderLeft: rtlConfig.isRTL ? '2px solid #00D4FF' : 'none',
      },
      visible: {
        width: '100%',
        transition: {
          width: {
            duration: 2,
            ease: 'steps(20, end)',
          },
        },
      },
    },

    // Highlight animation
    highlight: {
      rest: {
        backgroundColor: 'transparent',
        color: 'inherit',
      },
      hover: {
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
        color: '#00D4FF',
        paddingLeft: rtlConfig.isRTL ? 0 : 8,
        paddingRight: rtlConfig.isRTL ? 8 : 0,
        transition: transitions.fast,
      },
    },
  };
};

/**
 * Get all RTL animations
 */
export const getRTLAnimations = () => {
  return {
    slide: createRTLSlideAnimations(),
    navigation: createRTLNavigationAnimations(),
    form: createRTLFormAnimations(),
    table: createRTLTableAnimations(),
    card: createRTLCardAnimations(),
    text: createRTLTextAnimations(),
  };
};

/**
 * RTL animation variants factory
 */
export const createRTLVariants = (animationType: string): Variants => {
  const animations = getRTLAnimations();
  const [type, variant] = animationType.split('.');
  
  if (type in animations && variant in (animations as any)[type]) {
    return (animations as any)[type][variant];
  }
  
  console.warn(`RTL animation variant not found: ${animationType}`);
  return {};
};

/**
 * RTL-aware stagger animation
 */
export const createRTLStagger = (
  direction: 'horizontal' | 'vertical' = 'vertical',
  delay: number = 0.1
) => {
  const rtlConfig = rtlManager.getConfig();
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  
  const getInitialPosition = () => {
    if (direction === 'vertical') {
      return { y: 20, x: 0 };
    }
    return { 
      y: 0, 
      x: rtlConfig.isRTL ? 20 : -20 
    };
  };

  return {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: shouldAnimate ? delay : 0,
          delayChildren: shouldAnimate ? 0.1 : 0,
        },
      },
    },
    item: {
      hidden: {
        opacity: 0,
        ...getInitialPosition(),
      },
      visible: {
        opacity: 1,
        y: 0,
        x: 0,
        transition: getOptimizedTransitions().smooth,
      },
    },
  };
};

export default {
  createRTLSlideAnimations,
  createRTLNavigationAnimations,
  createRTLFormAnimations,
  createRTLTableAnimations,
  createRTLCardAnimations,
  createRTLTextAnimations,
  getRTLAnimations,
  createRTLVariants,
  createRTLStagger,
};