/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        persian: ['Vazirmatn', 'Tahoma', 'Arial Unicode MS', 'sans-serif'],
        cyber: ['Orbitron', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        'cyber-accent': ['Orbitron', 'Inter', 'sans-serif'],
        'cyber-mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'cyber-xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],
        'cyber-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
        'cyber-base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.025em' }],
        'cyber-lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0.025em' }],
        'cyber-xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '0.025em' }],
        'cyber-2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0.025em' }],
        'cyber-3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '0.025em' }],
        'cyber-4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '0.025em' }],
        'cyber-5xl': ['3rem', { lineHeight: '1', letterSpacing: '0.025em' }],
        'cyber-6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '0.025em' }],
        'persian-sm': ['0.875rem', { lineHeight: '1.5rem' }],
        'persian-base': ['1rem', { lineHeight: '1.75rem' }],
        'persian-lg': ['1.125rem', { lineHeight: '1.875rem' }],
        'persian-xl': ['1.25rem', { lineHeight: '2rem' }],
        'persian-2xl': ['1.5rem', { lineHeight: '2.25rem' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Cybersecurity Theme Colors - Enhanced Palette
        cyber: {
          bg: {
            primary: '#0B0E1A',      // Deep space dark
            secondary: '#1A1D29',    // Dark blue-gray
            surface: '#252A3A',      // Card surface
            elevated: '#2D3348',     // Elevated elements
            overlay: '#0B0E1A',      // Modal overlay
            glass: 'rgba(255, 255, 255, 0.03)',
            'glass-hover': 'rgba(255, 255, 255, 0.05)',
            'glass-elevated': 'rgba(255, 255, 255, 0.08)',
          },
          neon: {
            primary: '#00D4FF',      // Bright cyan
            secondary: '#00FF88',    // Matrix green
            tertiary: '#FF6B35',     // Orange accent
            warning: '#FFB800',      // Golden yellow
            danger: '#FF4757',       // Bright red
            info: '#5352ED',         // Purple blue
            success: '#00FF88',      // Success green
            purple: '#A55EEA',       // Purple accent
            pink: '#FF6B9D',         // Pink accent
            blue: '#4DABF7',         // Light blue
            indigo: '#748FFC',       // Indigo
            violet: '#9775FA',       // Violet
            teal: '#20C997',         // Teal
            lime: '#82C91E',         // Lime
            yellow: '#FAB005',       // Yellow
            orange: '#FD7E14',       // Orange
            red: '#FA5252',          // Red
          },
          text: {
            primary: '#FFFFFF',      // Pure white
            secondary: '#B8BCC8',    // Light gray
            muted: '#6B7280',        // Muted gray
            disabled: '#4B5563',     // Disabled gray
            neon: '#00D4FF',         // Neon cyan
            numbers: '#00FF88',      // Matrix green numbers
            inverse: '#0B0E1A',      // Dark inverse
            accent: '#A55EEA',       // Purple accent text
            warning: '#FFB800',      // Warning text
            danger: '#FF4757',       // Danger text
            success: '#00FF88',      // Success text
            info: '#5352ED',         // Info text
          },
          glass: {
            bg: 'rgba(255, 255, 255, 0.03)',
            'bg-hover': 'rgba(255, 255, 255, 0.05)',
            'bg-elevated': 'rgba(255, 255, 255, 0.08)',
            border: 'rgba(255, 255, 255, 0.06)',
            'border-hover': 'rgba(255, 255, 255, 0.08)',
            'border-elevated': 'rgba(255, 255, 255, 0.12)',
            shadow: 'rgba(0, 0, 0, 0.4)',
            'shadow-hover': 'rgba(0, 0, 0, 0.5)',
            'shadow-elevated': 'rgba(0, 0, 0, 0.6)',
          },
          border: {
            default: 'rgba(255, 255, 255, 0.08)',
            subtle: 'rgba(255, 255, 255, 0.04)',
            strong: 'rgba(255, 255, 255, 0.12)',
            neon: 'rgba(0, 212, 255, 0.3)',
            success: 'rgba(0, 255, 136, 0.3)',
            warning: 'rgba(255, 184, 0, 0.3)',
            danger: 'rgba(255, 71, 87, 0.3)',
            info: 'rgba(83, 82, 237, 0.3)',
            purple: 'rgba(165, 94, 234, 0.3)',
          },
          gradient: {
            primary: 'linear-gradient(135deg, #0B0E1A 0%, #1A1D29 50%, #252A3A 100%)',
            card: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            neon: 'linear-gradient(90deg, #00D4FF 0%, #00FF88 50%, #FF6B35 100%)',
            'neon-alt': 'linear-gradient(135deg, #00D4FF 0%, #A55EEA 50%, #FF6B35 100%)',
            'cyber-card': 'linear-gradient(145deg, rgba(37, 42, 58, 0.8) 0%, rgba(26, 29, 41, 0.9) 50%, rgba(11, 14, 26, 0.95) 100%)',
            'glass-subtle': 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            'glass-elevated': 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
            'neon-glow': 'radial-gradient(circle at center, rgba(0, 212, 255, 0.2) 0%, transparent 70%)',
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'cyber-xs': '0.25rem',
        'cyber-sm': '0.375rem',
        'cyber-md': '0.5rem',
        'cyber-lg': '0.75rem',
        'cyber-xl': '1rem',
        'cyber-2xl': '1.5rem',
        'cyber-3xl': '2rem',
        'cyber-card': '1rem',
        'cyber-button': '0.5rem',
        'cyber-input': '0.375rem',
        'cyber-modal': '1rem',
      },
      spacing: {
        'cyber-xs': '0.125rem',
        'cyber-sm': '0.25rem',
        'cyber-md': '0.5rem',
        'cyber-lg': '1rem',
        'cyber-xl': '1.5rem',
        'cyber-2xl': '2rem',
        'cyber-3xl': '3rem',
        'cyber-4xl': '4rem',
        'cyber-5xl': '6rem',
        'cyber-6xl': '8rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'cyber-gradient-primary': 'linear-gradient(135deg, #0B0E1A 0%, #1A1D29 50%, #252A3A 100%)',
        'cyber-gradient-card': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'cyber-gradient-neon': 'linear-gradient(90deg, #00D4FF 0%, #00FF88 50%, #FF6B35 100%)',
        'cyber-gradient-neon-alt': 'linear-gradient(135deg, #00D4FF 0%, #A55EEA 50%, #FF6B35 100%)',
        'cyber-gradient-glass': 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'cyber-gradient-glass-elevated': 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
        'cyber-gradient-crypto-card': 'linear-gradient(145deg, rgba(37, 42, 58, 0.8) 0%, rgba(26, 29, 41, 0.9) 50%, rgba(11, 14, 26, 0.95) 100%)',
        'cyber-radial-glow': 'radial-gradient(circle at center, rgba(0, 212, 255, 0.2) 0%, transparent 70%)',
        'cyber-radial-glow-green': 'radial-gradient(circle at center, rgba(0, 255, 136, 0.2) 0%, transparent 70%)',
        'cyber-radial-glow-orange': 'radial-gradient(circle at center, rgba(255, 107, 53, 0.2) 0%, transparent 70%)',
        'cyber-radial-glow-purple': 'radial-gradient(circle at center, rgba(165, 94, 234, 0.2) 0%, transparent 70%)',
        'cyber-mesh-gradient': 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 255, 136, 0.05) 25%, rgba(255, 107, 53, 0.05) 50%, rgba(165, 94, 234, 0.1) 100%)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        // Cybersecurity Theme Animations
        "cyber-fade-in": {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        "cyber-fade-in-up": {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        "cyber-fade-in-down": {
          '0%': { opacity: '0', transform: 'translateY(-40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        "cyber-slide-in": {
          '0%': { opacity: '0', transform: 'translateX(-100px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        "cyber-slide-in-rtl": {
          '0%': { opacity: '0', transform: 'translateX(100px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        "cyber-slide-out": {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(-100px)' },
        },
        "cyber-slide-out-rtl": {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100px)' },
        },
        "cyber-scale-in": {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        "cyber-scale-out": {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.8)' },
        },
        "cyber-bounce-in": {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Neon and Glow Effects
        "neon-pulse": {
          '0%, 100%': { 
            boxShadow: '0 0 5px currentColor',
            textShadow: '0 0 5px currentColor'
          },
          '50%': { 
            boxShadow: '0 0 20px currentColor, 0 0 30px currentColor',
            textShadow: '0 0 10px currentColor, 0 0 20px currentColor'
          },
        },
        "neon-pulse-strong": {
          '0%, 100%': { 
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor',
            textShadow: '0 0 8px currentColor'
          },
          '50%': { 
            boxShadow: '0 0 30px currentColor, 0 0 50px currentColor, 0 0 70px currentColor',
            textShadow: '0 0 15px currentColor, 0 0 25px currentColor'
          },
        },
        "neon-glow": {
          '0%, 100%': { 
            filter: 'drop-shadow(0 0 5px currentColor)',
          },
          '50%': { 
            filter: 'drop-shadow(0 0 20px currentColor) drop-shadow(0 0 30px currentColor)',
          },
        },
        "gradient-border": {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        "gradient-border-rotate": {
          '0%': { backgroundPosition: '0% 0%' },
          '25%': { backgroundPosition: '100% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '75%': { backgroundPosition: '0% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        "gradient-shift": {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // Scanning and Loading Effects
        "scan-line": {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        "scan-line-horizontal": {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100vw)' },
        },
        "scan-line-horizontal-rtl": {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100vw)' },
        },
        "loading-dots": {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
        "loading-pulse": {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        "loading-spin": {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Rotation and Transform Effects
        "glow-rotate": {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        "glow-rotate-reverse": {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        "float": {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        "float-reverse": {
          '0%, 100%': { transform: 'translateY(-10px)' },
          '50%': { transform: 'translateY(0px)' },
        },
        "wiggle": {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        // Data and Number Animations
        "number-count": {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        "status-blink": {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        "progress-fill": {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        // Modal and Dialog Animations
        "modal-overlay-in": {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        "modal-overlay-out": {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        "modal-content-in": {
          '0%': { opacity: '0', transform: 'scale(0.8) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        "modal-content-out": {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.8) translateY(20px)' },
        },
        // Stagger Animations
        "stagger-fade-in": {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        "stagger-slide-in": {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        "stagger-slide-in-rtl": {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Cybersecurity Theme Animations
        "cyber-fade-in": "cyber-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-fade-in-fast": "cyber-fade-in 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-fade-in-slow": "cyber-fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-fade-in-up": "cyber-fade-in-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-fade-in-down": "cyber-fade-in-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-slide-in": "cyber-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-slide-in-rtl": "cyber-slide-in-rtl 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-slide-out": "cyber-slide-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-slide-out-rtl": "cyber-slide-out-rtl 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-scale-in": "cyber-scale-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-scale-out": "cyber-scale-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-bounce-in": "cyber-bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        // Neon and Glow Animations
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        "neon-pulse-fast": "neon-pulse 1s ease-in-out infinite",
        "neon-pulse-slow": "neon-pulse 3s ease-in-out infinite",
        "neon-pulse-strong": "neon-pulse-strong 2s ease-in-out infinite",
        "neon-glow": "neon-glow 2s ease-in-out infinite",
        "gradient-border": "gradient-border 3s ease infinite",
        "gradient-border-fast": "gradient-border 1.5s ease infinite",
        "gradient-border-slow": "gradient-border 6s ease infinite",
        "gradient-border-rotate": "gradient-border-rotate 4s ease infinite",
        "gradient-shift": "gradient-shift 3s ease infinite",
        // Scanning and Loading Animations
        "scan-line": "scan-line 2s linear infinite",
        "scan-line-fast": "scan-line 1s linear infinite",
        "scan-line-horizontal": "scan-line-horizontal 2s linear infinite",
        "scan-line-horizontal-rtl": "scan-line-horizontal-rtl 2s linear infinite",
        "loading-dots": "loading-dots 1.4s ease-in-out infinite",
        "loading-pulse": "loading-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "loading-spin": "loading-spin 1s linear infinite",
        // Rotation and Transform Animations
        "glow-rotate": "glow-rotate 8s linear infinite",
        "glow-rotate-fast": "glow-rotate 4s linear infinite",
        "glow-rotate-reverse": "glow-rotate-reverse 8s linear infinite",
        "float": "float 3s ease-in-out infinite",
        "float-fast": "float 2s ease-in-out infinite",
        "float-reverse": "float-reverse 3s ease-in-out infinite",
        "wiggle": "wiggle 1s ease-in-out infinite",
        // Data and Number Animations
        "number-count": "number-count 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "status-blink": "status-blink 1s ease-in-out infinite",
        "progress-fill": "progress-fill 1s ease-out",
        // Modal and Dialog Animations
        "modal-overlay-in": "modal-overlay-in 0.2s ease-out",
        "modal-overlay-out": "modal-overlay-out 0.2s ease-in",
        "modal-content-in": "modal-content-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "modal-content-out": "modal-content-out 0.2s cubic-bezier(0.4, 0, 1, 1)",
        // Stagger Animations (use with animation-delay utilities)
        "stagger-fade-in": "stagger-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "stagger-slide-in": "stagger-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "stagger-slide-in-rtl": "stagger-slide-in-rtl 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      animationDelay: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
      animationDuration: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
        '1500': '1500ms',
        '2000': '2000ms',
        '3000': '3000ms',
        '4000': '4000ms',
        '5000': '5000ms',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
        'cyber-light': '8px',
        'cyber-medium': '16px',
        'cyber-heavy': '24px',
        'cyber-extreme': '32px',
      },
      backdropSaturate: {
        25: '.25',
        50: '.5',
        75: '.75',
        100: '1',
        125: '1.25',
        150: '1.5',
        175: '1.75',
        200: '2',
      },
      backdropBrightness: {
        25: '.25',
        50: '.5',
        75: '.75',
        90: '.9',
        95: '.95',
        100: '1',
        105: '1.05',
        110: '1.1',
        125: '1.25',
        150: '1.5',
        200: '2',
      },
      boxShadow: {
        // Neon Glow Shadows
        'neon-cyan': '0 0 20px rgba(0, 212, 255, 0.4)',
        'neon-cyan-sm': '0 0 10px rgba(0, 212, 255, 0.3)',
        'neon-cyan-lg': '0 0 30px rgba(0, 212, 255, 0.5)',
        'neon-cyan-xl': '0 0 40px rgba(0, 212, 255, 0.6)',
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.4)',
        'neon-green-sm': '0 0 10px rgba(0, 255, 136, 0.3)',
        'neon-green-lg': '0 0 30px rgba(0, 255, 136, 0.5)',
        'neon-green-xl': '0 0 40px rgba(0, 255, 136, 0.6)',
        'neon-orange': '0 0 20px rgba(255, 107, 53, 0.4)',
        'neon-orange-sm': '0 0 10px rgba(255, 107, 53, 0.3)',
        'neon-orange-lg': '0 0 30px rgba(255, 107, 53, 0.5)',
        'neon-orange-xl': '0 0 40px rgba(255, 107, 53, 0.6)',
        'neon-purple': '0 0 20px rgba(165, 94, 234, 0.4)',
        'neon-purple-sm': '0 0 10px rgba(165, 94, 234, 0.3)',
        'neon-purple-lg': '0 0 30px rgba(165, 94, 234, 0.5)',
        'neon-purple-xl': '0 0 40px rgba(165, 94, 234, 0.6)',
        'neon-pink': '0 0 20px rgba(255, 71, 87, 0.4)',
        'neon-pink-sm': '0 0 10px rgba(255, 71, 87, 0.3)',
        'neon-pink-lg': '0 0 30px rgba(255, 71, 87, 0.5)',
        'neon-pink-xl': '0 0 40px rgba(255, 71, 87, 0.6)',
        'neon-blue': '0 0 20px rgba(83, 82, 237, 0.4)',
        'neon-blue-sm': '0 0 10px rgba(83, 82, 237, 0.3)',
        'neon-blue-lg': '0 0 30px rgba(83, 82, 237, 0.5)',
        'neon-blue-xl': '0 0 40px rgba(83, 82, 237, 0.6)',
        'neon-yellow': '0 0 20px rgba(255, 184, 0, 0.4)',
        'neon-yellow-sm': '0 0 10px rgba(255, 184, 0, 0.3)',
        'neon-yellow-lg': '0 0 30px rgba(255, 184, 0, 0.5)',
        'neon-yellow-xl': '0 0 40px rgba(255, 184, 0, 0.6)',
        // Multi-Color Neon Effects
        'neon-multi': '0 0 30px rgba(0, 212, 255, 0.2), 0 0 60px rgba(0, 255, 136, 0.1)',
        'neon-multi-strong': '0 0 20px rgba(0, 212, 255, 0.4), 0 0 40px rgba(0, 255, 136, 0.3), 0 0 60px rgba(255, 107, 53, 0.2)',
        'neon-rainbow': '0 0 15px rgba(0, 212, 255, 0.3), 0 0 30px rgba(0, 255, 136, 0.2), 0 0 45px rgba(255, 107, 53, 0.1), 0 0 60px rgba(165, 94, 234, 0.1)',
        // Cybersecurity Specific Shadows
        'cyber-glow': '0 0 15px rgba(0, 212, 255, 0.3)',
        'cyber-glow-strong': '0 0 25px rgba(0, 212, 255, 0.4), 0 0 50px rgba(0, 212, 255, 0.2)',
        'cyber-card': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'cyber-card-hover': '0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'cyber-elevated': '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'cyber-elevated-hover': '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'cyber-modal': '0 25px 80px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'cyber-button': '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'cyber-button-hover': '0 6px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'cyber-input': '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'cyber-input-focus': '0 4px 12px rgba(0, 212, 255, 0.2), 0 0 0 2px rgba(0, 212, 255, 0.1)',
        // Glass Effect Shadows
        'glass-subtle': '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-medium': '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glass-strong': '0 16px 48px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-neon': '0 8px 32px rgba(0, 212, 255, 0.15), 0 0 20px rgba(0, 212, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        // Status Shadows
        'status-online': '0 0 15px rgba(0, 255, 136, 0.4), 0 0 30px rgba(0, 255, 136, 0.2)',
        'status-warning': '0 0 15px rgba(255, 184, 0, 0.4), 0 0 30px rgba(255, 184, 0, 0.2)',
        'status-error': '0 0 15px rgba(255, 71, 87, 0.4), 0 0 30px rgba(255, 71, 87, 0.2)',
        'status-info': '0 0 15px rgba(83, 82, 237, 0.4), 0 0 30px rgba(83, 82, 237, 0.2)',
        // Inner Shadows for Depth
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
        'inner-glow-strong': 'inset 0 2px 0 rgba(255, 255, 255, 0.15), inset 0 -2px 0 rgba(0, 0, 0, 0.15)',
        'inner-neon': 'inset 0 1px 0 rgba(0, 212, 255, 0.2), inset 0 -1px 0 rgba(0, 212, 255, 0.1)',
      },
      dropShadow: {
        'neon-cyan': '0 0 8px rgba(0, 212, 255, 0.5)',
        'neon-green': '0 0 8px rgba(0, 255, 136, 0.5)',
        'neon-orange': '0 0 8px rgba(255, 107, 53, 0.5)',
        'neon-purple': '0 0 8px rgba(165, 94, 234, 0.5)',
        'neon-pink': '0 0 8px rgba(255, 71, 87, 0.5)',
        'neon-blue': '0 0 8px rgba(83, 82, 237, 0.5)',
        'neon-yellow': '0 0 8px rgba(255, 184, 0, 0.5)',
        'cyber-text': '0 0 6px rgba(0, 212, 255, 0.4)',
        'cyber-number': '0 0 12px rgba(0, 255, 136, 0.6)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    // Custom Cybersecurity Theme Plugin
    function({ addUtilities, addComponents, theme }) {
      // Glassmorphism Utilities
      addUtilities({
        '.glass-base': {
          'backdrop-filter': 'blur(20px) saturate(180%)',
          'background': 'rgba(255, 255, 255, 0.03)',
          'border': '1px solid rgba(255, 255, 255, 0.06)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        },
        '.glass-card': {
          'backdrop-filter': 'blur(20px) saturate(180%)',
          'background': 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          'border': '1px solid rgba(255, 255, 255, 0.06)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          'border-radius': '1rem',
        },
        '.glass-card-crypto': {
          'backdrop-filter': 'blur(16px) saturate(150%)',
          'background': 'linear-gradient(145deg, rgba(37, 42, 58, 0.8) 0%, rgba(26, 29, 41, 0.9) 50%, rgba(11, 14, 26, 0.95) 100%)',
          'border': '1px solid rgba(255, 255, 255, 0.04)',
          'box-shadow': '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
          'border-radius': '1rem',
        },
        '.glass-elevated': {
          'backdrop-filter': 'blur(25px) saturate(200%)',
          'background': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          'border': '1px solid rgba(255, 255, 255, 0.08)',
          'box-shadow': '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        },
        '.glass-neon': {
          'backdrop-filter': 'blur(20px) saturate(180%)',
          'background': 'linear-gradient(145deg, rgba(0,212,255,0.08) 0%, rgba(0,255,136,0.04) 100%)',
          'border': '1px solid rgba(0, 212, 255, 0.2)',
          'box-shadow': '0 8px 32px rgba(0, 212, 255, 0.15), 0 0 20px rgba(0, 212, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        },
        '.glass-modal': {
          'backdrop-filter': 'blur(25px) saturate(200%)',
          'background': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          'border': '1px solid rgba(255, 255, 255, 0.08)',
          'box-shadow': '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          'border-radius': '1rem',
        },
        '.glass-navigation': {
          'backdrop-filter': 'blur(20px) saturate(180%)',
          'background': 'rgba(255, 255, 255, 0.03)',
          'border-right': '1px solid rgba(255, 255, 255, 0.06)',
        },
      });

      // Neon Effect Utilities
      addUtilities({
        '.neon-glow-primary': {
          'box-shadow': '0 0 20px rgba(0, 212, 255, 0.4)',
        },
        '.neon-glow-secondary': {
          'box-shadow': '0 0 20px rgba(0, 255, 136, 0.4)',
        },
        '.neon-glow-tertiary': {
          'box-shadow': '0 0 20px rgba(255, 107, 53, 0.4)',
        },
        '.neon-glow-multi': {
          'box-shadow': '0 0 30px rgba(0, 212, 255, 0.2), 0 0 60px rgba(0, 255, 136, 0.1)',
        },
        '.neon-text-primary': {
          'color': '#00D4FF',
          'text-shadow': '0 0 8px rgba(0, 212, 255, 0.5)',
        },
        '.neon-text-secondary': {
          'color': '#00FF88',
          'text-shadow': '0 0 8px rgba(0, 255, 136, 0.5)',
        },
        '.neon-text-numbers': {
          'color': '#00FF88',
          'text-shadow': '0 0 12px rgba(0, 255, 136, 0.6)',
          'font-weight': '700',
        },
        '.neon-border-gradient': {
          'position': 'relative',
          '&::before': {
            'content': '""',
            'position': 'absolute',
            'inset': '0',
            'padding': '1px',
            'background': 'linear-gradient(90deg, #00D4FF, #00FF88, #FF6B35)',
            'border-radius': 'inherit',
            'mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            'mask-composite': 'xor',
            '-webkit-mask-composite': 'xor',
          },
        },
      });

      // Cybersecurity Component Utilities
      addUtilities({
        '.cyber-button': {
          'position': 'relative',
          'overflow': 'hidden',
          'font-weight': '500',
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          'backdrop-filter': 'blur(16px)',
          'border-radius': '0.5rem',
        },
        '.cyber-button-primary': {
          'background': '#252A3A',
          'border': '1px solid #00D4FF',
          'color': '#00D4FF',
          '&:hover': {
            'background': '#00D4FF',
            'color': '#0B0E1A',
            'box-shadow': '0 0 20px rgba(0, 212, 255, 0.4)',
            'transform': 'scale(1.05)',
          },
        },
        '.cyber-input': {
          'background': 'rgba(255, 255, 255, 0.03)',
          'border': '1px solid rgba(255, 255, 255, 0.06)',
          'color': '#FFFFFF',
          'backdrop-filter': 'blur(16px)',
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus': {
            'outline': 'none',
            'border-color': '#00D4FF',
            'box-shadow': '0 0 0 2px rgba(0, 212, 255, 0.2)',
            'background': 'rgba(255, 255, 255, 0.05)',
          },
          '&::placeholder': {
            'color': '#6B7280',
          },
        },
        '.cyber-nav-item': {
          'position': 'relative',
          'display': 'flex',
          'align-items': 'center',
          'padding': '12px 16px',
          'font-weight': '500',
          'border-radius': '0.5rem',
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          'color': '#B8BCC8',
          '&:hover': {
            'color': '#00D4FF',
            'background': 'rgba(255, 255, 255, 0.05)',
            'transform': 'translateX(5px)',
          },
          '&.active': {
            'color': '#00D4FF',
            'background': 'rgba(0, 212, 255, 0.15)',
            'border-right': '2px solid #00D4FF',
            'box-shadow': '0 0 15px rgba(0, 212, 255, 0.2)',
            'transform': 'translateX(10px)',
          },
        },
        '.cyber-table': {
          'background': 'rgba(255, 255, 255, 0.03)',
          'backdrop-filter': 'blur(16px)',
          'border': '1px solid rgba(255, 255, 255, 0.06)',
          'border-radius': '0.75rem',
          'overflow': 'hidden',
        },
        '.cyber-table-header': {
          'background': 'rgba(45, 51, 72, 0.5)',
          'color': '#FFFFFF',
          'border-bottom': '1px solid rgba(255, 255, 255, 0.06)',
        },
        '.cyber-table-row': {
          'border-bottom': '1px solid rgba(255, 255, 255, 0.05)',
          'transition': 'background-color 0.2s ease',
          '&:hover': {
            'background': 'rgba(255, 255, 255, 0.05)',
          },
        },
        '.cyber-table-cell': {
          'padding': '16px 24px',
          'color': '#B8BCC8',
        },
      });

      // RTL Support Utilities
      addUtilities({
        '.rtl\\:mr-auto': {
          '[dir="rtl"] &': {
            'margin-right': 'auto',
            'margin-left': '0',
          },
        },
        '.rtl\\:ml-auto': {
          '[dir="rtl"] &': {
            'margin-left': 'auto',
            'margin-right': '0',
          },
        },
        '.rtl\\:pr-4': {
          '[dir="rtl"] &': {
            'padding-right': '1rem',
            'padding-left': '0',
          },
        },
        '.rtl\\:pl-4': {
          '[dir="rtl"] &': {
            'padding-left': '1rem',
            'padding-right': '0',
          },
        },
        '.rtl\\:border-r': {
          '[dir="rtl"] &': {
            'border-right': '1px solid',
            'border-left': 'none',
          },
        },
        '.rtl\\:border-l': {
          '[dir="rtl"] &': {
            'border-left': '1px solid',
            'border-right': 'none',
          },
        },
        '.rtl\\:text-right': {
          '[dir="rtl"] &': {
            'text-align': 'right',
          },
        },
        '.rtl\\:text-left': {
          '[dir="rtl"] &': {
            'text-align': 'left',
          },
        },
        '.rtl\\:translate-x-reverse': {
          '[dir="rtl"] &': {
            'transform': 'translateX(-5px)',
          },
        },
        '.rtl\\:translate-x-reverse-active': {
          '[dir="rtl"] &': {
            'transform': 'translateX(-10px)',
          },
        },
      });

      // Status Indicator Utilities
      addUtilities({
        '.status-online': {
          'color': '#00FF88',
          'background': 'rgba(0, 255, 136, 0.2)',
          'border': '1px solid rgba(0, 255, 136, 0.3)',
          'box-shadow': '0 0 10px rgba(0, 255, 136, 0.3)',
        },
        '.status-warning': {
          'color': '#FFB800',
          'background': 'rgba(255, 184, 0, 0.2)',
          'border': '1px solid rgba(255, 184, 0, 0.3)',
          'box-shadow': '0 0 10px rgba(255, 184, 0, 0.3)',
        },
        '.status-error': {
          'color': '#FF4757',
          'background': 'rgba(255, 71, 87, 0.2)',
          'border': '1px solid rgba(255, 71, 87, 0.3)',
          'box-shadow': '0 0 10px rgba(255, 71, 87, 0.3)',
        },
        '.status-info': {
          'color': '#5352ED',
          'background': 'rgba(83, 82, 237, 0.2)',
          'border': '1px solid rgba(83, 82, 237, 0.3)',
          'box-shadow': '0 0 10px rgba(83, 82, 237, 0.3)',
        },
      });

      // Persian Font Utilities
      addUtilities({
        '.font-persian': {
          'font-family': "'Vazirmatn', 'Tahoma', 'Arial Unicode MS', sans-serif",
        },
        '.font-persian-mono': {
          'font-family': "'JetBrains Mono', 'Fira Code', monospace",
        },
        '.font-cyber': {
          'font-family': "'Orbitron', 'Inter', sans-serif",
        },
        '.font-cyber-mono': {
          'font-family': "'JetBrains Mono', 'Fira Code', monospace",
        },
      });

      // Animation Utilities
      addUtilities({
        '.animate-delay-75': {
          'animation-delay': '75ms',
        },
        '.animate-delay-100': {
          'animation-delay': '100ms',
        },
        '.animate-delay-150': {
          'animation-delay': '150ms',
        },
        '.animate-delay-200': {
          'animation-delay': '200ms',
        },
        '.animate-delay-300': {
          'animation-delay': '300ms',
        },
        '.animate-delay-500': {
          'animation-delay': '500ms',
        },
        '.animate-delay-700': {
          'animation-delay': '700ms',
        },
        '.animate-delay-1000': {
          'animation-delay': '1000ms',
        },
      });
    },
  ],
}