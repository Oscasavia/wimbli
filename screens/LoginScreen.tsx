// © 2025 Oscasavia Birungi. All rights reserved.
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Keyboard,
  Platform,
  KeyboardAvoidingView, // Added
  ScrollView, // Added
  ActivityIndicator, // Added
  Alert, // Keep Alert
} from "react-native";
import { Feather } from "@expo/vector-icons"; // Use Feather icons
import { useNavigation } from "@react-navigation/native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // Adjust path if needed
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../ThemeContext"; // Adjust path if needed
import { lightTheme, darkTheme } from "../themeColors"; // Adjust path if needed

// Removed LinearGradient

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for login button
  const navigation = useNavigation<any>();
  const { theme } = useTheme(); // Use theme context
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
  const linkColor = currentTheme.primary || "#007AFF";

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Info", "Please enter both email and password.");
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password); // Trim email
      // TODO: Verify if removing "Interests" here is still necessary.
      await AsyncStorage.removeItem("Interests");
      console.log("Login successful");

      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }], // Ensure 'Main' is correct
      });
    } catch (error: any) {
      // --- Enhanced Logging ---
      // console.error("--- Login Error Details ---");
      // console.error("Code:", error.code);       // Log the specific code
      // console.error("Message:", error.message); // Log the Firebase message
      // console.error("Full Error:", error); // Keep this commented unless needed for deeper dive
      // console.error("---------------------------");

      // --- Improved User Feedback ---
      let userErrorMessage =
        "Login failed. Please check your credentials and try again."; // Default user message

      // Use switch for cleaner handling of specific codes
      switch (error.code) {
        case "auth/invalid-credential":
          // This code often covers user-not-found and wrong-password implicitly now
          // case 'auth/user-not-found': // Can often be removed as invalid-credential covers it
          // case 'auth/wrong-password': // Can often be removed as invalid-credential covers it
          userErrorMessage = "Invalid email or password.";
          break;
        case "auth/invalid-email":
          userErrorMessage = "Please enter a valid email address.";
          break;
        case "auth/too-many-requests":
          userErrorMessage =
            "Access temporarily disabled due to too many login attempts. Please reset your password or try again later.";
          break;
        case "auth/network-request-failed":
          userErrorMessage =
            "Network error. Please check your internet connection and try again.";
          break;
        case "auth/user-disabled":
          userErrorMessage = "This user account has been disabled.";
          break;
        // Add any other specific codes you want to handle
        default:
          // You could use the Firebase message for unhandled errors, but keep it generic for security
          console.log("Unhandled Firebase login error code:", error.code); // Log unhandled codes
          // Keep the generic message for the user:
          // userErrorMessage = "An unexpected error occurred. Please try again.";
          break;
      }

      Alert.alert("Login Failed", userErrorMessage);
      setIsLoading(false); // Ensure loading stops on error
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.screenContainer,
        { backgroundColor: currentTheme.background },
      ]}
    >
      <StatusBar
        backgroundColor={currentTheme.background}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
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
              source={require("../assets/wimbli-icon-bg.png")} // Ensure path is correct
              style={styles.logoImage}
            />
          </View>
          <Text style={[styles.appName, { color: currentTheme.primary }]}>
            Wimbli
          </Text>
        </View>

        {/* Login Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, shadowColor: shadowColor },
          ]}
        >
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            Welcome Back!
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
              placeholder="Email Address"
              placeholderTextColor={placeholderTextColor}
              style={[styles.textInput, { color: currentTheme.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress" // Help password managers
            />
          </View>

          {/* Password Input */}
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
              name="lock"
              size={20}
              color={iconColor}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={placeholderTextColor}
              style={[styles.textInput, { color: currentTheme.textPrimary }]}
              secureTextEntry={!passwordVisible}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              textContentType="password" // Help password managers
            />
            <TouchableOpacity
              onPress={() => setPasswordVisible(!passwordVisible)}
              style={styles.eyeIconTouchable}
            >
              <Feather
                name={passwordVisible ? "eye-off" : "eye"}
                size={20}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => navigation.replace("ForgotPassword")}
          >
            <Text
              style={[
                styles.linkText,
                styles.linkHighlight,
                { color: linkColor },
              ]}
            >
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: currentTheme.primary },
              isLoading && styles.loginButtonDisabled, // Style disabled state
            ]}
            onPress={handleLogin}
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
                  styles.loginButtonText,
                  { color: currentTheme.buttonText || "#fff" },
                ]}
              >
                Login
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text
              style={[styles.linkText, { color: currentTheme.textSecondary }]}
            >
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.replace("Signup")}>
              <Text
                style={[
                  styles.linkText,
                  styles.linkHighlight,
                  { color: linkColor },
                ]}
              >
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {/* </KeyboardAvoidingView> */}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1, // Ensure content can grow to center vertically
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
    padding: 16, // Padding around the content
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30, // Increased space below logo
  },
  logoCircle: {
    width: 80, // Slightly larger logo circle
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    // backgroundColor set dynamically
  },
  logoImage: {
    width: 100, // Adjust size as needed
    height: 100,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 32, // Larger app name
    fontWeight: "bold",
    // color set dynamically
  },
  card: {
    width: "100%",
    maxWidth: 400, // Max width for larger screens
    borderRadius: 16,
    padding: 25,
    // backgroundColor set dynamically
    // Shadow
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 8,
    // elevation: 5, // Android shadow
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
    fontSize: 24, // Slightly larger title
    fontWeight: "bold",
    marginBottom: 30, // More space below title
    textAlign: "center",
    // color set dynamically
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderRadius: 25, // Consistent radius
    paddingHorizontal: 12,
    marginBottom: 18, // More space between inputs
    height: 50, // Consistent height
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
    marginRight: 10, // Consistent spacing
    marginLeft: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 0, // Remove default padding
    fontSize: 16,
    // color set dynamically
  },
  eyeIconTouchable: {
    padding: 5, // Increase tappable area
    marginLeft: 5,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end", // Align to the right
    marginBottom: 20, // Space before login button
  },
  loginButton: {
    paddingVertical: 14,
    borderRadius: 25, // Consistent rounded button
    alignItems: "center",
    marginTop: 10, // Space above button
    // Shadow (optional, added to card)
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
  loginButtonDisabled: {
    opacity: 0.7, // Indicate disabled state
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    // color set dynamically
  },
  signupContainer: {
    flexDirection: "row", // Keep text side-by-side
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25, // More space above signup link
  },
  linkText: {
    textAlign: "center",
    fontSize: 15, // Consistent link size
    // color set dynamically
  },
  linkHighlight: {
    fontWeight: "600", // Make tappable links slightly bolder
    // color set dynamically (primary)
  },
});
