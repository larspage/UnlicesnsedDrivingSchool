import { ParsedColorScheme } from './colorSchemeParser';

export interface GradientOptions {
  direction?: 'linear' | 'radial' | 'conic';
  angle?: number;
  colors: string[];
  positions?: number[];
}

export interface GradientPreset {
  name: string;
  gradient: string;
  description: string;
}

/**
 * Creates a CSS gradient string from color scheme colors
 */
export function createGradient(
  colorScheme: ParsedColorScheme,
  options: Partial<GradientOptions> = {}
): string {
  const {
    direction = 'linear',
    angle = 135,
    colors = Object.values(colorScheme.colors).map(c => c.hex).filter(Boolean),
    positions
  } = options;

  if (colors.length === 0) {
    return 'transparent';
  }

  switch (direction) {
    case 'linear':
      return createLinearGradient(colors, angle, positions);
    case 'radial':
      return createRadialGradient(colors, positions);
    case 'conic':
      return createConicGradient(colors, angle, positions);
    default:
      return createLinearGradient(colors, angle, positions);
  }
}

/**
 * Creates a linear gradient CSS string
 */
function createLinearGradient(colors: string[], angle: number, positions?: number[]): string {
  if (colors.length === 1) {
    return colors[0];
  }

  const colorStops = colors.map((color, index) => {
    const position = positions?.[index];
    return position !== undefined ? `${color} ${position}%` : color;
  });

  return `linear-gradient(${angle}deg, ${colorStops.join(', ')})`;
}

/**
 * Creates a radial gradient CSS string
 */
function createRadialGradient(colors: string[], positions?: number[]): string {
  if (colors.length === 1) {
    return colors[0];
  }

  const colorStops = colors.map((color, index) => {
    const position = positions?.[index];
    return position !== undefined ? `${color} ${position}%` : color;
  });

  return `radial-gradient(circle, ${colorStops.join(', ')})`;
}

/**
 * Creates a conic gradient CSS string
 */
function createConicGradient(colors: string[], angle: number, positions?: number[]): string {
  if (colors.length === 1) {
    return colors[0];
  }

  const colorStops = colors.map((color, index) => {
    const position = positions?.[index] || (index * (360 / colors.length));
    return `${color} ${position}deg`;
  });

  return `conic-gradient(from ${angle}deg, ${colorStops.join(', ')})`;
}

/**
 * Generates preset gradients based on color scheme
 */
export function generateGradientPresets(colorScheme: ParsedColorScheme): GradientPreset[] {
  const colors = Object.values(colorScheme.colors).map(c => c.hex).filter(Boolean);

  if (colors.length < 2) {
    return [];
  }

  return [
    {
      name: 'primary-diagonal',
      gradient: createGradient(colorScheme, {
        direction: 'linear',
        angle: 135,
        colors: [colors[0], colors[2], colors[3]]
      }),
      description: 'Primary diagonal gradient using main colors'
    },
    {
      name: 'warm-sunset',
      gradient: createGradient(colorScheme, {
        direction: 'linear',
        angle: 45,
        colors: [colors[2], colors[3], colors[4]]
      }),
      description: 'Warm sunset gradient with orange tones'
    },
    {
      name: 'cool-ocean',
      gradient: createGradient(colorScheme, {
        direction: 'linear',
        angle: 180,
        colors: [colors[0], colors[1], colors[2]]
      }),
      description: 'Cool ocean gradient with blue tones'
    },
    {
      name: 'radial-burst',
      gradient: createGradient(colorScheme, {
        direction: 'radial',
        colors: colors
      }),
      description: 'Radial burst effect with all colors'
    },
    {
      name: 'color-wheel',
      gradient: createGradient(colorScheme, {
        direction: 'conic',
        angle: 0,
        colors: colors
      }),
      description: 'Color wheel effect using conic gradient'
    },
    {
      name: 'subtle-overlay',
      gradient: createGradient(colorScheme, {
        direction: 'linear',
        angle: 90,
        colors: [`${colors[1]}00`, colors[1], `${colors[1]}00`],
        positions: [0, 50, 100]
      }),
      description: 'Subtle overlay effect'
    }
  ];
}

/**
 * Creates animated gradient keyframes
 */
export function createAnimatedGradient(colorScheme: ParsedColorScheme): string {
  const colors = Object.values(colorScheme.colors).map(c => c.hex).filter(Boolean);

  if (colors.length < 2) {
    return '';
  }

  const keyframes = `
@keyframes colorShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes gradientRotate {
  0% { background-position: 0% 0%; }
  25% { background-position: 100% 0%; }
  50% { background-position: 100% 100%; }
  75% { background-position: 0% 100%; }
  100% { background-position: 0% 0%; }
}

.animated-gradient {
  background: linear-gradient(45deg, ${colors.join(', ')});
  background-size: 400% 400%;
  animation: gradientRotate 15s ease infinite;
}

.color-shift {
  background: linear-gradient(90deg, ${colors.join(', ')});
  background-size: 200% 100%;
  animation: colorShift 8s ease infinite;
}
  `.trim();

  return keyframes;
}

/**
 * Creates gradient text effect
 */
export function createGradientText(colorScheme: ParsedColorScheme, textClass: string = ''): string {
  const colors = Object.values(colorScheme.colors).map(c => c.hex).filter(Boolean);

  if (colors.length < 2) {
    return '';
  }

  return `
.gradient-text-${colorScheme.id} {
  background: linear-gradient(135deg, ${colors[0]}, ${colors[2]});
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  ${textClass}
}
  `.trim();
}

/**
 * Creates gradient border effect
 */
export function createGradientBorder(
  colorScheme: ParsedColorScheme,
  width: string = '2px',
  radius: string = '8px'
): string {
  const colors = Object.values(colorScheme.colors).map(c => c.hex).filter(Boolean);

  if (colors.length < 2) {
    return '';
  }

  return `
.gradient-border-${colorScheme.id} {
  position: relative;
  border-radius: ${radius};
}

.gradient-border-${colorScheme.id}::before {
  content: '';
  position: absolute;
  inset: 0;
  padding: ${width};
  background: linear-gradient(135deg, ${colors.join(', ')});
  border-radius: ${radius};
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
}
  `.trim();
}

/**
 * Generates all gradient utilities for a color scheme
 */
export function generateAllGradients(colorScheme: ParsedColorScheme): {
  presets: GradientPreset[];
  animations: string;
  textGradient: string;
  borderGradient: string;
} {
  return {
    presets: generateGradientPresets(colorScheme),
    animations: createAnimatedGradient(colorScheme),
    textGradient: createGradientText(colorScheme),
    borderGradient: createGradientBorder(colorScheme),
  };
}