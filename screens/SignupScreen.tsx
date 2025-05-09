import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  Image,
  StatusBar,
  Keyboard,
  SafeAreaView, // Use the one from react-native-safe-area-context if installed, otherwise react-native
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Pressable, // For checkbox label tap
} from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase"; // Adjust path if needed
import { doc, setDoc, Timestamp } from "firebase/firestore"; // Added setDoc
import { useNavigation } from "@react-navigation/native";
import CheckBox from "expo-checkbox"; // Keep expo-checkbox
import { Feather } from "@expo/vector-icons"; // Use Feather
import { useTheme } from "../ThemeContext"; // Adjust path if needed
import { lightTheme, darkTheme } from "../themeColors"; // Adjust path if needed
// Removed LinearGradient, FontAwesome, MaterialIcons
// Removed AsyncStorage if not used here

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
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
  const linkColor = currentTheme.primary || "#007AFF";
  const checkboxColor = currentTheme.primary || "#007AFF";

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    // Basic Validation (Keep existing checks)
    if (!trimmedEmail || !trimmedUsername || !password || !confirmPassword) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }
    if (!agreed) {
      Alert.alert(
        "Agreement Required",
        "You must agree to the Terms and Privacy Policy to sign up."
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    try {
      // 1. Create Auth User
      const userCred = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      const user = userCred.user;
      console.log("Auth user created:", user.uid);

      // 2. Update Auth Profile (Display Name)
      await updateProfile(user, { displayName: trimmedUsername });
      console.log("Auth profile updated with displayName:", trimmedUsername);

      // 3. Create User Document in Firestore (Important!)
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          username: trimmedUsername,
          email: trimmedEmail,
          createdAt: Timestamp.now(), // Use Firestore Timestamp
          interests: [],
          profilePicture: null,
          bio: "",
          profileSetupCompleted: false, // Mark setup as incomplete
        },
        { merge: true }
      ); // Use merge just in case, though setDoc usually overwrites
      console.log("Firestore user document created:", user.uid);

      // 4. Navigate to next step
      navigation.replace("Interests");
    } catch (error: any) {
      // --- Enhanced Logging ---
      // console.error("--- Signup Error Details ---");
      // console.error("Code:", error.code);        // Log the specific code
      // console.error("Message:", error.message);  // Log the specific message
      // console.error("Full Error:", error); // Optional full object log
      // console.error("----------------------------");

      // --- User Feedback (Using Switch for consistency) ---
      let userErrorMessage =
        "Signup failed. Please check your details and try again."; // Default

      switch (error.code) {
        case "auth/email-already-in-use":
          userErrorMessage =
            "This email address is already registered. Please try logging in or use a different email.";
          break;
        case "auth/invalid-email":
          userErrorMessage = "Please enter a valid email address.";
          break;
        case "auth/weak-password":
          userErrorMessage =
            "Password is too weak. Please use at least 6 characters.";
          break;
        case "auth/operation-not-allowed":
          userErrorMessage =
            "Email/password sign up is not enabled. Please contact support.";
          break;
        case "auth/network-request-failed":
          userErrorMessage =
            "Network error. Please check your internet connection.";
          break;
        // Add other specific codes if needed
        default:
          console.log("Unhandled Firebase signup error code:", error.code);
          // Keep a generic message for unknown errors
          break;
      }

      Alert.alert("Signup Failed", userErrorMessage);
    } finally {
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

        {/* Signup Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, shadowColor: shadowColor },
          ]}
        >
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            Create Your Account
          </Text>

          {/* Username Input */}
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
              name="user"
              size={20}
              color={iconColor}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Username"
              placeholderTextColor={placeholderTextColor}
              style={[styles.textInput, { color: currentTheme.textPrimary }]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              textContentType="username" // Helps with autofill
            />
          </View>

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
              textContentType="emailAddress"
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
              textContentType="newPassword" // Hint for new password
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

          {/* Confirm Password Input */}
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
              placeholder="Confirm Password"
              placeholderTextColor={placeholderTextColor}
              style={[styles.textInput, { color: currentTheme.textPrimary }]}
              secureTextEntry={!confirmPasswordVisible}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              style={styles.eyeIconTouchable}
            >
              <Feather
                name={confirmPasswordVisible ? "eye-off" : "eye"}
                size={20}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>

          {/* Terms & Privacy Checkbox */}
          <View style={styles.checkboxContainer}>
            <CheckBox
              value={agreed}
              onValueChange={setAgreed}
              color={agreed ? checkboxColor : undefined} // Apply theme color when checked
              style={styles.checkbox}
            />
            {/* Use Pressable for better tap handling on label */}
            <Pressable
              onPress={() => setAgreed(!agreed)}
              style={styles.checkboxLabelContainer}
            >
              <Text
                style={[
                  styles.checkboxLabelBase,
                  { color: currentTheme.textSecondary },
                ]}
              >
                I agree to the{" "}
                <Text
                  style={[styles.linkHighlight, { color: linkColor }]}
                  onPress={() =>
                    navigation.navigate("WebView", {
                      url: "https://cerulean-biscotti-582837.netlify.app/",
                    })
                  } // Replace with your actual URL
                >
                  Terms
                </Text>{" "}
                and{" "}
                <Text
                  style={[styles.linkHighlight, { color: linkColor }]}
                  onPress={() =>
                    navigation.navigate("WebView", {
                      url: "https://lovely-unicorn-a7167c.netlify.app/",
                    })
                  } // Replace with your actual URL
                >
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[
              styles.signupButton,
              { backgroundColor: currentTheme.primary },
              isLoading && styles.signupButtonDisabled,
            ]}
            onPress={handleSignup}
            disabled={isLoading || !agreed} // Also disable if not agreed
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
                  styles.signupButtonText,
                  { color: currentTheme.buttonText || "#fff" },
                ]}
              >
                Sign Up
              </Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text
              style={[styles.linkText, { color: currentTheme.textSecondary }]}
            >
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text
                style={[
                  styles.linkText,
                  styles.linkHighlight,
                  { color: linkColor },
                ]}
              >
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {/* </KeyboardAvoidingView> */}
    </SafeAreaView>
  );
}

// --- Styles --- (Similar to LoginScreen styles, with additions/adjustments)
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
    marginBottom: 25, // Adjusted margin
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
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 8,
    // elevation: 5,
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
    marginBottom: 25, // Adjusted margin
    textAlign: "center",
    // color set dynamically
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderRadius: 25,
    paddingHorizontal: 12,
    marginBottom: 18, // Adjusted margin
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
  eyeIconTouchable: {
    padding: 5,
    marginLeft: 5,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center", // Align checkbox and text nicely
    marginBottom: 25, // More space below checkbox
    marginTop: 5, // Space above checkbox
  },
  checkbox: {
    marginRight: 10,
    // Apply size styling if needed, default might be small
    width: 20,
    height: 20, // Example size
  },
  checkboxLabelContainer: {
    // Make label tappable
    flex: 1,
  },
  checkboxLabelBase: {
    // Base style for label text
    fontSize: 14, // Slightly smaller for terms
    lineHeight: 20,
    // color set dynamically (textSecondary)
  },
  signupButton: {
    paddingVertical: 14,
    borderRadius: 25, // Consistent rounded button
    alignItems: "center",
    marginTop: 10, // Space above button
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
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    // color set dynamically
  },
  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25, // More space above login link
  },
  linkText: {
    fontSize: 15,
    // color set dynamically
  },
  linkHighlight: {
    fontWeight: "600",
    // color set dynamically (primary)
    textDecorationLine: Platform.OS === "ios" ? "underline" : "none", // Underline only on iOS? Optional.
  },
});
