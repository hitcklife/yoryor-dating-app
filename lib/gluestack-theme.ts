import { config } from "@gluestack-ui/config";
import { createConfig } from "@gluestack-ui/themed";

// Custom primary color palette
const customPrimaryColors = {
  50: "#F5ECF7",   // lightest tint
  100: "#E3CCE9",
  200: "#D4B3E0",  // soft pastel violet
  300: "#C598DA",
  400: "#A962CD",  // vibrant lilac
  500: "#8F3BBF",  // base (used in CTA buttons)
  600: "#792DA7",  // slightly darker than base
  700: "#5B1994",  // deep purple (hover, active)
  800: "#43116E",  // for pressed states
  900: "#2D0A4A",  // deepest shade (text/icons)
};

// Create custom theme configuration with safer property access
const customConfig = {
  ...config,
  tokens: {
    ...config.tokens,
    colors: {
      ...config.tokens.colors,
      // Override primary colors with your custom palette
      primary0: customPrimaryColors[50],
      primary50: customPrimaryColors[50],
      primary100: customPrimaryColors[100],
      primary200: customPrimaryColors[200],
      primary300: customPrimaryColors[300],
      primary400: customPrimaryColors[400],
      primary500: customPrimaryColors[500],
      primary600: customPrimaryColors[600],
      primary700: customPrimaryColors[700],
      primary800: customPrimaryColors[800],
      primary900: customPrimaryColors[900],

      // Light mode primary colors
      primaryLight0: customPrimaryColors[50],
      primaryLight50: customPrimaryColors[50],
      primaryLight100: customPrimaryColors[100],
      primaryLight200: customPrimaryColors[200],
      primaryLight300: customPrimaryColors[300],
      primaryLight400: customPrimaryColors[400],
      primaryLight500: customPrimaryColors[500],
      primaryLight600: customPrimaryColors[600],
      primaryLight700: customPrimaryColors[700],
      primaryLight800: customPrimaryColors[800],
      primaryLight900: customPrimaryColors[900],

      // Dark mode primary colors (you can adjust these if needed)
      primaryDark0: customPrimaryColors[50],
      primaryDark50: customPrimaryColors[50],
      primaryDark100: customPrimaryColors[100],
      primaryDark200: customPrimaryColors[200],
      primaryDark300: customPrimaryColors[300],
      primaryDark400: customPrimaryColors[400],
      primaryDark500: customPrimaryColors[500],
      primaryDark600: customPrimaryColors[600],
      primaryDark700: customPrimaryColors[700],
      primaryDark800: customPrimaryColors[800],
      primaryDark900: customPrimaryColors[900],
    },
  },
};

export const gluestackConfig = createConfig(customConfig);

// Export the primary colors for use in other components
export const primaryColors = customPrimaryColors;
