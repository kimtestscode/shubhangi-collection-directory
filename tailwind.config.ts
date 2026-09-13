import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#FDFAF6',
        'ivory-dark': '#F5EFE6',
        charcoal: '#2C2016',
        'charcoal-light': '#6B5744',
        gold: '#C9A84C',
        'gold-light': '#E8D5A3',
        'border-warm': '#E8DDD0',
        'wa-green': '#25D366',
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
