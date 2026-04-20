import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        burgundy: {
          50:  "#fdf2f4",
          100: "#fce7ea",
          200: "#f9d0d7",
          300: "#f4a9b5",
          400: "#ec7589",
          500: "#e04d65",
          600: "#cc2e4a",
          700: "#ab2038",
          800: "#8f1e33",
          900: "#6b1626",
          950: "#3f0a15",
        },
        gold: {
          300: "#fcd97b",
          400: "#f9c030",
          500: "#e8a800",
          600: "#c78a00",
        },
        parchment: {
          50:  "#fdfaf4",
          100: "#faf3e0",
          200: "#f5e6c0",
        },
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
        sans:  ["'Assistant'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        book:       "4px 4px 0 0 rgba(107,22,38,0.15), 0 8px 32px rgba(107,22,38,0.12)",
        "book-hover":"6px 6px 0 0 rgba(107,22,38,0.2), 0 12px 40px rgba(107,22,38,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
