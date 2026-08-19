module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-app)",
        surface: "var(--bg-surface)",
        "surface-container-high": "var(--bg-card-hover)",
        "surface-container": "var(--bg-card)",
        "surface-variant": "var(--bg-panel)",
        "on-surface": "var(--text-main)",
        "on-surface-variant": "var(--text-muted)",
        primary: "var(--primary-color)",
        "primary-container": "var(--primary-container)",
        secondary: "var(--secondary-color)",
        error: "var(--error-color)"
      },
      spacing: {
        "sidebar-width": "280px",
        "container-margin": "32px",
        "section-gap": "48px",
        gutter: "24px"
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      backdropBlur: { glass: "20px" }
    }
  },
  plugins: []
};
