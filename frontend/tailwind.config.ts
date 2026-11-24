import type { Config } from 'tailwindcss';

// Colours approximated from the wireframes (dark theme). Use these names, not raw hex, in components.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#161616',
        panel: '#262626',
        field: '#393939',
        line: '#393939',
        primary: '#0f62fe',
        'primary-hover': '#0353e9',
        muted: '#c6c6c6',
        link: '#78a9ff',
        star: '#f1c21b',
        ok: '#24a148',
        danger: '#da1e28',
      },
      fontFamily: { sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};

export default config;
