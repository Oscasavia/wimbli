// screens/ChangePasswordScreen.tsx
// © 2025 Oscasavia Birungi. All rights reserved.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../firebase"; // Adjust path if needed
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useTheme } from "../ThemeContext"; // Adjust path
import { lightTheme, darkTheme } from "../themeColors"; // Adjust path
import { Feather } from "@expo/vector-icons";

export default function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set Navigation Header Title (Optional, if you want it different from route name)
  useEffect(() => {
    navigation.setOptions({
      title: "Change Password",
      headerStyle: {
        backgroundColor: currentTheme.cardBackground,
      },
      headerTintColor: currentTheme.textPrimary,
      headerTitleStyle: {
        color: currentTheme.textPrimary,
      },
      headerLeft: () =>
        Platform.OS === "ios" ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginLeft: 15 }}
          >
            <Feather
              name="chevron-left"
              size={28}
              color={currentTheme.primary}
            />
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, currentTheme]);

  const handlePasswordUpdate = async () => {
    setError(null); // Clear previous errors

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsLoading(true);
    const user = auth.currentUser;

    if (user && user.email) {
      // Ensure user and email are available
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      try {
        // Re-authenticate the user with their current password
        await reauthenticateWithCredential(user, credential);
        // If re-authentication is successful, then update the password
        await updatePassword(user, newPassword);

        Alert.alert("Success", "Your password has been updated successfully.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } catch (reauthError: any) {
        // console.error("Change Password Error:", reauthError);
        if (reauthError.code === "auth/wrong-password") {
          setError("Incorrect current password. Please try again.");
        } else if (reauthError.code === "auth/too-many-requests") {
          setError("Too many attempts. Please try again later.");
        } else if (reauthError.code === "auth/requires-recent-login") {
          // This error might still occur if the re-authentication itself is considered not recent enough
          // or if you skipped re-authentication and directly called updatePassword.
          Alert.alert(
            "Action Required",
            "This operation is sensitive and requires recent authentication. Please log out and log back in, then try again.",
            [{ text: "OK" }]
          );
        } else {
          setError(
            reauthError.message || "An error occurred. Please try again."
          );
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("User not found or email not available. Please re-login.");
      setIsLoading(false);
    }
  };

  // Dynamic styles based on theme
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: currentTheme.background,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: currentTheme.textPrimary,
      marginBottom: 20,
      textAlign: "center",
    },
    inputContainer: {
      //   marginBottom: 15,
    },
    label: {
      color: currentTheme.textPrimary,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
      marginTop: 15, // Space above labels
    },
    input: {
      backgroundColor: currentTheme.inputBackground,
      color: currentTheme.textPrimary,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 25,
      fontSize: 16,
      borderWidth: 0,
      borderColor: currentTheme.inputBorder || currentTheme.separator,
    },
    button: {
      backgroundColor: currentTheme.primary,
      paddingVertical: 15,
      borderRadius: 25, // Match edit profile button style
      alignItems: "center",
      marginTop: 20,
      // Shadow for button
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    buttonText: {
      color: currentTheme.buttonText || "#FFFFFF",
      fontSize: 18,
      fontWeight: "bold",
    },
    errorText: {
      color: currentTheme.error,
      textAlign: "center",
      marginBottom: 15,
      fontSize: 14,
    },
    // Header styles
    header: {
      // In case you opt for a custom header view within the screen
      padding: 15,
      backgroundColor: currentTheme.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: currentTheme.separator,
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    backButton: {
      paddingRight: 10,
      paddingVertical: 5,
      paddingLeft: 5,
      marginRight: 10,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: currentTheme.textPrimary,
      flex: 1,
      textAlign: "center",
      marginRight: 45, // balances the left icon space
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={currentTheme.cardBackground}
      />
      {/* If not using react-navigation header, you can uncomment this custom header */}
      <View
        style={[
          styles.header,
          {
            flexDirection: "row",
            alignItems: "center",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather
            name="arrow-left"
            size={24}
            color={currentTheme.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.textPrimary }]}>
          Change Password
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter current password"
            placeholderTextColor={currentTheme.textSecondary}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new password (min. 6 characters)"
            placeholderTextColor={currentTheme.textSecondary}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={currentTheme.textSecondary}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={handlePasswordUpdate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={currentTheme.buttonText || "#FFFFFF"} />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
