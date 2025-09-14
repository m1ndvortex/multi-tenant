/**
 * Animated Number Counter Component
 * Cybersecurity-themed animated counters with matrix-green styling for positive values
 */

import React, { useEffect, useState } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  isPositive?: boolean;
  glowEffect?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2,
  delay = 0,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
  isPositive = true,
  glowEffect = true,
  size = 'md'
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const controls = useAnimation();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const sizeClasses = {
    sm: 'text-lg font-semibold',
    md: 'text-2xl font-bold',
    lg: 'text-3xl font-bold',
    xl: 'text-4xl font-bold'
  };

  const glowClasses = {
    positive: glowEffect ? 'text-[#00FF88] drop-shadow-[0_0_12px_rgba(0,255,136,0.6)]' : 'text-[#00FF88]',
    negative: glowEffect ? 'text-[#FF4757] drop-shadow-[0_0_12px_rgba(255,71,87,0.6)]' : 'text-[#FF4757]',
    neutral: glowEffect ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-white'
  };

  const getColorClass = () => {
    if (value > 0 && isPositive) return glowClasses.positive;
    if (value < 0) return glowClasses.negative;
    return glowClasses.neutral;
  };

  useEffect(() => {
    if (isInView) {
      const startTime = Date.now();
      const startValue = displayValue;
      const endValue = value;
      const totalDuration = duration * 1000; // Convert to milliseconds

      const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime - (delay * 1000);

        if (elapsed < 0) {
          requestAnimationFrame(animate);
          return;
        }

        const progress = Math.min(elapsed / totalDuration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const currentValue = startValue + (endValue - startValue) * easeOutQuart;
        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
        }
      };

      // Start animation with delay
      setTimeout(() => {
        animate();
      }, delay * 1000);

      // Trigger glow animation
      controls.start({
        textShadow: glowEffect ? [
          "0 0 5px currentColor",
          "0 0 20px currentColor",
          "0 0 5px currentColor"
        ] : "0 0 5px currentColor",
        transition: {
          duration: 0.5,
          delay: delay + duration * 0.8,
          ease: "easeOut"
        }
      });
    }
  }, [isInView, value, duration, delay, displayValue, controls, glowEffect]);

  const formatValue = (val: number) => {
    const formattedValue = val.toFixed(decimals);
    return `${prefix}${formattedValue}${suffix}`;
  };

  return (
    <motion.span
      ref={ref}
      className={cn(
        sizeClasses[size],
        getColorClass(),
        'font-mono tabular-nums transition-all duration-300',
        className
      )}
      animate={controls}
      initial={{ 
        opacity: 0, 
        scale: 0.8,
        textShadow: "0 0 0px currentColor"
      }}
      whileInView={{ 
        opacity: 1, 
        scale: 1,
        transition: { 
          duration: 0.3, 
          delay: delay,
          ease: "easeOut" 
        }
      }}
      viewport={{ once: true }}
    >
      {formatValue(displayValue)}
    </motion.span>
  );
};

interface AnimatedPercentageProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  showSign?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedPercentage: React.FC<AnimatedPercentageProps> = ({
  value,
  duration = 1.5,
  delay = 0,
  className = '',
  showSign = true,
  size = 'sm'
}) => {
  const isPositive = value > 0;
  const prefix = showSign && isPositive ? '+' : '';
  
  return (
    <div className="flex items-center gap-1">
      {isPositive ? (
        <motion.svg 
          className="w-4 h-4 text-[#00FF88]" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + duration * 0.8, duration: 0.3 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </motion.svg>
      ) : value < 0 ? (
        <motion.svg 
          className="w-4 h-4 text-[#FF4757]" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + duration * 0.8, duration: 0.3 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </motion.svg>
      ) : null}
      
      <AnimatedCounter
        value={Math.abs(value)}
        duration={duration}
        delay={delay}
        className={className}
        prefix={prefix}
        suffix="%"
        decimals={1}
        isPositive={isPositive}
        size={size}
      />
    </div>
  );
};

interface AnimatedCurrencyProps {
  value: number;
  currency?: string;
  duration?: number;
  delay?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = ({
  value,
  currency = '$',
  duration = 2,
  delay = 0,
  className = '',
  size = 'md'
}) => {


  return (
    <AnimatedCounter
      value={value}
      duration={duration}
      delay={delay}
      className={className}
      prefix={currency}
      decimals={0}
      isPositive={true}
      size={size}
    />
  );
};

interface PulsingNumberProps {
  value: number;
  className?: string;
  pulseColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PulsingNumber: React.FC<PulsingNumberProps> = ({
  value,
  className = '',
  pulseColor = '#00FF88',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-lg font-semibold',
    md: 'text-2xl font-bold',
    lg: 'text-3xl font-bold'
  };

  return (
    <motion.span
      className={cn(
        sizeClasses[size],
        'font-mono tabular-nums',
        className
      )}
      style={{ color: pulseColor }}
      animate={{
        textShadow: [
          `0 0 5px ${pulseColor}`,
          `0 0 20px ${pulseColor}`,
          `0 0 5px ${pulseColor}`
        ],
        scale: [1, 1.05, 1]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {value}
    </motion.span>
  );
};

interface CounterGridProps {
  counters: Array<{
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    isPositive?: boolean;
    delay?: number;
  }>;
  className?: string;
}

export const CounterGrid: React.FC<CounterGridProps> = ({
  counters,
  className = ''
}) => {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {counters.map((counter, index) => (
        <motion.div
          key={index}
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: counter.delay || index * 0.1, duration: 0.3 }}
        >
          <AnimatedCounter
            value={counter.value}
            prefix={counter.prefix}
            suffix={counter.suffix}
            isPositive={counter.isPositive}
            delay={counter.delay || index * 0.1}
            size="lg"
            className="block"
          />
          <p className="text-sm text-[#B8BCC8] mt-1">{counter.label}</p>
        </motion.div>
      ))}
    </div>
  );
};