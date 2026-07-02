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
            user: "rgba(30, 34, 53, 0.95)",  // slightly lighter, more distinct from bot
            bot: "rgba(16, 14, 20, 0.85)",   // deeper/more opaque so cards inside contrast
          }
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#cbd5e1",
          muted: "#94a3b8",
          dark: "#64748b",
          placeholder: "#7a8fa6",            // WCAG AA vs dark input bg
        },
        crimson: {
          DEFAULT: "#be123c",
          hover: "#e11d48",
          glow: "rgba(190, 18, 60, 0.45)",
          border: "rgba(190, 18, 60, 0.2)",
          borderHover: "rgba(190, 18, 60, 0.4)",
        },
        gold: {
          DEFAULT: "hsl(42, 60%, 65%)",      // #c9a84c — muted warm gold
          muted: "hsl(42, 35%, 42%)",        // dimmer variant for tags/hovers
          glow: "rgba(201, 168, 76, 0.3)",
          border: "rgba(201, 168, 76, 0.2)",
          borderHover: "rgba(201, 168, 76, 0.45)",
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: "0 0 20px rgba(190, 18, 60, 0.25)",
        glowHover: "0 0 30px rgba(190, 18, 60, 0.4)",
        goldGlow: "0 0 16px rgba(201, 168, 76, 0.2)",
        card: "0 6px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(201, 168, 76, 0.1)",
        cardHover: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(201, 168, 76, 0.28)",
      }
    },
  },
  plugins: [],
}

