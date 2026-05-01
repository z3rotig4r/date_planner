/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          coral: "#FF6B6B",
          orange: "#FF8E53",
        },
        background: {
          light: "#F9FAFB",
          dark: "#0F172A", // Deep Navy (Slate 900)
          darker: "#020617", // Deeper (Slate 950)
        }
      },
      fontFamily: {
        sans: ["Pretendard", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"],
      },
    },
  },
  plugins: [],
}
