/**
 * Brand colors and theme configuration
 */

export const theme = {
  colors: {
    beige: {
      lightest: "#F9F5EA",
      lighter: "#F4ECDA",
      light: "#E9DFC7",
      base: "#D9C6A7",
      dark: "#C0AA86",
      darker: "#A78F66",
    },
    blue: "#0F3455",
    red: "#D82A2D",
    background: "#F9F5EA",
    foreground: "#0F3455",
  },
  spacing: {
    topBarHeight: "60px",
    sidebarWidth: "0px", // Sidebar removed
    bottomDockHeight: "100px",
  },
} as const;

