/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Workshop Blue - Deep, professional workshop colors
        workshop: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
        // Paint Yellow - Warm, creative paint colors
        paint: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Brush Brown - Rich, tool-like browns
        brush: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cfc5',
          400: '#d2bab0',
          500: '#bfa094',
          600: '#a18072',
          700: '#8b6f47',
          800: '#744c2f',
          900: '#5d3a1f',
        },
        // Keep some standard colors for consistency
        success: {
          100: '#dcfce7',
          500: '#10b981',
          600: '#059669',
          800: '#166534',
        },
        warning: {
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          800: '#92400e',
        },
        error: {
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          800: '#991b1b',
        },
      },
      fontFamily: {
        workshop: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        paint: '0 4px 6px -1px rgba(245, 158, 11, 0.1), 0 2px 4px -1px rgba(245, 158, 11, 0.06)',
        workshop: '0 4px 6px -1px rgba(72, 101, 129, 0.1), 0 2px 4px -1px rgba(72, 101, 129, 0.06)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
