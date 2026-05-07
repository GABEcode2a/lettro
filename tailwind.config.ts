import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0B132B",
          800: "#1C2541",
        },
        gold: {
          500: "#D4AF37",
          400: "#E6C767",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(212,175,55,0.15), 0 12px 30px rgba(11,19,43,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
