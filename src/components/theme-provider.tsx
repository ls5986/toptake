"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProviderProps } from "next-themes/dist/types"
import { useAppContext } from '@/contexts/AppContext'
import { Theme, themes, getThemeClass, getThemeTransition } from '@/lib/themes'

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
  availableThemes: typeof themes
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  value: _value,
  ...props
}: ThemeProviderProps) {
  const { user } = useAppContext?.() || {}
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme")
      return (savedTheme && themes.some(t => t.id === savedTheme)
        ? savedTheme
        : defaultTheme) as Theme
    }
    return defaultTheme as Theme
  })

  useEffect(() => {
    if (user?.theme_id && themes.some(t => t.id === user.theme_id)) {
      setTheme(user.theme_id as Theme)
    }
  }, [user?.theme_id])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove(...themes.map(t => `theme-${t.id}`))
    root.classList.add(getThemeTransition())

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      root.classList.add(getThemeClass(systemTheme as Theme))
      return
    }

    root.classList.add(getThemeClass(theme))
  }, [theme])

  const value: ThemeContextType = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem("theme", theme)
      setTheme(theme)
    },
    availableThemes: themes
  }

  return (
    <ThemeContext.Provider value={value} {...props}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export function isPremiumTheme(themeId: string) {
  return themeId === 'orange_glow'
}
