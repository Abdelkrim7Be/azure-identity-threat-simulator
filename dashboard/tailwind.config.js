/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "neon-green": "#39ff14",
        "neon-red": "#ff1744",
        panel: "#0b1220",
        bg: "#05070d",
        grid: "rgba(255,255,255,0.06)",
      },
    },
  },
  plugins: [],
};
