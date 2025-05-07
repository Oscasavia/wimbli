import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView, // Added ScrollView
  Platform, // Added Platform
  ActivityIndicator, // Added for delete/logout potentially
} from "react-native";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { signOut, deleteUser } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import * as Application from "expo-application"; // For App Version

// Removed LinearGradient

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();
  const navigation = useNavigation<any>();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // --- Theme variable fallbacks ---
  const separatorColor =
    currentTheme.separator || (isDark ? "#3a3a3c" : "#e0e0e0");
  const inputBackgroundColor =
    currentTheme.inputBackground || (isDark ? "#2c2c2e" : "#f0f0f0");
  const cardBackgroundColor =
    currentTheme.cardBackground || (isDark ? "#1c1c1e" : "#ffffff");
  const errorColor = currentTheme.error || "#FF3B30";
  const shadowColor = currentTheme.shadowColor || "#000"; // If using shadows

  // Set Navigation Header Title
  useEffect(() => {
    navigation.setOptions({ title: "Settings" });
  }, [navigation]);

  // Get App Version
  useEffect(() => {
    setAppVersion(Application.nativeApplicationVersion || "N/A");
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double taps
    setIsLoggingOut(true);
    try {
      console.log("SettingsScreen: Signing out...");
      await signOut(auth);
      console.log(
        "SettingsScreen: Sign out successful. Resetting navigation to Login."
      );

      // Reset navigation stack to Login screen after successful sign out
      navigation.reset({
        index: 0,
        // Make sure 'Login' is the correct name of your Login screen route
        routes: [{ name: "Login" }],
      });
      // No need to set isLoggingOut back to false, as the component will unmount.
    } catch (error: any) {
      console.error("SettingsScreen: Logout Error:", error);
      Alert.alert("Logout Error", error.message);
      setIsLoggingOut(false); // Only reset on error
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone. All your data, posts, and chats associated with this account will be lost.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setIsDeleting(false),
        },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: handleDeleteAccount,
        },
      ],
      { cancelable: false }
    );
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No user found to delete.");
      setIsDeleting(false);
      return;
    }
    const uid = user.uid; // Get UID before potentially deleting user

    try {
      //  console.log(`Attempting to delete Firestore doc for UID: ${uid}`);
      // 1. Delete Firestore data first (or relevant associated data)
      await deleteDoc(doc(db, "users", uid));
      //  console.log(`Firestore doc deleted for UID: ${uid}`);

      // 2. Delete Firebase Auth user
      //  console.log(`Attempting to delete Auth user for UID: ${uid}`);
      await deleteUser(user);
      //  console.log(`Auth user deleted for UID: ${uid}`);

      Alert.alert(
        "Account Deleted",
        "Your account has been successfully deleted."
      );
      // Navigation likely handled by root navigator listening to auth state change
      // Navigate to Signup screen directly
      navigation.reset({
        index: 0,
        routes: [{ name: "Signup" }],
      });
    } catch (error: any) {
      console.error("Delete Account Error:", error);
      // Handle specific errors like 'auth/requires-recent-login'
      if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Re-authentication Required",
          "This is a sensitive operation. Please log out and log back in recently before deleting your account."
        );
      } else {
        Alert.alert(
          "Delete Account Error",
          `An error occurred: ${error.message}`
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Render Helper for Settings Row ---
  const renderSettingRow = (
    iconName: keyof typeof Feather.glyphMap, // Ensure icon name is valid
    label: string,
    rightContent: React.ReactNode, // Component like Switch or Chevron
    onPress?: () => void,
    isFirstInSection?: boolean,
    isLastInSection?: boolean
  ) => {
    const rowStyles = [
      styles.settingRow,
      { backgroundColor: cardBackgroundColor },
      isFirstInSection && styles.firstRow,
      isLastInSection && styles.lastRow,
      !isLastInSection && {
        borderBottomColor: separatorColor,
        borderBottomWidth: StyleSheet.hairlineWidth,
      },
      // Add shadow styles if desired for card look
      styles.cardShadow,
      { shadowColor },
    ];
    const content = (
      <View style={rowStyles}>
        <View style={styles.settingLeft}>
          <Feather
            name={iconName}
            size={22}
            color={currentTheme.textSecondary}
            style={styles.icon}
          />
          <Text style={[styles.label, { color: currentTheme.textPrimary }]}>
            {label}
          </Text>
        </View>
        <View style={styles.settingRight}>{rightContent}</View>
      </View>
    );

    return onPress ? (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    ) : (
      content
    );
  };

  const renderChevron = () => (
    <Feather
      name="chevron-right"
      size={22}
      color={currentTheme.textSecondary}
    />
  );

  // --- Main Component Return ---
  return (
    <SafeAreaView
      style={[
        styles.screenContainer,
        { backgroundColor: currentTheme.background },
      ]}
    >
      <StatusBar
        translucent={false}
        backgroundColor={cardBackgroundColor}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      {/* Screen Title */}
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: cardBackgroundColor },
        ]}
      >
        <Text style={[styles.screenTitle, { color: currentTheme.textPrimary }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* == Section: Appearance == */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionHeader,
              { color: currentTheme.textSecondary },
            ]}
          >
            Appearance
          </Text>
          {renderSettingRow(
            "moon",
            "Dark Mode",
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              thumbColor={
                Platform.OS === "android" ? currentTheme.primary : undefined
              } // Android thumb color
              trackColor={{
                false: "#767577",
                true: currentTheme.primary + "70",
              }} // Use primary with opacity for track
              ios_backgroundColor="#3e3e3e" // iOS specific track background
            />,
            undefined, // onPress is handled by Switch
            true, // isFirstInSection
            true // isLastInSection
          )}
        </View>

        {/* == Section: Account == */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionHeader,
              { color: currentTheme.textSecondary },
            ]}
          >
            Account
          </Text>
          {renderSettingRow(
            "user",
            "Edit Profile",
            renderChevron(),
            () => navigation.navigate("EditProfile"), // Navigate to Edit Profile Screen
            true // isFirstInSection
          )}
          {renderSettingRow(
            "lock",
            "Change Password",
            renderChevron(),
            () =>
              Alert.alert(
                "Coming Soon",
                "Change password functionality will be added later."
              ), // Placeholder action
            false, // isFirstInSection
            true // isLastInSection
          )}
        </View>

        {/* == Section: Preferences == */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionHeader,
              { color: currentTheme.textSecondary },
            ]}
          >
            Preferences
          </Text>
          {renderSettingRow(
            "bell",
            "Notifications",
            renderChevron(),
            () =>
              Alert.alert(
                "Coming Soon",
                "Notification settings will be added later."
              ), // Placeholder action
            true, // isFirstInSection
            true // isLastInSection
          )}
        </View>

        {/* == Section: About & Support == */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionHeader,
              { color: currentTheme.textSecondary },
            ]}
          >
            About & Support
          </Text>
          {renderSettingRow(
            "help-circle",
            "Help & Support",
            renderChevron(),
            () => navigation.navigate("HelpAndSupport"), // Placeholder action
            true // isFirstInSection
          )}
          {renderSettingRow(
            "info",
            "About App",
            renderChevron(),
            () => navigation.navigate("AboutApp"), // Placeholder action
            false
          )}
          {renderSettingRow(
            "shield",
            "Privacy Policy",
            renderChevron(),
            () =>
              Alert.alert(
                "Coming Soon",
                "Privacy Policy link will be added later."
              ), // Placeholder action
            false
          )}
          {renderSettingRow(
            "file-text",
            "Terms of Service",
            renderChevron(),
            () =>
              Alert.alert(
                "Coming Soon",
                "Terms of Service link will be added later."
              ), // Placeholder action
            false, // isFirstInSection
            true // isLastInSection
          )}
        </View>

        {/* App Version Display */}
        <Text
          style={[styles.versionText, { color: currentTheme.textSecondary }]}
        >
          App Version: {appVersion}
        </Text>

        {/* == Section: Actions == */}
        <View style={styles.section}>
          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={[
              styles.actionButton,
              styles.logoutButton,
              {
                backgroundColor: currentTheme.cardBackground,
                borderColor: currentTheme.primary,
              },
            ]}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={currentTheme.primary} />
            ) : (
              <>
                <Feather
                  name="log-out"
                  size={20}
                  color={currentTheme.primary}
                  style={styles.actionIcon}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: currentTheme.primary },
                  ]}
                >
                  Logout
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Delete Account Button */}
          <TouchableOpacity
            onPress={confirmDeleteAccount}
            disabled={isDeleting}
            style={[
              styles.actionButton,
              styles.deleteButton,
              { backgroundColor: cardBackgroundColor, borderColor: errorColor },
            ]}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={errorColor} />
            ) : (
              <>
                <Feather
                  name="trash-2"
                  size={20}
                  color={errorColor}
                  style={styles.actionIcon}
                />
                <Text style={[styles.actionButtonText, { color: errorColor }]}>
                  Delete Account
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Spacer at the bottom */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "android" ? 15 : 10, // Adjust top padding
    paddingBottom: 10,
    // backgroundColor: currentTheme.background, // Optional: if header needs distinct bg
    borderBottomWidth: 1,
    borderBottomColor: "transparent", // Use theme border
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
    zIndex: 10, // Ensures it stays above the list in case of overlap
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: "1.9%",
    marginBottom: 4,
    // paddingHorizontal: 20,
    paddingHorizontal: 12,
  },
  scrollContainer: {
    paddingHorizontal: 12,
    paddingTop: 15, // Space below header
    paddingBottom: 30,
  },
  // Removed custom title style
  section: {
    marginBottom: 15, // Space between sections
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    // color set dynamically
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 5, // Slight indent for header
    opacity: 0.8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14, // Vertical padding for row height
    paddingHorizontal: 15,
    // backgroundColor set dynamically (cardBackground)
    // borderRadius applied conditionally
  },
  firstRow: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  lastRow: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomWidth: 0, // No bottom border on the last item
  },
  cardShadow: {
    // Optional shadow for card look
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1, // Allow label to take up space
    paddingRight: 10, // Space before switch/chevron
  },
  icon: {
    marginRight: 15, // Space between icon and label
    width: 24, // Ensure icon width for alignment
    textAlign: "center",
  },
  label: {
    fontSize: 16, // Slightly smaller label
  },
  settingRight: {
    // Container for Switch or Chevron
  },
  // chevronIcon: { // Not explicitly needed if using Feather directly
  // },
  switchStyle: {
    // If specific switch styling needed beyond props
    // transform: [{ scaleX: .8 }, { scaleY: .8 }] // Example: make switch smaller
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10, // Consistent border radius
    marginTop: 15, // Space between action buttons
    borderWidth: 1.5, // Border for outline style
  },
  logoutButton: {
    // backgroundColor: cardBackgroundColor, // set dynamically
    // borderColor: currentTheme.primary, // set dynamically
  },
  deleteButton: {
    // backgroundColor: cardBackgroundColor, // set dynamically
    // borderColor: errorColor, // set dynamically
  },
  actionIcon: {
    marginRight: 10,
  },
  actionButtonText: {
    fontWeight: "600", // Slightly less bold than header
    fontSize: 16,
  },
  versionText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
    // color set dynamically
  },
});
