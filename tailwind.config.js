/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FFFFFF',
        ink: '#111111',
        muted: '#777777',
        surface: '#F6F6F4',
        line: '#E8E8E5',
        navy: {
          DEFAULT: '#172A46',
          soft: '#E9ECF1',
        },
        positive: {
          DEFAULT: '#3F7D58',
          soft: '#EBF1EE',
        },
        negative: {
          DEFAULT: '#B94A48',
          soft: '#F7EDEC',
        },
        neutralAccent: {
          DEFAULT: '#A48732',
          soft: '#F5F1E4',
        },
        attention: {
          DEFAULT: '#C86632',
          soft: '#FAEFE8',
        },
      },
      fontFamily: {
        // Brand moments only. See src/styles/tokens.css for the Coterie swap.
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '18px',
      },
      boxShadow: {
        paper: '0 1px 2px rgba(17,17,17,0.04)',
        lift: '0 6px 24px -12px rgba(17,17,17,0.18)',
        sheet: '0 -8px 40px -16px rgba(17,17,17,0.22)',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
        18: '4.5rem',
      },
      maxWidth: {
        shell: '1120px',
        prose: '38rem',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        micro: '150ms',
        component: '250ms',
        page: '320ms',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'sheet-in': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'none' },
        },
        'sheet-out': {
          from: { transform: 'none' },
          to: { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 250ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 200ms ease both',
        'sheet-in': 'sheet-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        'sheet-out': 'sheet-out 200ms ease-in',
      },
    },
  },
  plugins: [],
}
