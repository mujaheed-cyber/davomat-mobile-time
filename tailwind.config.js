/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate9: "#1F2037",
        slate8: "#272945",
        slate7: "#31345A",
        brand: { DEFAULT: "#14BBA6", dim: "#0E8A7A", soft: "#14BBA61F" },
        warn: "#F5B544",
        danger: "#F0616D",
      },
      fontFamily: { sans: ["Manrope", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
