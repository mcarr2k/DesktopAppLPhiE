import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lphie: {
          gold: "#C8A028",
          goldsoft: "#F4E5B0",
          ink: "#0A0A0A",
          cream: "#F8F4E8",
          paper: "#FCFAF3",
          slate: "#1F2933",
          accent: "#7A1F1F",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', '"Georgia"', "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        widget: "0 1px 2px rgba(10,10,10,0.04), 0 8px 24px rgba(10,10,10,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
