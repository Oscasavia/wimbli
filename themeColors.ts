// themeColors.ts (You can create a separate file for this)

export const lightTheme = {
    primary: '#00ACC1',       // Vibrant Teal
    secondary: '#FF7043',     // Energetic Orange/Coral
    accent: '#FFC107',        // Optimistic Yellow/Gold
    background: '#E0F7FA',    // Light Teal Background
    textPrimary: '#212121',   // Dark Gray for primary text
    textSecondary: '#757575', // Medium Gray for secondary text
    inputBackground: '#F5F5F5', // Light Gray for input fields
    inputBorder: '#BDBDBD',     // Light Gray for input borders
    buttonText: '#FFFFFF',      // White for button text
    buttonShadow: '#0000001A', // Subtle black shadow (6% opacity)
    link: '#007BFF',           // Standard blue for links
    chipBackground: '#F5F5F5',
    chipText: '#424242',
    chipSelectedBackground: '#FF7043',
    chipSelectedText: '#FFFFFF',
    shadowColor: '#000', //***** fix */
    cardBackground: '#fff',
    error: '#FF3B30',
    cardBorder: '#e0e0e0',
    separator: '#e0e0e0'
};

export const darkTheme = {
    // primary: '#4DB6AC',       // Slightly lighter Teal for dark
    primary: '#5E35B1',
    secondary: '#FFAB91',     // Slightly lighter Orange/Coral for dark
    accent: '#FFD54F',        // Slightly lighter Yellow/Gold for dark
    background: '#121212',    // Dark Background
    textPrimary: '#FFFFFF',   // White for primary text in dark
    textSecondary: '#B0BEC5', // Light Gray for secondary text in dark
    inputBackground: '#303030', // Darker Gray for input fields in dark
    inputBorder: '#5E35B1',     // A contrasting color for dark input borders
    buttonText: '#FFFFFF',      // White for button text
    buttonShadow: '#0000004D', // More pronounced black shadow (30% opacity)
    link: '#81D4FA',           // Lighter blue for links in dark
    chipBackground: '#303030',
    chipText: '#E0E0E0',
    chipSelectedBackground: '#FFAB91',
    chipSelectedText: '#212121',
    shadowColor: '#000', //***** fix */
    cardBackground: '#2a2a2a',
    error: '#FF3B30',
    cardBorder: '#3a3a3c',
    separator: '#3a3a3c'
};

export type ThemeColors = typeof lightTheme; // Or darkTheme, they have the same structure