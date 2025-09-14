# Cybersecurity Theme Animation Infrastructure

## Overview

This comprehensive animation infrastructure provides cybersecurity-themed animations with performance optimization, RTL support, and extensive Framer Motion integration for the HesaabPlus Super Admin Dashboard.

## Features

### ✅ Completed Features

1. **Framer Motion Integration**
   - ✅ Installed and configured Framer Motion v10.16.16
   - ✅ Performance-optimized animation system
   - ✅ Automatic animation quality adjustment based on device performance
   - ✅ Reduced motion support for accessibility

2. **Performance Monitoring**
   - ✅ Real-time frame rate monitoring
   - ✅ Memory usage tracking
   - ✅ Automatic performance level adjustment (high/medium/low)
   - ✅ Animation count tracking
   - ✅ Performance-based animation optimization

3. **RTL Support**
   - ✅ Right-to-left layout animations
   - ✅ Persian language support
   - ✅ Direction-aware slide animations
   - ✅ RTL-compatible navigation animations
   - ✅ Mirrored hover effects and transitions

4. **Cybersecurity-Themed Animations**
   - ✅ Neon glow effects with multi-color transitions
   - ✅ Glassmorphism animations with backdrop blur
   - ✅ Matrix-style text reveal animations
   - ✅ Scanning line effects
   - ✅ Glitch effects for cybersecurity aesthetic
   - ✅ Holographic background animations
   - ✅ Multi-color gradient border animations

5. **Animation Components**
   - ✅ Reusable animation wrapper components
   - ✅ Cybersecurity-themed card animations
   - ✅ Neon text components
   - ✅ Cyber-styled button animations
   - ✅ Loading spinners with cybersecurity theme
   - ✅ Page transition components
   - ✅ Staggered container animations

6. **Performance Optimization**
   - ✅ Automatic animation disabling on low-performance devices
   - ✅ Frame rate-based quality adjustment
   - ✅ Memory usage monitoring
   - ✅ Optimized animation durations based on performance
   - ✅ Graceful degradation for older devices

## File Structure

```
src/lib/theme/
├── animations.ts              # Core animation system with performance monitoring
├── hooks.ts                   # React hooks for animation management
├── rtl-animations.ts          # RTL-aware animation utilities
├── animation-config.ts        # Animation configuration and presets
├── index.ts                   # Main export file
├── cybersecurity.ts          # Cybersecurity color palette and theme
├── utils.ts                   # Theme utility functions
├── context.tsx               # Theme context provider
└── README.md                 # This documentation

src/components/animations/
├── CyberAnimations.tsx       # Reusable animation components
├── PerformanceMonitor.tsx    # Performance monitoring components
└── AnimationTest.tsx         # Test component for animation verification
```

## Usage Examples

### Basic Animation Hook

```tsx
import { useAnimationConfig } from '@/lib/theme/hooks';

const MyComponent = () => {
  const { shouldAnimate, performanceConfig, rtlConfig } = useAnimationConfig();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldAnimate ? 0.3 : 0 }}
    >
      Content
    </motion.div>
  );
};
```

### Cybersecurity Hover Effect

```tsx
import { useCyberHover } from '@/lib/theme/hooks';

const CyberCard = () => {
  const { animate, handleHoverStart, handleHoverEnd } = useCyberHover('high', '#00D4FF');
  
  return (
    <motion.div
      animate={animate}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      className="cyber-card"
    >
      Card Content
    </motion.div>
  );
};
```

### Neon Text Effect

```tsx
import { useNeonText } from '@/lib/theme/hooks';

const NeonTitle = () => {
  const { animate, activateGlow, deactivateGlow } = useNeonText('#00FF88');
  
  return (
    <motion.h1
      animate={animate}
      onMouseEnter={activateGlow}
      onMouseLeave={deactivateGlow}
    >
      Cybersecurity Dashboard
    </motion.h1>
  );
};
```

### RTL-Aware Animations

```tsx
import { createRTLSlideAnimations } from '@/lib/theme/rtl-animations';

const RTLComponent = () => {
  const slideAnimations = createRTLSlideAnimations();
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={slideAnimations.slideInFromStart}
    >
      RTL-aware content
    </motion.div>
  );
};
```

### Performance Monitoring

```tsx
import { PerformanceMonitor } from '@/components/animations/PerformanceMonitor';

const App = () => {
  return (
    <div>
      {/* Your app content */}
      <PerformanceMonitor 
        position="bottom-right" 
        showDetails={process.env.NODE_ENV === 'development'} 
      />
    </div>
  );
};
```

## Animation Presets

### Page Transitions

```tsx
import { animationPresets } from '@/lib/theme/animation-config';

<motion.div
  initial="hidden"
  animate="visible"
  exit="exit"
  variants={animationPresets.pageTransition}
>
  Page Content
</motion.div>
```

### Card Entrance

```tsx
import { useCardAnimation } from '@/lib/theme/hooks';

const AnimatedCard = () => {
  const cardAnimation = useCardAnimation('primary');
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardAnimation}
    >
      Card Content
    </motion.div>
  );
};
```

### Cybersecurity Effects

```tsx
import { cyberAnimations } from '@/lib/theme/animations';

// Neon pulse effect
<motion.div {...cyberAnimations.neonPulse}>
  Pulsing Element
</motion.div>

// Scanning line effect
<motion.div {...cyberAnimations.scanLine}>
  Scanning Animation
</motion.div>

// Glitch effect
<motion.div {...cyberAnimations.glitch}>
  Glitch Text
</motion.div>
```

## Performance Features

### Automatic Optimization

The animation system automatically adjusts based on device performance:

- **High Performance (60+ FPS)**: Full animations with all effects
- **Medium Performance (30-59 FPS)**: Reduced animation complexity
- **Low Performance (<30 FPS)**: Minimal animations, disabled complex effects

### Memory Management

- Automatic cleanup of animation instances
- Memory usage monitoring
- Performance-based animation limiting

### Accessibility

- Respects `prefers-reduced-motion` setting
- High contrast mode support
- Keyboard navigation compatibility

## RTL Support

### Automatic Direction Detection

```tsx
// Automatically detects RTL from document.dir
const rtlConfig = rtlManager.getConfig();
console.log(rtlConfig.isRTL); // true for RTL languages
```

### RTL-Aware Animations

```tsx
import { getRTLAnimations } from '@/lib/theme/rtl-animations';

const rtlAnimations = getRTLAnimations();
// Automatically adjusts slide directions, rotations, and positioning for RTL
```

## Configuration

### Theme Configuration

```tsx
import { initializeCybersecurityTheme } from '@/lib/theme';

// Initialize with custom configuration
initializeCybersecurityTheme({
  animations: {
    enabled: true,
    performanceLevel: 'high',
    reducedMotion: false,
  },
  rtl: {
    enabled: true,
    language: 'fa',
    direction: 'rtl',
  },
  cybersecurity: {
    glowEffects: true,
    neonColors: true,
    glassmorphism: true,
    scanningLines: true,
  },
});
```

### Performance Monitoring

```tsx
import { performanceMonitor } from '@/lib/theme/animations';

// Get current metrics
const metrics = performanceMonitor.getMetrics();
console.log(`FPS: ${metrics.frameRate}`);
console.log(`Memory: ${metrics.memoryUsage}MB`);

// Check if animations should be enabled
const shouldAnimate = performanceMonitor.shouldEnableAnimation();
```

## Testing

### Animation Test Component

```tsx
import { AnimationTest } from '@/components/animations/AnimationTest';

// Use this component to verify animation system is working
<AnimationTest />
```

### Performance Testing

```tsx
import { PerformanceStats } from '@/components/animations/PerformanceMonitor';

// Development-only performance display
<PerformanceStats />
```

## Browser Compatibility

- **Chrome/Edge**: Full support with hardware acceleration
- **Firefox**: Full support with some performance optimizations
- **Safari**: Full support with WebKit optimizations
- **Mobile**: Automatic performance adjustment for mobile devices

## Best Practices

### 1. Use Performance Hooks

Always check if animations should be enabled:

```tsx
const { shouldAnimate } = useAnimationConfig();

return (
  <motion.div
    animate={shouldAnimate ? { scale: 1.1 } : {}}
  >
    Content
  </motion.div>
);
```

### 2. Implement Graceful Degradation

```tsx
const animation = shouldAnimate ? {
  whileHover: { scale: 1.05, boxShadow: "0 0 20px #00D4FF" }
} : {
  whileHover: { scale: 1.02 }
};
```

### 3. Use RTL-Aware Animations

```tsx
import { useRTLAnimation } from '@/lib/theme/hooks';

const { getSlideDirection } = useRTLAnimation();
const slideX = getSlideDirection('right'); // Automatically adjusts for RTL
```

### 4. Monitor Performance

```tsx
// Add performance monitoring in development
{process.env.NODE_ENV === 'development' && (
  <PerformanceMonitor showDetails={true} />
)}
```

## Troubleshooting

### Common Issues

1. **Animations not working**: Check if `shouldAnimate` returns true
2. **Poor performance**: Monitor frame rate and adjust animation complexity
3. **RTL issues**: Verify document direction and language settings
4. **Memory leaks**: Ensure proper component cleanup

### Debug Tools

```tsx
import { getCybersecurityThemeStatus } from '@/lib/theme';

// Get comprehensive status
const status = getCybersecurityThemeStatus();
console.log(status);
```

## Future Enhancements

- [ ] WebGL-based particle effects
- [ ] Advanced cybersecurity visualizations
- [ ] Voice-controlled animations
- [ ] AI-powered performance optimization
- [ ] Advanced gesture support

## Contributing

When adding new animations:

1. Follow the performance optimization patterns
2. Add RTL support for directional animations
3. Include accessibility considerations
4. Test on various devices and browsers
5. Update documentation and examples

## License

This animation infrastructure is part of the HesaabPlus Super Admin Dashboard and follows the same licensing terms.