/**
 * Cybersecurity-themed Animation Components
 * Reusable animation components for the cybersecurity dashboard
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { 
  useCardAnimation, 
  useCyberHover, 
  useNeonText, 
  useScanningLine,
  useMatrixReveal,
  useGlitchEffect,
  useHolographicEffect,
  useCyberButton
} from '@/lib/theme/hooks';

// Base animation wrapper component
interface AnimatedWrapperProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  variant?: 'fadeIn' | 'slideIn' | 'scaleIn' | 'cyber';
  delay?: number;
  className?: string;
}

export const AnimatedWrapper: React.FC<AnimatedWrapperProps> = ({
  children,
  variant = 'fadeIn',
  delay = 0,
  className = '',
  ...props
}) => {
  const variants = {
    fadeIn: {
      hidden: { opacity: 0, y: 20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { delay, duration: 0.3, ease: "easeOut" }
      }
    },
    slideIn: {
      hidden: { opacity: 0, x: -50 },
      visible: { 
        opacity: 1, 
        x: 0,
        transition: { delay, duration: 0.4, ease: "easeOut" }
      }
    },
    scaleIn: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { 
        opacity: 1, 
        scale: 1,
        transition: { delay, duration: 0.3, ease: "easeOut" }
      }
    },
    cyber: {
      hidden: { 
        opacity: 0, 
        y: 30, 
        scale: 0.95,
        filter: "blur(10px)"
      },
      visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        filter: "blur(0px)",
        transition: { 
          delay, 
          duration: 0.5, 
          ease: "easeOut",
          type: "spring",
          stiffness: 300,
          damping: 20
        }
      }
    }
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={variants[variant]}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Cybersecurity-themed card component
interface CyberCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  glowIntensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const CyberCard: React.FC<CyberCardProps> = ({
  children,
  variant = 'primary',
  glowIntensity = 'medium',
  className = '',
  ...props
}) => {
  const cardAnimation = useCardAnimation(variant);
  const { handleHoverStart, handleHoverEnd } = useCyberHover(glowIntensity);

  return (
    <motion.div
      className={`cyber-card ${className}`}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardAnimation}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Neon text component
interface NeonTextProps {
  children: React.ReactNode;
  color?: string;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export const NeonText: React.FC<NeonTextProps> = ({
  children,
  color = '#00D4FF',
  intensity = 'medium',
  className = '',
  as: Component = 'span'
}) => {
  const { controls, activateGlow, deactivateGlow } = useNeonText(color);

  const glowStyles = {
    low: `0 0 5px ${color}`,
    medium: `0 0 5px ${color}, 0 0 10px ${color}`,
    high: `0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color}`
  };

  const MotionComponent = motion[Component as keyof typeof motion] as any;

  return (
    <MotionComponent
      className={`neon-text ${className}`}
      animate={controls}
      onMouseEnter={activateGlow}
      onMouseLeave={deactivateGlow}
      style={{
        color: color,
        textShadow: glowStyles[intensity],
      }}
    >
      {children}
    </MotionComponent>
  );
};

// Cybersecurity button component
interface CyberButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const buttonAnimation = useCyberButton(variant);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <motion.button
      className={`cyber-button ${sizeClasses[size]} ${className}`}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      variants={buttonAnimation}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// Scanning line effect component
interface ScanningLineProps {
  className?: string;
  color?: string;
  height?: string;
}

export const ScanningLine: React.FC<ScanningLineProps> = ({
  className = '',
  color = '#00D4FF',
  height = '2px'
}) => {
  const scanAnimation = useScanningLine();

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-x-0"
        style={{
          height,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 10px ${color}`,
        }}
        {...scanAnimation}
      />
    </div>
  );
};

// Matrix reveal text component
interface MatrixTextProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const MatrixText: React.FC<MatrixTextProps> = ({
  children,
  delay = 0,
  className = ''
}) => {
  const matrixAnimation = useMatrixReveal();

  return (
    <motion.div
      className={`matrix-text ${className}`}
      initial="hidden"
      animate="visible"
      custom={delay}
      variants={matrixAnimation}
    >
      {children}
    </motion.div>
  );
};

// Glitch effect component
interface GlitchTextProps {
  children: React.ReactNode;
  className?: string;
  trigger?: boolean;
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  children,
  className = '',
  trigger = false
}) => {
  const glitchAnimation = useGlitchEffect();

  return (
    <motion.div
      className={`glitch-text ${className}`}
      animate={trigger ? glitchAnimation.animate : {}}
    >
      {children}
    </motion.div>
  );
};

// Holographic background component
interface HolographicBackgroundProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

export const HolographicBackground: React.FC<HolographicBackgroundProps> = ({
  children,
  className = ''
}) => {
  const holographicAnimation = useHolographicEffect();

  return (
    <motion.div
      className={`relative ${className}`}
      {...holographicAnimation}
    >
      {children}
    </motion.div>
  );
};

// Staggered container for animating lists
interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 0.1,
  className = ''
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Loading spinner with cybersecurity theme
interface CyberSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const CyberSpinner: React.FC<CyberSpinnerProps> = ({
  size = 'md',
  color = '#00D4FF',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <div
        className="w-full h-full rounded-full border-2 border-transparent"
        style={{
          borderTopColor: color,
          borderRightColor: `${color}60`,
          boxShadow: `0 0 10px ${color}40`
        }}
      />
    </motion.div>
  );
};

// Pulse effect component
interface PulseEffectProps {
  children: React.ReactNode;
  color?: string;
  duration?: number;
  className?: string;
}

export const PulseEffect: React.FC<PulseEffectProps> = ({
  children,
  color = '#00D4FF',
  duration = 2,
  className = ''
}) => {
  return (
    <motion.div
      className={className}
      animate={{
        boxShadow: [
          `0 0 0px ${color}00`,
          `0 0 20px ${color}80`,
          `0 0 0px ${color}00`
        ]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
};

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = ''
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
};

// Floating element animation
interface FloatingElementProps {
  children: React.ReactNode;
  intensity?: 'subtle' | 'medium' | 'strong';
  className?: string;
}

export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  intensity = 'medium',
  className = ''
}) => {
  const intensityValues = {
    subtle: { y: [-2, 2], duration: 3 },
    medium: { y: [-5, 5], duration: 2.5 },
    strong: { y: [-10, 10], duration: 2 }
  };

  const config = intensityValues[intensity];

  return (
    <motion.div
      className={className}
      animate={{ y: config.y }}
      transition={{
        duration: config.duration,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
};

// All components are already exported individually above