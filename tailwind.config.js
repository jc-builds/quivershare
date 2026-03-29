/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'Helvetica',
          'Apple Color Emoji',
          'Arial',
          'sans-serif',
          'Segoe UI Emoji',
          'Segoe UI Symbol'
        ],
      },
      colors: {
        background: {
          DEFAULT: "var(--background)",
          alt: "var(--background-alt)",
        },

        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",

        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
        },

        foreground: {
          DEFAULT: "var(--foreground)",
          secondary: "var(--foreground-secondary)",
          muted: "var(--foreground-muted)",
        },

        muted: "var(--muted)",
        "muted-foreground": "var(--foreground-secondary)",

        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          alt: "var(--primary-hover)",
          foreground: "var(--primary-foreground)",
          tint: "var(--primary-tint)",
          soft: "var(--primary-tint)",
          softAlt: "var(--primary-tint)",
        },

        success: "var(--success)",
        warning: "var(--warning)",

        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },

        dark: "var(--dark)",
      },
    },
  },
  plugins: [],
};
