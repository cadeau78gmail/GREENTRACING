const mixColors = (hex1, hex2, ratio) => {
  const parse = (hex) => {
    const clean = hex.replace('#', '')
    const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean
    const num = Number.parseInt(full, 16)
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    }
  }

  const toHex = (value) => value.toString(16).padStart(2, '0')
  const a = parse(hex1)
  const b = parse(hex2)

  return `#${toHex(Math.round(a.r + (b.r - a.r) * ratio))}${toHex(Math.round(a.g + (b.g - a.g) * ratio))}${toHex(Math.round(a.b + (b.b - a.b) * ratio))}`
}

const defaultTheme = {
  colors: {
    accent: '#033923',
    accentDark: '#033923',
    accentLight: '#285a4a',
    success: '#033923',
    successLight: '#285a4a',
    bg: '#f7f8f7',
    surface: '#ffffff',
    surfaceAlt: '#f0f4f1',
    border: '#e2e9e4'
  },
  fonts: {
    display: "'Manrope', system-ui, sans-serif",
    body: "'Manrope', system-ui, sans-serif"
  }
}

const buildDarkPalette = (colors) => ({
  accent: colors.accent,
  accentDark: colors.accentDark,
  accentLight: colors.accentLight,
  success: colors.success,
  successLight: colors.successLight,
  bg: mixColors(colors.bg, '#0d1413', 0.82),
  surface: mixColors(colors.surface, '#0d1413', 0.7),
  surfaceAlt: mixColors(colors.surfaceAlt, '#0d1413', 0.6),
  border: mixColors(colors.border, '#0d1413', 0.45)
})

export const darkTheme = {
  colors: buildDarkPalette(defaultTheme.colors),
  fonts: defaultTheme.fonts
}

defaultTheme.darkColors = buildDarkPalette(defaultTheme.colors)

export default defaultTheme