import { useEffect, useState } from 'react'
import { ThemeContextProvider } from './ThemeContext.jsx'
import { darkTheme } from './defaultTheme.js'

const fontLinkId = 'org-font-link'

const cssVariables = {
  accent: '--color-accent',
  accentDark: '--color-accent-dark',
  accentLight: '--color-accent-light',
  success: '--color-success',
  successLight: '--color-success-light',
  bg: '--color-bg',
  surface: '--color-surface',
  surfaceAlt: '--color-surface-alt',
  border: '--color-border'
}

const systemFonts = new Set([
  'Arial',
  'Georgia',
  'Helvetica',
  'sans-serif',
  'serif',
  'system-ui',
  'monospace'
])

function getPrimaryFontName(fontStack) {
  return fontStack
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '')
}

function getGoogleFontNames(fonts) {
  return Object.values(fonts)
    .map(getPrimaryFontName)
    .filter((fontName) => fontName && !systemFonts.has(fontName))
}

function updateGoogleFontLink(fonts) {
  document.getElementById(fontLinkId)?.remove()

  const fontNames = [...new Set(getGoogleFontNames(fonts))]
  if (fontNames.length === 0) return

  const link = document.createElement('link')
  link.id = fontLinkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${fontNames
    .map((fontName) => `family=${encodeURIComponent(fontName).replace(/%20/g, '+')}`)
    .join('&')}&display=swap`
  document.head.appendChild(link)
}

export default function ThemeProvider({ theme, children }) {
  const [currentTheme, setTheme] = useState(theme)
  const [mode, setMode] = useState('light')

  useEffect(() => {
    const root = document.documentElement
    root.dataset.mode = mode

    const activeColors = mode === 'dark' ? (currentTheme.darkColors || darkTheme.colors) : currentTheme.colors

    Object.entries(cssVariables).forEach(([themeKey, cssVariable]) => {
      const value = activeColors[themeKey]
      root.style.setProperty(cssVariable, value)
    })

    root.style.setProperty('--font-display', currentTheme.fonts.display)
    root.style.setProperty('--font-body', currentTheme.fonts.body)
    updateGoogleFontLink(currentTheme.fonts)
  }, [currentTheme, mode])

  return (
    <ThemeContextProvider value={{ theme: currentTheme, setTheme, mode, setMode }}>
      {children}
    </ThemeContextProvider>
  )
}