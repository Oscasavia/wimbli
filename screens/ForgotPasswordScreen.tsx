// © 2025 Oscasavia Birungi. All rights reserved.
import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Image,
  Keyboard,
  SafeAreaView, // Use SafeAreaView from react-native-safe-area-context if installed
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator, // Added
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase"; // Adjust path if needed
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons"; // Use Feather
import { useTheme } from "../ThemeContext"; // Adjust path if needed
import { lightTheme, darkTheme } from "../themeColors"; // Adjust path if needed

// Removed FontAwesome, MaterialIcons

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Theme variable fallbacks ---
  const cardBackgroundColor =
    currentTheme.cardBackground || (isDark ? "#1c1c1e" : "#ffffff");
  const inputBackgroundColor =
    currentTheme.inputBackground || (isDark ? "#2c2c2e" : "#f0f0f0");
  const inputBorderColor =
    currentTheme.inputBorder || (isDark ? "#444" : "#ddd");
  const placeholderTextColor = currentTheme.textSecondary || "#8e8e93";
  const iconColor = currentTheme.textSecondary || "#8e8e93";
  const shadowColor = currentTheme.shadowColor || "#000";
  const linkColor = currentTheme.primary || "#007AFF"; // Use primary for links generally

  const handleReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Email Required", "Please enter your email address.");
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        "Check Your Inbox",
        `We’ve sent a password reset link to ${trimmedEmail} if an account exists. Please check your spam folder as well.`,
        [{ text: "OK", onPress: () => navigation.navigate("Login") }] // Navigate back to Login on OK
      );
      // No need to navigate here if the alert handles it, or remove onPress and navigate here
      // navigation.navigate("Login");
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      let errorMessage = "Could not send reset email. Please try again.";
      if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/user-not-found") {
        // Don't explicitly say user not found for security, the success message handles it
        // Log it internally if needed, but show generic success to user
        console.log(
          "Password reset attempt for non-existent user:",
          trimmedEmail
        );
        // Show success message anyway so attackers can't determine existing emails
        Alert.alert(
          "Check Your Inbox",
          `If an account exists for ${trimmedEmail}, a password reset link has been sent. Please check your spam folder as well.`,
          [{ text: "OK", onPress: () => navigation.navigate("Login") }]
        );
        // No need to set loading false here as alert handles navigation
        return; // Exit function after showing alert
      } else if (error.code === "auth/too-many-requests") {
        errorMessage =
          "Too many requests. Please wait a while before trying again.";
      }
      Alert.alert("Password Reset Failed", errorMessage);
    } finally {
      // Set loading false only if an error occurred AND we didn't navigate away via success alert
      if (!Alert.alert) {
        // Basic check, might need refinement depending on alert logic flow
        setIsLoading(false);
      }
      // More robust: only set loading false in the error handler's Alert callback if needed,
      // or rely on component unmounting on navigation. Let's simplify and set it here for now.
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.screenContainer,
        { backgroundColor: currentTheme.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: currentTheme.primary + "45" },
            ]}
          >
            <Image
              source={require("../assets/wimbli-icon-bg.png")}
              style={styles.logoImage}
            />
          </View>
          <Text style={[styles.appName, { color: currentTheme.primary }]}>
            Wimbli
          </Text>
        </View>

        {/* Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, shadowColor: shadowColor },
          ]}
        >
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            Reset Your Password
          </Text>
          <Text
            style={[styles.subtitle, { color: currentTheme.textSecondary }]}
          >
            Enter your account's email address and we'll send you a link to
            reset your password.
          </Text>

          {/* Email Input */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: inputBackgroundColor,
                borderColor: inputBorderColor,
              },
            ]}
          >
            <Feather
              name="mail"
              size={20}
              color={iconColor}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Enter your email address"
              placeholderTextColor={placeholderTextColor}
              style={[styles.textInput, { color: currentTheme.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[
              styles.resetButton,
              { backgroundColor: currentTheme.primary },
              isLoading && styles.resetButtonDisabled,
            ]}
            onPress={handleReset}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={currentTheme.buttonText || "#fff"}
              />
            ) : (
              <Text
                style={[
                  styles.resetButtonText,
                  { color: currentTheme.buttonText || "#fff" },
                ]}
              >
                Send Reset Email
              </Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View style={styles.loginLinkContainer}>
            <TouchableOpacity onPress={() => navigation.replace("Login")}>
              <Text
                style={[
                  styles.linkText,
                  styles.linkHighlight,
                  { color: linkColor },
                ]}
              >
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {/* </KeyboardAvoidingView> */}
    </SafeAreaView>
  );
}

// --- Styles --- (Adapted from Login/Signup)
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    // backgroundColor set dynamically
  },
  logoImage: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    // color set dynamically
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 25,
    // backgroundColor set dynamically
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10, // Less space below title
    textAlign: "center",
    // color set dynamically
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 25, // Space below subtitle
    lineHeight: 21,
    // color set dynamically
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderRadius: 25,
    paddingHorizontal: 12,
    marginBottom: 25, // More space below input
    height: 50,
    // backgroundColor, borderColor set dynamically
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputIcon: {
    marginRight: 10,
    marginLeft: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    // color set dynamically
  },
  resetButton: {
    paddingVertical: 14,
    borderRadius: 25, // Consistent rounded button
    alignItems: "center",
    marginTop: 10, // Space above button
    marginBottom: 25, // Space below button
    // Dynamic background color
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    // color set dynamically
  },
  loginLinkContainer: {
    alignItems: "center", // Center the link
    marginTop: 15,
  },
  linkText: {
    fontSize: 15,
    // color set dynamically
  },
  linkHighlight: {
    fontWeight: "600",
    // color set dynamically (primary)
  },
});
