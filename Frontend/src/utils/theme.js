// Generates a full 50–900 shade scale from a clinic's single primary color
// and applies it to the CSS variables that drive the Tailwind `brand` palette
// (see index.css / tailwind.config.js). The chosen color maps to brand-600,
// which is what buttons and accents use.

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

// Mix `rgb` toward `target` (255 = white, 0 = black) by `ratio` (0..1)
function mix(rgb, target, ratio) {
  return rgb.map((c) => Math.round(c + (target - c) * ratio))
}

// ratio > 0 mixes with white, ratio < 0 mixes with black
const SHADE_MIX = {
  50: 0.94,
  100: 0.86,
  200: 0.72,
  300: 0.54,
  400: 0.32,
  500: 0.14,
  600: 0,
  700: -0.18,
  800: -0.32,
  900: -0.45,
}

export function generatePalette(hex) {
  const base = hexToRgb(hex)
  const palette = {}
  for (const [shade, ratio] of Object.entries(SHADE_MIX)) {
    palette[shade] = ratio >= 0 ? mix(base, 255, ratio) : mix(base, 0, -ratio)
  }
  return palette
}

export function applyBrandColor(hex) {
  if (!hex || !HEX_REGEX.test(hex)) return
  const palette = generatePalette(hex)
  const root = document.documentElement
  for (const [shade, rgb] of Object.entries(palette)) {
    root.style.setProperty(`--brand-${shade}`, rgb.join(' '))
  }
}

export function resetBrandColor() {
  const root = document.documentElement
  for (const shade of Object.keys(SHADE_MIX)) {
    root.style.removeProperty(`--brand-${shade}`)
  }
}

// Inline-style helper for previews: returns { 50: 'rgb(...)', ... }
export function paletteToCss(hex) {
  if (!hex || !HEX_REGEX.test(hex)) hex = '#1d7f72'
  const palette = generatePalette(hex)
  const css = {}
  for (const [shade, rgb] of Object.entries(palette)) {
    css[shade] = `rgb(${rgb.join(', ')})`
  }
  return css
}
