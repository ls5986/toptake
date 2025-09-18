import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export type Theme = "dark" | "light" | "system" | "orange_glow" | "midnight" | "sunset" | "forest" | "ocean" | "high_contrast" | "retro_wave"

export interface ThemeConfig {
  id: Theme
  name: string
  description: string
  premium: boolean
  preview: {
    background: string
    primary: string
    secondary: string
    accent: string
    text: string
  }
}

export const themes: ThemeConfig[] = [
  {
    id: "system",
    name: "System",
    description: "Match your device appearance",
    premium: false,
    preview: {
      background: "#FFFFFF",
      primary: "#FF5E1A",
      secondary: "#FF7C2A",
      accent: "#FFB26B",
      text: "#181818"
    }
  },
  {
    id: "light",
    name: "Light",
    description: "Clean and bright theme for daytime use",
    premium: false,
    preview: {
      background: "#FFFFFF",
      primary: "#FF5E1A",
      secondary: "#FF7C2A",
      accent: "#FFB26B",
      text: "#181818"
    }
  },
  {
    id: "dark",
    name: "Dark",
    description: "Easy on the eyes for nighttime use",
    premium: false,
    preview: {
      background: "#181818",
      primary: "#FF5E1A",
      secondary: "#FF7C2A",
      accent: "#FFB26B",
      text: "#FFFFFF"
    }
  },
  {
    id: "orange_glow",
    name: "Orange Glow",
    description: "Vibrant orange theme with glowing effects",
    premium: false,
    preview: {
      background: "#1A1A1A",
      primary: "#FF5E1A",
      secondary: "#FF7C2A",
      accent: "#FFB26B",
      text: "#FFFFFF"
    }
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep blue theme for late night browsing",
    premium: false,
    preview: {
      background: "#0A192F",
      primary: "#64FFDA",
      secondary: "#8892B0",
      accent: "#112240",
      text: "#CCD6F6"
    }
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm purple and orange gradient theme",
    premium: false,
    preview: {
      background: "#2D1B69",
      primary: "#FF5E1A",
      secondary: "#FF7C2A",
      accent: "#FFB26B",
      text: "#FFFFFF"
    }
  },
  {
    id: "forest",
    name: "Forest",
    description: "Calming green theme inspired by nature",
    premium: false,
    preview: {
      background: "#1A2F1A",
      primary: "#4CAF50",
      secondary: "#81C784",
      accent: "#A5D6A7",
      text: "#E8F5E9"
    }
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool blue theme inspired by the sea",
    premium: false,
    preview: {
      background: "#1A2B3D",
      primary: "#2196F3",
      secondary: "#64B5F6",
      accent: "#90CAF9",
      text: "#E3F2FD"
    }
  },
  {
    id: "high_contrast",
    name: "High Contrast",
    description: "Accessible theme with strong contrast",
    premium: false,
    preview: {
      background: "#000000",
      primary: "#FFFFFF",
      secondary: "#FFD700",
      accent: "#FFFFFF",
      text: "#FFFFFF"
    }
  },
  {
    id: "retro_wave",
    name: "Retro Wave",
    description: "Black base with warm rainbow band accents",
    premium: false,
    preview: {
      background: "#0E0E0E",
      primary: "#F59E0B", // amber
      secondary: "#EF4444", // red
      accent: "#8B5CF6", // violet
      text: "#FFFFFF"
    }
  }
]

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getThemeColors(theme: Theme) {
  const themeConfig = themes.find(t => t.id === theme)
  if (!themeConfig) return themes[0].preview
  return themeConfig.preview
}

export function isPremiumTheme(themeId: Theme) {
  return themes.find(t => t.id === themeId)?.premium || false
}

export function getThemeTransition() {
  return "transition-colors duration-300 ease-in-out"
}

export function getThemeClass(theme: Theme) {
  return cn(
    "theme-transition",
    {
      "theme-light": theme === "light",
      "theme-dark": theme === "dark",
      "theme-orange-glow": theme === "orange_glow",
      "theme-midnight": theme === "midnight",
      "theme-sunset": theme === "sunset",
      "theme-forest": theme === "forest",
      "theme-ocean": theme === "ocean",
      "theme-high-contrast": theme === "high_contrast",
      "theme-retro-wave": theme === "retro_wave"
    }
  )
} 

// ---------- Contrast helpers used across components (mirrors Theme Store preview logic) ----------
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const int = parseInt(v, 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

export function luminance(hex: string): number {
  try {
    const { r, g, b } = hexToRgb(hex)
    const a = [r, g, b].map(v => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
  } catch {
    return 0.5
  }
}

export function isDark(hex: string) { return luminance(hex) < 0.5 }

export function surfaceOver(background: string, strength = 0.08) {
  const dark = isDark(background)
  const alpha = strength
  return dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`
}

export function borderOver(background: string, strength = 0.2) {
  const dark = isDark(background)
  const alpha = strength
  return dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`
}

export function textOn(hexColor: string) { return isDark(hexColor) ? '#FFFFFF' : '#000000' }

export function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

export function deriveThemeSurfaces(preview: { background: string, primary: string, secondary: string, accent: string, text: string }) {
  const surface = surfaceOver(preview.background, 0.08)
  const surfaceAlt = surfaceOver(preview.background, 0.12)
  const border = borderOver(preview.background, 0.2)
  const calloutBg = rgba(preview.primary, 0.15)
  const calloutBorder = rgba(preview.primary, 0.35)
  const chipBg = rgba(preview.accent, 0.18)
  const chipText = textOn(preview.accent)
  return { surface, surfaceAlt, border, calloutBg, calloutBorder, chipBg, chipText }
}