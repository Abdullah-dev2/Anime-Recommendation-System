/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#08090c",
          secondary: "#0d0f14",
          tertiary: "#141720",
          input: "#0e1017",
          message: {
            user: "rgba(28, 32, 45, 0.9)", // solid dark bubble
            bot: "rgba(18, 15, 20, 0.7)",  // existing accent border bubble
          }
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#cbd5e1",
          muted: "#94a3b8",
          dark: "#64748b",
        },
        crimson: {
          DEFAULT: "#be123c",
          hover: "#e11d48",
          glow: "rgba(190, 18, 60, 0.45)",
          border: "rgba(190, 18, 60, 0.2)",
          borderHover: "rgba(190, 18, 60, 0.4)",
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: "0 0 20px rgba(190, 18, 60, 0.25)",
        glowHover: "0 0 30px rgba(190, 18, 60, 0.4)",
      }
    },
  },
  plugins: [],
}

