/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        njdsc: {
          primary: '#1e40af', // blue-800
          secondary: '#3b82f6', // blue-500
          accent: '#60a5fa', // blue-400
        },
      },
    },
  },
  plugins: [],
}