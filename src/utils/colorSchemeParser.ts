export interface ColorScheme {
  name: string;
  colors: {
    [key: string]: {
      hex: string;
      hsl: string;
      rgb: string;
    };
  };
  gradients: {
    [key: string]: string;
  };
}

export interface ParsedColorScheme extends ColorScheme {
  id: string;
  createdAt: Date;
}

/**
 * Parses a SCSS color scheme file and extracts color information
 */
export function parseColorSchemeFile(content: string, fileName: string): ParsedColorScheme {
  const colorScheme: ParsedColorScheme = {
    id: generateId(),
    name: fileName.replace('.scss', ''),
    colors: {},
    gradients: {},
    createdAt: new Date(),
  };

  // Extract color definitions using regex
  const colorRegex = /--([a-z-]+):\s*([^;]+);?/gi;
  const scssColorRegex = /\$(lapis-lazuli|azure-web|sandy-brown|copper|caf-noir):\s*([^;]+);?/gi;
  const gradientRegex = /\$(gradient-\w+):\s*([^;]+);?/gi;

  let match;

  // Parse CSS custom properties (HEX values)
  while ((match = colorRegex.exec(content)) !== null) {
    const [, colorName, value] = match;
    if (!colorScheme.colors[colorName]) {
      colorScheme.colors[colorName] = {
        hex: value.trim(),
        hsl: '',
        rgb: '',
      };
    }
  }

  // Parse SCSS variables (HSL values)
  while ((match = scssColorRegex.exec(content)) !== null) {
    const [, colorName, value] = match;
    if (colorScheme.colors[colorName]) {
      colorScheme.colors[colorName].hsl = value.trim();
    }
  }

  // Parse gradient definitions
  while ((match = gradientRegex.exec(content)) !== null) {
    const [, gradientName, value] = match;
    colorScheme.gradients[gradientName] = value.trim();
  }

  // Convert HEX to RGB for colors that don't have RGB values
  Object.keys(colorScheme.colors).forEach(colorName => {
    const color = colorScheme.colors[colorName];
    if (!color.rgb && color.hex) {
      color.rgb = hexToRgb(color.hex);
    }
  });

  return colorScheme;
}

/**
 * Converts HEX color to RGB format for TailwindCSS
 */
function hexToRgb(hex: string): string {
  // Remove alpha channel if present and convert
  const cleanHex = hex.replace('ff', '');
  const r = parseInt(cleanHex.slice(1, 3), 16);
  const g = parseInt(cleanHex.slice(3, 5), 16);
  const b = parseInt(cleanHex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Generates a unique ID for the color scheme
 */
function generateId(): string {
  return `color-scheme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates if a file content is a valid color scheme file
 */
export function isValidColorSchemeFile(content: string): boolean {
  // Check for required color variables
  const requiredColors = ['lapis-lazuli', 'azure-web', 'sandy-brown', 'copper', 'caf-noir'];
  return requiredColors.some(color => content.includes(`$${color}:`));
}

/**
 * Creates CSS custom properties string from color scheme
 */
export function createCSSVariables(colorScheme: ParsedColorScheme): string {
  const variables: string[] = [];

  Object.entries(colorScheme.colors).forEach(([name, color]) => {
    if (color.hex) {
      variables.push(`  --${name}: ${color.hex};`);
    }
    if (color.hsl) {
      variables.push(`  --${name}-hsl: ${color.hsl};`);
    }
    if (color.rgb) {
      // Convert rgba(r, g, b, a) to space-separated values for Tailwind
      const rgbMatch = color.rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        variables.push(`  --${name}-rgb: ${rgbMatch[1]} ${rgbMatch[2]} ${rgbMatch[3]};`);
      }
    }
  });

  return `:root {\n${variables.join('\n')}\n}`;
}

/**
 * Creates TailwindCSS color configuration from color scheme
 */
export function createTailwindColors(colorScheme: ParsedColorScheme): Record<string, Record<string, string>> {
  return {
    primary: {
      DEFAULT: colorScheme.colors['lapis-lazuli']?.hex || '#2660a4',
      50: lightenColor(colorScheme.colors['azure-web']?.hex || '#edf7f6', 0.9),
      100: lightenColor(colorScheme.colors['azure-web']?.hex || '#edf7f6', 0.8),
      200: lightenColor(colorScheme.colors['azure-web']?.hex || '#edf7f6', 0.6),
      300: lightenColor(colorScheme.colors['azure-web']?.hex || '#edf7f6', 0.4),
      400: lightenColor(colorScheme.colors['azure-web']?.hex || '#edf7f6', 0.2),
      500: colorScheme.colors['azure-web']?.hex || '#edf7f6',
      600: colorScheme.colors['sandy-brown']?.hex || '#f19953',
      700: colorScheme.colors['copper']?.hex || '#c47335',
      800: colorScheme.colors['lapis-lazuli']?.hex || '#2660a4',
      900: colorScheme.colors['caf-noir']?.hex || '#56351e',
    },
    secondary: {
      DEFAULT: colorScheme.colors['sandy-brown']?.hex || '#f19953',
      50: lightenColor(colorScheme.colors['sandy-brown']?.hex || '#f19953', 0.9),
      100: lightenColor(colorScheme.colors['sandy-brown']?.hex || '#f19953', 0.8),
      200: lightenColor(colorScheme.colors['sandy-brown']?.hex || '#f19953', 0.6),
      300: lightenColor(colorScheme.colors['sandy-brown']?.hex || '#f19953', 0.4),
      400: lightenColor(colorScheme.colors['sandy-brown']?.hex || '#f19953', 0.2),
      500: colorScheme.colors['sandy-brown']?.hex || '#f19953',
      600: colorScheme.colors['copper']?.hex || '#c47335',
      700: colorScheme.colors['caf-noir']?.hex || '#56351e',
      800: colorScheme.colors['lapis-lazuli']?.hex || '#2660a4',
      900: colorScheme.colors['azure-web']?.hex || '#edf7f6',
    },
  };
}

/**
 * Lightens a color by a given percentage
 */
function lightenColor(hex: string, percent: number): string {
  // Simple color lightening - in a real implementation, you'd use a color library
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}