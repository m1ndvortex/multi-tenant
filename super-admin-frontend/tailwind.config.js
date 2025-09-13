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
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        accent: ['Orbitron', 'Inter', 'sans-serif'],
      },
      colors: {
        // Original shadcn/ui colors
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
        
        // Cybersecurity Theme Colors
        cyber: {
          bg: {
            primary: 'var(--cyber-bg-primary)',
            secondary: 'var(--cyber-bg-secondary)',
            surface: 'var(--cyber-bg-surface)',
            elevated: 'var(--cyber-bg-elevated)',
          },
          neon: {
            primary: 'var(--cyber-neon-primary)',
            secondary: 'var(--cyber-neon-secondary)',
            warning: 'var(--cyber-neon-warning)',
            danger: 'var(--cyber-neon-danger)',
            info: 'var(--cyber-neon-info)',
            success: 'var(--cyber-neon-success)',
          },
          text: {
            primary: 'var(--cyber-text-primary)',
            secondary: 'var(--cyber-text-secondary)',
            muted: 'var(--cyber-text-muted)',
            inverse: 'var(--cyber-text-inverse)',
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'cyber-grid': 'radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 50%), linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px)',
        'cyber-gradient': 'linear-gradient(135deg, var(--cyber-bg-primary) 0%, var(--cyber-bg-secondary) 50%, var(--cyber-bg-surface) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'cyber-glow-sm': '0 0 10px currentColor',
        'cyber-glow': '0 0 20px currentColor',
        'cyber-glow-lg': '0 0 30px currentColor',
        'cyber-glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'cyber-glass-hover': '0 12px 40px rgba(0, 0, 0, 0.4)',
        'neon-cyan': '0 0 20px #00ffff',
        'neon-green': '0 0 20px #00ff88',
        'neon-orange': '0 0 20px #ffaa00',
        'neon-pink': '0 0 20px #ff0066',
        'neon-blue': '0 0 20px #0088ff',
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
        "cyber-pulse": {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        "cyber-glow": {
          '0%, 100%': { 
            boxShadow: '0 0 5px currentColor',
          },
          '50%': { 
            boxShadow: '0 0 20px currentColor, 0 0 30px currentColor',
          },
        },
        "cyber-slide-in": {
          '0%': { 
            transform: 'translateX(-100%)',
            opacity: 0,
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: 1,
          },
        },
        "cyber-slide-in-rtl": {
          '0%': { 
            transform: 'translateX(100%)',
            opacity: 0,
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: 1,
          },
        },
        "cyber-fade-in": {
          '0%': { 
            opacity: 0,
            transform: 'translateY(10px)',
          },
          '100%': { 
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "cyber-pulse": "cyber-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "cyber-glow": "cyber-glow 2s ease-in-out infinite",
        "cyber-slide-in": "cyber-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-slide-in-rtl": "cyber-slide-in-rtl 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "cyber-fade-in": "cyber-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        'cyber-fast': 'var(--cyber-duration-fast)',
        'cyber-normal': 'var(--cyber-duration-normal)',
        'cyber-slow': 'var(--cyber-duration-slow)',
      },
      transitionTimingFunction: {
        'cyber-smooth': 'var(--cyber-easing-smooth)',
        'cyber-bounce': 'var(--cyber-easing-bounce)',
        'cyber-sharp': 'var(--cyber-easing-sharp)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    function({ addUtilities }) {
      const newUtilities = {
        '.glass-morphism': {
          'backdrop-filter': 'blur(16px)',
          'background': 'var(--cyber-glass-bg)',
          'border': '1px solid var(--cyber-glass-border)',
          'box-shadow': 'var(--cyber-glass-shadow)',
        },
        '.glass-morphism-hover:hover': {
          'background': 'var(--cyber-glass-bg-hover)',
          'border-color': 'var(--cyber-glass-border-hover)',
          'box-shadow': 'var(--cyber-glass-shadow-hover)',
        },
        '.neon-glow': {
          'box-shadow': 'var(--cyber-glow-medium)',
        },
        '.cyber-text-glow': {
          'text-shadow': '0 0 8px currentColor',
        },
        '.rtl-flip': {
          'transform': 'scaleX(-1)',
        },
        '[dir="rtl"] .rtl-auto-flip': {
          'transform': 'scaleX(-1)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}