import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "typing-dot": {
          "0%, 60%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "30%": { opacity: "1", transform: "scale(1)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(29,158,117,0.35)" },
          "50%": { boxShadow: "0 0 0 18px rgba(29,158,117,0)" },
        },
        "modal-in": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "o-wink": {
          "0%, 88%, 100%": { transform: "scaleY(1)" },
          "90%": { transform: "scaleY(0.3)" },
          "92%": { transform: "scaleY(1)" },
          "94%": { transform: "scaleY(0.3)" },
          "96%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "typing-dot": "typing-dot 1.2s ease-in-out infinite",
        breathe: "breathe 4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.6s ease-in-out infinite",
        "modal-in": "modal-in 0.25s ease-out",
        "o-wink": "o-wink 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
