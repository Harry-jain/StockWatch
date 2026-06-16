import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0a0a0a',
          card: '#111111',
          elevated: '#1a1a1a',
          border: '#262626',
        },
        text: {
          primary: '#f5f5f5',
          secondary: '#a3a3a3',
          muted: '#525252',
        },
        market: {
          up: '#22c55e',
          upBg: '#052e16',
          down: '#ef4444',
          downBg: '#450a0a',
          neutral: '#a3a3a3',
        },
        accent: '#3b82f6',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
