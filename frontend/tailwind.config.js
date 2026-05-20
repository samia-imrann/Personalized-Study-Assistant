/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: '#e8eff5', // Soft, pale blue background
          sidebar: '#dde6f0', // Slightly darker pale blue for sidebar
          card: '#ffffff', // Clean white for cards
          cardHover: '#f4f7fb', // Subtle hover tint
          dark: '#1e293b', // Deep navy/slate for text
          accent: '#3b82f6', // Bright, modern blue accent
          pink: '#f43f5e', // Retaining a coral/pink for highlights
          teal: '#14b8a6', // Teal for highlights
          yellow: '#f59e0b' // Amber for highlights
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(2, 132, 199, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'glow-blue': '0 0 20px rgba(14, 165, 233, 0.15)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.15)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.15)',
      }
    },
  },
  plugins: [],
}
