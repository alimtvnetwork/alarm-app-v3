import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ["Outfit", "sans-serif"],
        body: ["Figtree", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Alarm-specific semantic colors
        clock: {
          face: "hsl(var(--clock-face))",
          hand: "hsl(var(--clock-hand))",
          tick: "hsl(var(--clock-tick))",
        },
        "flip-clock": {
          bg: "hsl(var(--flip-clock-bg))",
          text: "hsl(var(--flip-clock-text))",
        },
        alarm: {
          active: "hsl(var(--alarm-active))",
          inactive: "hsl(var(--alarm-inactive))",
          snooze: "hsl(var(--snooze))",
          dismiss: "hsl(var(--dismiss))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "ripple-pulse": {
          "0%": { transform: "scale(1)", opacity: "0.3" },
          "50%": { transform: "scale(1.05)", opacity: "0.15" },
          "100%": { transform: "scale(1)", opacity: "0.3" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "digit-flip": {
          "0%": { transform: "translateY(-40%) scale(0.9)", opacity: "0.2" },
          "50%": { transform: "translateY(4%) scale(1.04)", opacity: "1" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        "digit-roll": {
          "0%": { transform: "translateY(-30%) rotateX(40deg)", opacity: "0.3" },
          "60%": { transform: "translateY(2%) rotateX(-2deg)", opacity: "1" },
          "100%": { transform: "translateY(0) rotateX(0deg)", opacity: "1" },
        },
        "digit-hour-glow": {
          "0%": { transform: "scale(1.15)", color: "hsl(var(--primary))", textShadow: "0 0 12px hsl(var(--primary) / 0.8)" },
          "50%": { transform: "scale(1.05)", color: "hsl(var(--primary))", textShadow: "0 0 6px hsl(var(--primary) / 0.4)" },
          "100%": { transform: "scale(1)", color: "inherit", textShadow: "none" },
        },
        "colon-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "ripple-1": "ripple-pulse 3s ease-in-out infinite",
        "ripple-2": "ripple-pulse 3s ease-in-out 0.6s infinite",
        "ripple-3": "ripple-pulse 3s ease-in-out 1.2s infinite",
        shake: "shake 0.5s ease-in-out",
        "digit-flip": "digit-flip 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "digit-roll": "digit-roll 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "digit-hour-glow": "digit-hour-glow 0.7s ease-out",
        "colon-pulse": "colon-pulse 1s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
