import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px'
      }
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        border: '#232323',
        input: '#232323',
        ring: '#FF5E1A',
        background: '#181818',
        foreground: '#fff',
        primary: {
          DEFAULT: '#FF5E1A',
          foreground: '#fff',
        },
        secondary: {
          DEFAULT: '#FF7C2A',
          foreground: '#fff',
        },
        destructive: {
          DEFAULT: '#FF3B30',
          foreground: '#fff',
        },
        muted: {
          DEFAULT: '#232323',
          foreground: '#B0B0B0',
        },
        accent: {
          DEFAULT: '#fff',
          foreground: '#181818',
        },
        popover: {
          DEFAULT: '#232323',
          foreground: '#fff',
        },
        card: {
          DEFAULT: '#232323',
          foreground: '#fff',
        },
        sidebar: {
          DEFAULT: '#181818',
          foreground: '#fff',
          primary: '#FF5E1A',
          'primary-foreground': '#fff',
          accent: '#FF7C2A',
          'accent-foreground': '#fff',
          border: '#232323',
          ring: '#FF5E1A',
        },
        brand: {
          primary: '#FF5E1A',
          secondary: '#FF7C2A',
          accent: '#fff',
          background: '#181818',
          surface: '#232323',
          border: 'transparent',
          text: '#fff',
          muted: '#B0B0B0',
          danger: '#FF3B30',
          success: '#2ED573',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      borderRadius: {
        lg: 'calc(var(--radius) + 2px)',
        md: 'var(--radius)',
        sm: 'calc(var(--radius) - 2px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
      boxShadow: {
        glow: '0 0 8px 2px #FF5E1A99',
        'button-glow': '0 2px 16px 0 #FF5E1A66',
        'card': '0 2px 24px 0 #FF5E1A22',
        'surface-inset': 'inset 0 1px 4px 0 #00000066',
      },
      backgroundImage: {
        'button-gradient': 'linear-gradient(135deg, #FF5E1A 0%, #FF7C2A 100%)',
        'card-gradient': 'linear-gradient(135deg, #232323 60%, #181818 100%)',
        'brand-gradient': 'linear-gradient(135deg, #FF5E1A 0%, #FFB26B 100%)',
      },
    }
  },
  plugins: [
    animate,
    typography,
  ],
} satisfies Config;