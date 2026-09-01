import type { Config } from "tailwindcss";

/**
 * Husk design tokens.
 *
 * Shape rule: cards 14px, inputs 10px, primary CTAs pill.
 * One accent: Husk violet. Neutrals are zinc. Status greens/ambers
 * are semantic only (covered / naked / payout), not a second brand.
 */
const config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        husk: {
          DEFAULT: "var(--husk)",
          fg: "var(--husk-fg)",
          muted: "var(--husk-muted)",
          soft: "var(--husk-soft)",
        },
        cream: "var(--cream)",
        ink: "var(--ink)",
        mute: "var(--mute)",
        line: "var(--line)",
        canvas: "var(--canvas)",
        raised: "var(--raised)",
        sunken: "var(--sunken)",
        naked: "var(--naked)",
        covered: "var(--covered)",
        payout: "var(--payout)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        display: ["3.25rem", { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "600" }],
        "display-sm": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.035em", fontWeight: "600" }],
      },
      borderRadius: {
        card: "14px",
        input: "10px",
        pill: "999px",
      },
      spacing: {
        rail: "17.5rem",
        gutter: "1.75rem",
      },
      boxShadow: {
        husk: "0 18px 40px -24px color-mix(in srgb, var(--husk) 45%, transparent)",
        lift: "0 12px 32px -20px color-mix(in srgb, var(--ink) 18%, transparent)",
      },
      zIndex: {
        header: "20",
        nav: "30",
        overlay: "40",
        toast: "50",
        grain: "60",
      },
      transitionTimingFunction: {
        husk: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
} satisfies Config;

export default config;
