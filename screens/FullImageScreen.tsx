import React from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar, // Import StatusBar
  Pressable, // Use Pressable for background tap
  Platform, // For potential platform-specific styles
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context"; // Use safe area
import { Feather } from "@expo/vector-icons"; // Use Feather icons
import { useTheme } from "../ThemeContext"; // Import theme hook
import { lightTheme, darkTheme } from "../themeColors"; // Import theme colors

interface RouteParams {
  imageUrl: string;
}

export default function FullImageScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { imageUrl } = route.params as RouteParams;
  const { theme } = useTheme();
  const isDark = theme === "dark"; // Check current theme if needed for specific logic
  const currentTheme = isDark ? darkTheme : lightTheme;

  // Define colors for clarity
  // Use a very dark color, often pure black or near-black works best for image viewers
  const backgroundColor = isDark ? currentTheme.background : "#000000"; // Default to black for light theme
  const iconColor = "#ffffff"; // Usually white icon on dark background

  return (
    // SafeAreaView helps position close button correctly
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {/* Set status bar style for this screen */}
      <StatusBar barStyle="light-content" backgroundColor={backgroundColor} />

      {/* Pressable background to allow tap-to-dismiss */}
      <Pressable style={styles.container} onPress={() => navigation.goBack()}>
        {/* Image View - Consider adding Zoom/Pan library later */}
        <Image
          source={{ uri: imageUrl }}
          style={styles.fullImage}
          resizeMode="contain"
        />
        {/* Explicit Close Button - stops propagation so tapping X doesn't also trigger background press */}
        <Pressable
          style={styles.closeButtonContainer}
          onPress={(e) => {
            e.stopPropagation(); // Prevent background press
            navigation.goBack();
          }}
        >
          <Feather name="x" size={28} color={iconColor} />
        </Pressable>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Background color set dynamically
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // Background color inherited or set on safeArea
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closeButtonContainer: {
    position: "absolute",
    top: Platform.OS === "android" ? 15 : 10, // Adjust based on testing with SafeAreaView
    right: 15,
    padding: 10, // Increase tappable area
    zIndex: 10, // Ensure button is above image if overlap occurs
    // Optional: Add a subtle background for better visibility if needed
    // backgroundColor: 'rgba(0, 0, 0, 0.3)',
    // borderRadius: 20,
  },
});
