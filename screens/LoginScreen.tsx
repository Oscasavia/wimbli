import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
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
  const cardBackgroundColor = currentTheme.cardBackground || (isDark ? '#1c1c1e' : '#ffffff');
  const inputBackgroundColor = currentTheme.inputBackground || (isDark ? '#2c2c2e' : '#f0f0f0');
  const inputBorderColor = currentTheme.inputBorder || (isDark ? '#444' : '#ddd');
  const placeholderTextColor = currentTheme.textSecondary || '#8e8e93';
  const iconColor = currentTheme.textSecondary || '#8e8e93';
  const shadowColor = currentTheme.shadowColor || '#000';
  const linkColor = currentTheme.primary || '#007AFF';

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
        Alert.alert("Missing Info", "Please enter both email and password.");
        return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password); // Trim email
      // TODO: Verify if removing "Interests" here is still necessary.
      // This seems like leftover logic from an onboarding flow perhaps?
      // Consider removing if it's not related to login.
      await AsyncStorage.removeItem("Interests");
      console.log("Login successful");

      // Reset navigation to the main authenticated stack
      // Ensure 'Main' is the correct name of your Tab Navigator or authenticated stack root
      navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
      });

    } catch (error: any) {
       console.error("Login Error:", error);
      // Provide more user-friendly messages for common errors
      let errorMessage = "Login failed. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
         errorMessage = "Access temporarily disabled due to too many attempts. Please try again later.";
      }
      Alert.alert("Login Failed", errorMessage);
      setIsLoading(false); // Ensure loading stops on error
    }
    // No finally block needed if navigation happens on success
  };

  return (
    <SafeAreaView style={[styles.screenContainer, { backgroundColor: currentTheme.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // Adjust as needed
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Area */}
          <View style={styles.logoContainer}>
             <View style={[styles.logoCircle, { backgroundColor: currentTheme.primary + '20' }]}>
               <Image
                 source={require("../assets/wimbli-icon-bg.png")} // Ensure path is correct
                 style={styles.logoImage}
               />
             </View>
            <Text style={[styles.appName, { color: currentTheme.primary }]}>Wimbli</Text>
          </View>

          {/* Login Card */}
          <View style={[styles.card, { backgroundColor: cardBackgroundColor, shadowColor: shadowColor }]}>
            <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Welcome Back!</Text>

            {/* Email Input */}
            <View style={[styles.inputContainer, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}>
              <Feather name="mail" size={20} color={iconColor} style={styles.inputIcon} />
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
            <View style={[styles.inputContainer, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}>
               <Feather name="lock" size={20} color={iconColor} style={styles.inputIcon} />
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
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIconTouchable}>
                 <Feather
                   name={passwordVisible ? "eye-off" : "eye"}
                   size={20}
                   color={iconColor}
                 />
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={[styles.linkText, styles.linkHighlight, { color: linkColor }]}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
                style={[
                    styles.loginButton,
                    { backgroundColor: currentTheme.primary },
                    isLoading && styles.loginButtonDisabled // Style disabled state
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={currentTheme.buttonText || '#fff'} />
                ) : (
                    <Text style={[styles.loginButtonText, { color: currentTheme.buttonText || '#fff' }]}>Login</Text>
                )}
            </TouchableOpacity>

            {/* Sign Up Link */}
             <View style={styles.signupContainer}>
                <Text style={[styles.linkText, { color: currentTheme.textSecondary }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                   <Text style={[styles.linkText, styles.linkHighlight, { color: linkColor }]}>
                     Sign up
                   </Text>
                </TouchableOpacity>
             </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    padding: 20, // Padding around the content
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30, // Increased space below logo
  },
  logoCircle: {
    width: 80, // Slightly larger logo circle
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    // backgroundColor set dynamically
  },
  logoImage: {
     width: 90, // Adjust size as needed
     height: 90,
     resizeMode: 'contain',
  },
  appName: {
    fontSize: 32, // Larger app name
    fontWeight: 'bold',
    // color set dynamically
  },
  card: {
    width: '100%',
    maxWidth: 400, // Max width for larger screens
    borderRadius: 16,
    padding: 25,
    // backgroundColor set dynamically
    // Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5, // Android shadow
  },
  title: {
    fontSize: 24, // Slightly larger title
    fontWeight: 'bold',
    marginBottom: 30, // More space below title
    textAlign: 'center',
    // color set dynamically
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10, // Consistent radius
    paddingHorizontal: 12,
    marginBottom: 18, // More space between inputs
    height: 50, // Consistent height
    // backgroundColor, borderColor set dynamically
  },
  inputIcon: {
    marginRight: 10, // Consistent spacing
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
     alignSelf: 'flex-end', // Align to the right
     marginBottom: 20, // Space before login button
  },
  loginButton: {
    paddingVertical: 14,
    borderRadius: 25, // Consistent rounded button
    alignItems: 'center',
    marginTop: 10, // Space above button
    // Shadow (optional, added to card)
    // Dynamic background color
  },
  loginButtonDisabled: {
     opacity: 0.7, // Indicate disabled state
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    // color set dynamically
  },
   signupContainer: {
     flexDirection: 'row', // Keep text side-by-side
     justifyContent: 'center',
     alignItems: 'center',
     marginTop: 25, // More space above signup link
   },
  linkText: {
    textAlign: 'center',
    fontSize: 15, // Consistent link size
    // color set dynamically
  },
  linkHighlight: {
    fontWeight: '600', // Make tappable links slightly bolder
    // color set dynamically (primary)
  },
});