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

const buildDarkPalette = (colors) => ({
  accent: colors.accent,
  accentDark: colors.accentDark,
  accentLight: colors.accentLight,
  success: colors.success,
  successLight: colors.successLight,
  bg: mixColors(colors.bg, '#0d1413', 0.82),
  surface: mixColors(colors.surface, '#0d1413', 0.72),
  surfaceAlt: mixColors(colors.surfaceAlt, '#0d1413', 0.62),
  border: mixColors(colors.border, '#0d1413', 0.45)
})

export const sampleThemes = {
  canopy: {
    name: 'Canopy',
    colors: {
      accent: '#2f8f83',
      accentDark: '#247267',
      accentLight: '#63b8ab',
      success: '#78b84a',
      successLight: '#9bd16f',
      bg: '#f6faf7',
      surface: '#ffffff',
      surfaceAlt: '#edf6f0',
      border: '#d8e9de'
    },
    fonts: {
      display: "'Merriweather', Georgia, serif",
      body: "'Manrope', system-ui, sans-serif"
    }
  },
  signal: {
    name: 'Signal',
    colors: {
      accent: '#3d7eff',
      accentDark: '#2c62d0',
      accentLight: '#78a5ff',
      success: '#2fbf9f',
      successLight: '#65d6bd',
      bg: '#f7f9fc',
      surface: '#ffffff',
      surfaceAlt: '#eef3fb',
      border: '#dbe5f4'
    },
    fonts: {
      display: "'Space Grotesk', system-ui, sans-serif",
      body: "'IBM Plex Sans', system-ui, sans-serif"
    }
  },
  forest: {
    name: 'Forest',
    colors: {
      accent: '#0d5c45',
      accentDark: '#0a4737',
      accentLight: '#70b497',
      success: '#4da86f',
      successLight: '#9ce0b0',
      bg: '#f4faf6',
      surface: '#ffffff',
      surfaceAlt: '#ebf5ee',
      border: '#d7ebdf'
    },
    fonts: {
      display: "'Libre Baskerville', Georgia, serif",
      body: "'Nunito Sans', system-ui, sans-serif"
    }
  },
  sage: {
    name: 'Sage',
    colors: {
      accent: '#698d6a',
      accentDark: '#4f6d52',
      accentLight: '#a6c0a4',
      success: '#90a86a',
      successLight: '#d7e6b8',
      bg: '#f5f7f3',
      surface: '#ffffff',
      surfaceAlt: '#eef4ed',
      border: '#dde8da'
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Poppins', system-ui, sans-serif"
    }
  },
  ocean: {
    name: 'Ocean',
    colors: {
      accent: '#0b6e7a',
      accentDark: '#085863',
      accentLight: '#7cced7',
      success: '#40b8b2',
      successLight: '#99ece6',
      bg: '#f2fbfc',
      surface: '#ffffff',
      surfaceAlt: '#eaf7fa',
      border: '#d5edf1'
    },
    fonts: {
      display: "'Merriweather', Georgia, serif",
      body: "'DM Sans', system-ui, sans-serif"
    }
  },
  sunset: {
    name: 'Sunset',
    colors: {
      accent: '#d95f43',
      accentDark: '#b84f38',
      accentLight: '#f2a178',
      success: '#e7a63a',
      successLight: '#f8d38d',
      bg: '#fff9f4',
      surface: '#ffffff',
      surfaceAlt: '#fff1ea',
      border: '#f5d8cc'
    },
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Outfit', system-ui, sans-serif"
    }
  },
  ember: {
    name: 'Ember',
    colors: {
      accent: '#c15d2f',
      accentDark: '#9e4925',
      accentLight: '#f0a47b',
      success: '#d7851d',
      successLight: '#f6d39f',
      bg: '#fff8f4',
      surface: '#ffffff',
      surfaceAlt: '#fdf0e9',
      border: '#f4d9cc'
    },
    fonts: {
      display: "'Playfair Display', Georgia, serif",
      body: "'Work Sans', system-ui, sans-serif"
    }
  },
  plum: {
    name: 'Plum',
    colors: {
      accent: '#5c3a7a',
      accentDark: '#442b5e',
      accentLight: '#ba9ad7',
      success: '#7d6bb5',
      successLight: '#d1c6f0',
      bg: '#f8f5fc',
      surface: '#ffffff',
      surfaceAlt: '#f0ebfa',
      border: '#dfd6f4'
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'IBM Plex Sans', system-ui, sans-serif"
    }
  },
  coral: {
    name: 'Coral',
    colors: {
      accent: '#f26d6d',
      accentDark: '#d55252',
      accentLight: '#f9a8a8',
      success: '#62b5a6',
      successLight: '#bfe8df',
      bg: '#fff7f6',
      surface: '#ffffff',
      surfaceAlt: '#ffeef0',
      border: '#f7d8d7'
    },
    fonts: {
      display: "'Lora', Georgia, serif",
      body: "'Raleway', system-ui, sans-serif"
    }
  },
  ultra: {
    name: 'Ultra',
    colors: {
      accent: '#111827',
      accentDark: '#050b16',
      accentLight: '#6b7280',
      success: '#10b981',
      successLight: '#6ee7b7',
      bg: '#f9fafb',
      surface: '#ffffff',
      surfaceAlt: '#eef2f7',
      border: '#dde3eb'
    },
    fonts: {
      display: "'Space Grotesk', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif"
    }
  },
  mint: {
    name: 'Mint',
    colors: {
      accent: '#1e9c8f',
      accentDark: '#167d73',
      accentLight: '#7fe2d1',
      success: '#69c37d',
      successLight: '#b9f5c5',
      bg: '#f4fffb',
      surface: '#ffffff',
      surfaceAlt: '#eafbf8',
      border: '#d2f1ea'
    },
    fonts: {
      display: "'Poppins', system-ui, sans-serif",
      body: "'Lora', system-ui, sans-serif"
    }
  },
  sky: {
    name: 'Sky',
    colors: {
      accent: '#2563eb',
      accentDark: '#1d4ed8',
      accentLight: '#93c5fd',
      success: '#14b8a6',
      successLight: '#99f6e4',
      bg: '#f4f8ff',
      surface: '#ffffff',
      surfaceAlt: '#edf4ff',
      border: '#d8e6ff'
    },
    fonts: {
      display: "'Outfit', system-ui, sans-serif",
      body: "'DM Sans', system-ui, sans-serif"
    }
  },
  amethyst: {
    name: 'Amethyst',
    colors: {
      accent: '#7c3aed',
      accentDark: '#5b21b6',
      accentLight: '#c4b5fd',
      success: '#22c55e',
      successLight: '#86efac',
      bg: '#faf7ff',
      surface: '#ffffff',
      surfaceAlt: '#f2ebff',
      border: '#e5d9ff'
    },
    fonts: {
      display: "'Libre Baskerville', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif"
    }
  },
  red: {
    name: 'Red',
    colors: {
      accent: '#c81e1e',
      accentDark: '#971515',
      accentLight: '#f59e9e',
      success: '#e76f51',
      successLight: '#f7d0b5',
      bg: '#fff7f6',
      surface: '#ffffff',
      surfaceAlt: '#feeceb',
      border: '#f7d4cd'
    },
    fonts: {
      display: "'Playfair Display', Georgia, serif",
      body: "'Inter', system-ui, sans-serif"
    }
  },
  blue: {
    name: 'Blue',
    colors: {
      accent: '#2563eb',
      accentDark: '#1d4ed8',
      accentLight: '#93c5fd',
      success: '#0ea5e9',
      successLight: '#bae6fd',
      bg: '#f4f9ff',
      surface: '#ffffff',
      surfaceAlt: '#edf6ff',
      border: '#dbeafe'
    },
    fonts: {
      display: "'Space Grotesk', system-ui, sans-serif",
      body: "'DM Sans', system-ui, sans-serif"
    }
  },
  indigo: {
    name: 'Indigo',
    colors: {
      accent: '#4f46e5',
      accentDark: '#3730a3',
      accentLight: '#a5b4fc',
      success: '#6366f1',
      successLight: '#c7d2fe',
      bg: '#f6f7ff',
      surface: '#ffffff',
      surfaceAlt: '#eef2ff',
      border: '#dfe7ff'
    },
    fonts: {
      display: "'Space Grotesk', system-ui, sans-serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif"
    }
  },
  violet: {
    name: 'Violet',
    colors: {
      accent: '#8b5cf6',
      accentDark: '#6d28d9',
      accentLight: '#c4b5fd',
      success: '#a78bfa',
      successLight: '#ddd6fe',
      bg: '#faf7ff',
      surface: '#ffffff',
      surfaceAlt: '#f2ebff',
      border: '#e8dcff'
    },
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Urbanist', system-ui, sans-serif"
    }
  },
  green: {
    name: 'Green',
    colors: {
      accent: '#15803d',
      accentDark: '#166534',
      accentLight: '#86efac',
      success: '#22c55e',
      successLight: '#bbf7d0',
      bg: '#f3fff8',
      surface: '#ffffff',
      surfaceAlt: '#ebfff0',
      border: '#d1f7de'
    },
    fonts: {
      display: "'Merriweather', Georgia, serif",
      body: "'Manrope', system-ui, sans-serif"
    }
  },
  orange: {
    name: 'Orange',
    colors: {
      accent: '#f97316',
      accentDark: '#c2410c',
      accentLight: '#fdba74',
      success: '#fbbf24',
      successLight: '#fde68a',
      bg: '#fffaf4',
      surface: '#ffffff',
      surfaceAlt: '#fff1e7',
      border: '#fde2c6'
    },
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Poppins', system-ui, sans-serif"
    }
  },
  purple: {
    name: 'Purple',
    colors: {
      accent: '#7e22ce',
      accentDark: '#6b21a8',
      accentLight: '#d8b4fe',
      success: '#8b5cf6',
      successLight: '#ddd6fe',
      bg: '#faf7ff',
      surface: '#ffffff',
      surfaceAlt: '#f5f0ff',
      border: '#e7dcff'
    },
    fonts: {
      display: "'Libre Baskerville', Georgia, serif",
      body: "'Urbanist', system-ui, sans-serif"
    }
  },
  teal: {
    name: 'Teal',
    colors: {
      accent: '#0f766e',
      accentDark: '#115e59',
      accentLight: '#5eead4',
      success: '#14b8a6',
      successLight: '#99f6e4',
      bg: '#f1fffd',
      surface: '#ffffff',
      surfaceAlt: '#e7fffb',
      border: '#c8faf1'
    },
    fonts: {
      display: "'Lora', Georgia, serif",
      body: "'Nunito Sans', system-ui, sans-serif"
    }
  },
  slate: {
    name: 'Slate',
    colors: {
      accent: '#475569',
      accentDark: '#334155',
      accentLight: '#cbd5e1',
      success: '#64748b',
      successLight: '#e2e8f0',
      bg: '#f8fafc',
      surface: '#ffffff',
      surfaceAlt: '#eef2f7',
      border: '#e2e8f0'
    },
    fonts: {
      display: "'Inter', system-ui, sans-serif",
      body: "'IBM Plex Sans', system-ui, sans-serif"
    }
  }
}

Object.values(sampleThemes).forEach((theme) => {
  theme.darkColors = buildDarkPalette(theme.colors)
})

export default sampleThemes