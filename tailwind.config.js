/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'nestalk-primary': '#ae491e',
      },
    },
  },
  plugins: [],
};
