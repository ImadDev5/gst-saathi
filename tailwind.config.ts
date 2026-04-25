import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk","sans-serif"],
        sans: ["Plus Jakarta Sans","sans-serif"],
        mono: ["JetBrains Mono","monospace"],
      },
      colors: {
        void: "#0a0e1a",
        charcoal: "#111625",
        cyan: {DEFAULT:"#00d4ff",dim:"rgba(0, 212, 255, 0.1)",glow:"rgba(0, 212, 255, 0.6)"},
        violet: {DEFAULT:"#7c3aed",glow:"rgba(124, 58, 237, 0.6)"},
        gold: "#fbbf24",
      },
      backgroundImage: {
        noise: "url(/noise-texture.svg)",
      },
    },
  },
  plugins: [],
};

export default config;
