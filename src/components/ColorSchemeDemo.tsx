import React from 'react';
import { useColorScheme } from '../contexts/ColorSchemeContext';
import { generateAllGradients, createGradient } from '../utils/gradientUtils';

export function ColorSchemeDemo() {
  const { currentColorScheme } = useColorScheme();

  if (!currentColorScheme) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading color scheme...</p>
      </div>
    );
  }

  const gradients = generateAllGradients(currentColorScheme);
  const colors = Object.values(currentColorScheme.colors);

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 gradient-text">
          Color Scheme Demo: {currentColorScheme.name}
        </h1>

        {/* Color Palette */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
            Color Palette
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {Object.entries(currentColorScheme.colors).map(([name, color]) => (
              <div key={name} className="text-center">
                <div
                  className="w-full h-24 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 mb-3"
                  style={{ backgroundColor: color.hex }}
                />
                <h3 className="font-medium text-gray-800 dark:text-gray-200 capitalize text-sm">
                  {name.replace('-', ' ')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {color.hex}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Gradient Showcase */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
            Gradient Showcase
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Primary Gradients */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Primary Gradients
              </h3>

              <div className="space-y-3">
                <div
                  className="h-16 rounded-lg shadow-md"
                  style={{
                    background: createGradient(currentColorScheme, {
                      direction: 'linear',
                      angle: 135,
                      colors: [colors[0]?.hex, colors[2]?.hex, colors[3]?.hex].filter(Boolean)
                    })
                  }}
                />
                <div
                  className="h-16 rounded-lg shadow-md"
                  style={{
                    background: createGradient(currentColorScheme, {
                      direction: 'radial',
                      colors: colors.map(c => c.hex).filter(Boolean)
                    })
                  }}
                />
              </div>
            </div>

            {/* Animation Examples */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Animated Gradients
              </h3>

              <div className="space-y-3">
                <div
                  className="h-16 rounded-lg shadow-md animate-gradient"
                  style={{
                    background: createGradient(currentColorScheme, {
                      direction: 'linear',
                      angle: 45,
                      colors: colors.map(c => c.hex).filter(Boolean)
                    })
                  }}
                />
                <div
                  className="h-16 rounded-lg shadow-md animate-gradient-shift"
                  style={{
                    background: createGradient(currentColorScheme, {
                      direction: 'linear',
                      angle: 90,
                      colors: colors.map(c => c.hex).filter(Boolean)
                    })
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Text Effects */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
            Text Effects
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <h3 className="text-xl font-bold gradient-text mb-2">
                Gradient Text Effect
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This text uses a gradient background with text clipping for a beautiful effect.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <div className="gradient-border p-4 rounded">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Gradient Border
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This container has a gradient border effect using CSS masking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
            Usage Examples
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Buttons */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 dark:text-gray-300">Buttons</h3>
              <button className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors">
                Primary Button
              </button>
              <button className="w-full py-2 px-4 bg-secondary-600 hover:bg-secondary-700 text-white rounded-md transition-colors">
                Secondary Button
              </button>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 dark:text-gray-300">Cards</h3>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Card Title</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This card uses the current color scheme variables.
                </p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 dark:text-gray-300">Status</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-lapis-lazuli"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-sandy-brown"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Warning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-copper"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Error</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Color Information */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
            Color Information
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">HEX Values</h3>
              <div className="space-y-2">
                {Object.entries(currentColorScheme.colors).map(([name, color]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {name.replace('-', ' ')}:
                    </span>
                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {color.hex}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">HSL Values</h3>
              <div className="space-y-2">
                {Object.entries(currentColorScheme.colors).map(([name, color]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {name.replace('-', ' ')}:
                    </span>
                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {color.hsl}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}