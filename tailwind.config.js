/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 深色主题背景色
        'app-bg': '#1a1a2e',
        'app-surface': '#16213e',
        'app-card': '#0f3460',
      },
      animation: {
        'bounce-dot': 'bounce 1s infinite',
      },
    },
  },
  plugins: [],
};
