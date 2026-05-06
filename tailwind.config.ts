import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /* ── Scholar Gold & Deep Navy ── */
        primary:   "#1A365D",   // Deep Oxford Blue
        "on-primary": "#ffffff",
        "primary-container": "#1a365d",

        secondary: "#B8860B",   // Burnished Gold (= accent-gold)
        "accent-gold": "#B8860B",

        background: "#FFFDF5",  // Warm Ivory
        "on-background": "#1A202C",

        surface:   "#FFFFFF",
        "surface-low":  "#F9F7EF",
        "surface-container-low": "#F9F7EF",
        "outline-variant": "#E2E8F0",
        "on-surface": "#1A202C",
        "on-surface-variant": "#4A5568",

        /* ── burgundy נשמר לאדמין בלבד ── */
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
        /* gold נשמר לתאימות לאחור */
        gold: {
          300: "#fcd97b",
          400: "#f9c030",
          500: "#e8a800",
          600: "#B8860B",
        },
        parchment: {
          50:  "#FFFDF5",
          100: "#faf3e0",
          200: "#f5e6c0",
        },
      },

      fontFamily: {
        serif: ["Newsreader", "Georgia", "serif"],
        sans:  ["Inter", "system-ui", "sans-serif"],
      },

      fontSize: {
        "headline-xl": ["56px", { lineHeight: "1.1", fontWeight: "700" }],
        "headline-lg": ["36px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-md": ["26px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg":     ["18px", { lineHeight: "1.7", fontWeight: "400" }],
        "body-md":     ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-lg":    ["14px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "700" }],
        "label-sm":    ["12px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "600" }],
      },

      boxShadow: {
        rich:   "0 20px 25px -5px rgba(26,54,93,0.10), 0 10px 10px -5px rgba(184,134,11,0.04)",
        deep:   "0 10px 30px -5px rgba(0,0,0,0.20)",
        book:   "0 4px 6px -1px rgba(26,54,93,0.10), 0 2px 4px -1px rgba(26,54,93,0.06)",
        "book-hover": "0 10px 25px -3px rgba(26,54,93,0.15), 0 4px 10px -2px rgba(184,134,11,0.08)",
      },

      maxWidth: {
        "container-max": "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
