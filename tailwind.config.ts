import type { Config } from 'tailwindcss'

const twConfig: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        shark: {
          50: "#778490",
          100: "#707D89",
          200: "#65707B",
          300: "#5A646D",
          400: "#4E575F",
          500: "#434A51",
          600: "#373D43",
          700: "#2C3035",
          800: "#202427",
          900: "#151719",
          950: "#0F1112",
          DEFAULT: "#202427",
        },
      },
    },
  },
};

export default twConfig