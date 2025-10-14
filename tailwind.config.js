/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic color scheme using CSS custom properties
        primary: {
          DEFAULT: 'rgb(var(--lapis-lazuli-rgb, 38 96 164))',
          50: 'rgb(var(--azure-web-rgb, 237 247 246))',
          100: 'rgb(var(--azure-web-rgb, 237 247 246))',
          200: 'rgb(var(--azure-web-rgb, 237 247 246))',
          300: 'rgb(var(--azure-web-rgb, 237 247 246))',
          400: 'rgb(var(--azure-web-rgb, 237 247 246))',
          500: 'rgb(var(--sandy-brown-rgb, 241 153 83))',
          600: 'rgb(var(--copper-rgb, 196 115 53))',
          700: 'rgb(var(--lapis-lazuli-rgb, 38 96 164))',
          800: 'rgb(var(--lapis-lazuli-rgb, 38 96 164))',
          900: 'rgb(var(--caf-noir-rgb, 86 53 30))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--sandy-brown-rgb, 241 153 83))',
          50: 'rgb(var(--azure-web-rgb, 237 247 246))',
          100: 'rgb(var(--azure-web-rgb, 237 247 246))',
          200: 'rgb(var(--azure-web-rgb, 237 247 246))',
          300: 'rgb(var(--sandy-brown-rgb, 241 153 83))',
          400: 'rgb(var(--sandy-brown-rgb, 241 153 83))',
          500: 'rgb(var(--sandy-brown-rgb, 241 153 83))',
          600: 'rgb(var(--copper-rgb, 196 115 53))',
          700: 'rgb(var(--copper-rgb, 196 115 53))',
          800: 'rgb(var(--lapis-lazuli-rgb, 38 96 164))',
          900: 'rgb(var(--caf-noir-rgb, 86 53 30))',
        },
        accent: {
          DEFAULT: 'rgb(var(--copper-rgb, 196 115 53))',
          50: 'rgb(var(--azure-web-rgb, 237 247 246))',
          100: 'rgb(var(--sandy-brown-rgb, 241 153 83))',
          200: 'rgb(var(--sandy-brown-rgb, 241 153 83))',
          300: 'rgb(var(--sandy-brown-rgb, 241 153 83))',
          400: 'rgb(var(--copper-rgb, 196 115 53))',
          500: 'rgb(var(--copper-rgb, 196 115 53))',
          600: 'rgb(var(--copper-rgb, 196 115 53))',
          700: 'rgb(var(--lapis-lazuli-rgb, 38 96 164))',
          800: 'rgb(var(--lapis-lazuli-rgb, 38 96 164))',
          900: 'rgb(var(--caf-noir-rgb, 86 53 30))',
        },
        // Individual color variables for direct use
        'lapis-lazuli': 'rgb(var(--lapis-lazuli-rgb, 38 96 164))',
        'azure-web': 'rgb(var(--azure-web-rgb, 237 247 246))',
        'sandy-brown': 'rgb(var(--sandy-brown-rgb, 241 153 83))',
        'copper': 'rgb(var(--copper-rgb, 196 115 53))',
        'caf-noir': 'rgb(var(--caf-noir-rgb, 86 53 30))',
        // Legacy njdsc colors as fallbacks
        njdsc: {
          primary: 'rgb(var(--lapis-lazuli-rgb, 38 96 164))',
          secondary: 'rgb(var(--sandy-brown-rgb, 241 153 83))',
          accent: 'rgb(var(--copper-rgb, 196 115 53))',
        },
      },
      backgroundColor: {
        'primary-gradient': 'var(--gradient-primary, linear-gradient(135deg, var(--lapis-lazuli), var(--sandy-brown)))',
        'secondary-gradient': 'var(--gradient-secondary, linear-gradient(45deg, var(--azure-web), var(--copper)))',
      },
      gradientColorStops: {
        'primary-start': 'var(--lapis-lazuli, #2660a4)',
        'primary-middle': 'var(--sandy-brown, #f19953)',
        'primary-end': 'var(--copper, #c47335)',
      },
    },
  },
  plugins: [],
}