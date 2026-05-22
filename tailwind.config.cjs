module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#12121d",
        surface: "#12121d",
        "surface-container-high": "#292935",
        "surface-container": "#1f1f2a",
        "surface-variant": "#343440",
        "on-surface": "#e3e1f1",
        "on-surface-variant": "#ccc3d8",
        primary: "#d2bbff",
        "primary-container": "#7c3aed",
        secondary: "#ffe083",
        error: "#ffb4ab"
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
