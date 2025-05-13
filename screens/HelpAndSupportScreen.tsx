// screens/HelpAndSupportScreen.tsx
// © 2025 Oscasavia Birungi. All rights reserved.
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Use safe area
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../ThemeContext"; // Adjust path
import { lightTheme, darkTheme } from "../themeColors"; // Adjust path
import { Feather } from "@expo/vector-icons"; // Use Feather icons

// --- FAQ Data (Example - Customize with your actual FAQs) ---
const faqs = [
  {
    q: "How do I create an event?",
    a: "Navigate to the 'Create' tab using the central (+) button in the bottom navigation bar and fill out the event details.",
  },
  {
    q: "How do I edit my profile?",
    a: "Go to the 'Profile' tab, tap the 'Edit Profile' button, make your changes, and tap 'Save Changes'.",
  },
  {
    q: "How can I save an event?",
    a: "On the Home screen feed, tap the bookmark icon (looks like a ribbon) on the top-right corner of an event card. Saved events appear in your profile.",
  },
  {
    q: "Where can I see my saved events?",
    a: "Navigate to the 'Profile' tab and tap on the 'View your saved events' link.",
  },
  {
    q: "How do I reset my password?",
    a: "On the Login screen, tap the 'Forgot password?' link and enter your email address. Follow the instructions sent to your inbox.",
  },
  {
    q: "How do group chats work?",
    a: "When you view an event's details (by tapping its card on the Home screen), you can tap 'Join Chat'. This will create or join a group chat specifically for that event.",
  },
  // Add more relevant FAQs
];

// --- Contact Info (Replace with your actual details) ---
const SUPPORT_EMAIL = "oscasavia@gmail.com"; // Replace with your support email
// const REPORT_ISSUE_URL = 'https://yourwebsite.com/report-issue'; // URL for reporting issues (optional)
// const HELP_WEBSITE_URL = 'https://yourwebsite.com/help'; // URL for a help website (optional)

export default function HelpAndSupportScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Theme variable fallbacks (Copied from SettingsScreen) ---
  const separatorColor =
    currentTheme.separator || (isDark ? "#3a3a3c" : "#e0e0e0");
  const cardBackgroundColor =
    currentTheme.cardBackground || (isDark ? "#1c1c1e" : "#ffffff");
  const errorColor = currentTheme.error || "#FF3B30"; // Keep in case needed
  const shadowColor = currentTheme.shadowColor || "#000"; // Keep in case needed
  const linkColor = currentTheme.primary || "#007AFF";

  // Set Header Title using navigation options
  useEffect(() => {
    navigation.setOptions({ title: "Help & Support" });
  }, [navigation]);

  // --- Action Handlers ---
  const handleContactEmail = () => {
    const subject = encodeURIComponent("Wimbli App Support Request");
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(
      (err) => {
        console.error("Failed to open mail client:", err);
        Alert.alert(
          "Error",
          "Could not open email client. Please email us directly at " +
            SUPPORT_EMAIL
        );
      }
    );
  };

  const handleReportIssue = () => {
    // Prioritize URL if available
    // if (REPORT_ISSUE_URL) {
    //     Linking.openURL(REPORT_ISSUE_URL).catch(err => Alert.alert("Error", "Could not open link."));
    // } else {
    // Fallback to email
    const subject = encodeURIComponent("Wimbli App - Issue Report");
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(
      (err) => {
        console.error("Failed to open mail client:", err);
        Alert.alert(
          "Error",
          "Could not open email client. Please email us directly at " +
            SUPPORT_EMAIL
        );
      }
    );
    // }
  };

  // const handleOpenWebsite = () => { /* ... */ };

  // --- Render Helper for Settings/Info Row (Copied from SettingsScreen) ---
  const renderInfoRow = (
    iconName: keyof typeof Feather.glyphMap,
    label: string,
    rightContent: React.ReactNode, // Expect Chevron or Value
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

    // Render as TouchableOpacity only if onPress is provided
    return onPress ? (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    ) : (
      content
    );
  };

  // Helper to render the chevron icon
  const renderChevron = () => (
    <Feather
      name="chevron-right"
      size={22}
      color={currentTheme.textSecondary}
    />
  );

  return (
    // Use SafeAreaView WITHOUT edges prop for default top/bottom padding
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
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: cardBackgroundColor,
            borderBottomColor: currentTheme.separator,
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
        <Text style={[styles.screenTitle, { color: currentTheme.textPrimary }]}>
          Help And Support
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* == Section: FAQs == */}
        <View
          style={[
            styles.card,
            { backgroundColor: currentTheme.cardBackground },
          ]}
        >
          <Text
            style={[
              styles.cardHeader,
              { color: currentTheme.textSecondary },
            ]}
          >
            Frequently Asked Questions
          </Text>
          {faqs.map((faq, index) => (
            <View
              key={index}
              style={[
                styles.faqItem, // Use specific style for FAQ content padding
                { backgroundColor: cardBackgroundColor },
                // index === 0 && styles.firstRow, // Apply radius to first
                index === faqs.length - 1 && styles.lastRow, // Apply radius to last
                // Add separator line between items
                index < faqs.length - 1 && {
                  borderBottomColor: separatorColor,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              {/* FAQ Content */}
              <Text
                style={[
                  styles.faqQuestion,
                  { color: currentTheme.textPrimary },
                ]}
              >
                {faq.q}
              </Text>
              <Text
                style={[
                  styles.faqAnswer,
                  { color: currentTheme.textSecondary },
                ]}
              >
                {faq.a}
              </Text>
            </View>
          ))}
        </View>

        {/* == Section: Contact Us == */}
        <View
          style={[
            styles.card,
            { backgroundColor: currentTheme.cardBackground },
          ]}
        >
          <Text
            style={[styles.cardHeader, { color: currentTheme.textSecondary }]}
          >
            Rate & Share
          </Text>
          {renderInfoRow(
            "mail",
            "Email Support",
            renderChevron(), // Show chevron for tappable row
            handleContactEmail,
            false // isFirstInSection
            // false // Not last if Report Issue is below
          )}
          {/* Uncomment if you have a help website
                      {renderInfoRow(
                         "globe",
                         "Help Website",
                         renderChevron(),
                         handleOpenWebsite,
                         false,
                         false
                      )}
                      */}
          {renderInfoRow(
            "alert-triangle",
            "Report an Issue",
            renderChevron(), // Show chevron for tappable row
            handleReportIssue,
            // Adjust isFirstInSection based on whether website link is active
            false, // If website is commented out, this is not first
            true // isLastInSection
          )}
        </View>

        {/* Spacer */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles (Copied and adapted from SettingsScreen) ---
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerContainer: {
    padding: 15,
    // backgroundColor: currentTheme.cardBackground,
    borderBottomWidth: 1,
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
    zIndex: 10, // Ensures it stays above the list in case of overlap
  },
  backButton: {
    paddingRight: 10,
    paddingVertical: 5,
    paddingLeft: 5,
    marginRight: 10,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    marginRight: 45, // balances the left icon space
  },
  scrollContainer: {
    paddingHorizontal: 12,
    paddingTop: 15, // Space below header
    paddingBottom: 30,
  },
  card: {
    width: "100%",
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    elevation: 3,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    padding: 15,
  },
  cardShadow: {
    // Optional shadow for card look
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  section: {
    marginBottom: 15,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    // backgroundColor: currentTheme.background, // Match screen background if needed for spacing illusion
    opacity: 0.8,
  },
  // Setting Row Styles (Reused for Info Rows)
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 15,
    minHeight: 50,
    // backgroundColor set dynamically (cardBackground)
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
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  icon: {
    marginRight: 15,
    width: 24,
    textAlign: "center",
  },
  label: {
    // Reused for infoLabel
    fontSize: 16,
  },
  settingRight: {
    // Reused for infoRight
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end", // Align content to the right
  },
  infoValue: {
    // Style for displaying email/URL etc. (if used)
    fontSize: 14,
    marginRight: 8,
  },
  // --- FAQ Specific Styles ---
  faqItem: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 15,
    lineHeight: 22, // Good line height
  },
});
