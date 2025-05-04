// screens/HelpAndSupportScreen.tsx

import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Platform,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Use safe area
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext'; // Adjust path
import { lightTheme, darkTheme } from '../themeColors'; // Adjust path
import { Feather } from '@expo/vector-icons'; // Use Feather icons

// --- FAQ Data (Example - Customize with your actual FAQs) ---
const faqs = [
    { q: "How do I create an event?", a: "Navigate to the 'Create' tab using the central (+) button in the bottom navigation bar and fill out the event details." },
    { q: "How do I edit my profile?", a: "Go to the 'Profile' tab, tap the 'Edit Profile' button, make your changes, and tap 'Save Changes'." },
    { q: "How can I save an event?", a: "On the Home screen feed, tap the bookmark icon (looks like a ribbon) on the top-right corner of an event card. Saved events appear in your profile." },
    { q: "Where can I see my saved events?", a: "Navigate to the 'Profile' tab and tap on the 'View your saved events' link." },
    { q: "How do I reset my password?", a: "On the Login screen, tap the 'Forgot password?' link and enter your email address. Follow the instructions sent to your inbox." },
    { q: "How do group chats work?", a: "When you view an event's details (by tapping its card on the Home screen), you can tap 'Join Chat'. This will create or join a group chat specifically for that event." },
    // Add more relevant FAQs
];

// --- Contact Info (Replace with your actual details) ---
const SUPPORT_EMAIL = 'oscasavia@gmail.com'; // Replace with your support email
// const REPORT_ISSUE_URL = 'https://yourwebsite.com/report-issue'; // URL for reporting issues (optional)
// const HELP_WEBSITE_URL = 'https://yourwebsite.com/help'; // URL for a help website (optional)

export default function HelpAndSupportScreen() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? darkTheme : lightTheme;

    // --- Theme variable fallbacks (Copied from SettingsScreen) ---
    const separatorColor = currentTheme.separator || (isDark ? '#3a3a3c' : '#e0e0e0');
    const cardBackgroundColor = currentTheme.cardBackground || (isDark ? '#1c1c1e' : '#ffffff');
    const errorColor = currentTheme.error || '#FF3B30'; // Keep in case needed
    const shadowColor = currentTheme.shadowColor || '#000'; // Keep in case needed
    const linkColor = currentTheme.primary || '#007AFF';

    // Set Header Title using navigation options
    useEffect(() => {
        navigation.setOptions({ title: 'Help & Support' });
    }, [navigation]);

    // --- Action Handlers ---
    const handleContactEmail = () => {
        const subject = encodeURIComponent("Wimbli App Support Request");
        Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`)
            .catch(err => {
                console.error("Failed to open mail client:", err);
                Alert.alert("Error", "Could not open email client. Please email us directly at " + SUPPORT_EMAIL);
            });
    };

    const handleReportIssue = () => {
         // Prioritize URL if available
        // if (REPORT_ISSUE_URL) {
        //     Linking.openURL(REPORT_ISSUE_URL).catch(err => Alert.alert("Error", "Could not open link."));
        // } else {
             // Fallback to email
            const subject = encodeURIComponent("Wimbli App - Issue Report");
            Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`)
                .catch(err => {
                    console.error("Failed to open mail client:", err);
                    Alert.alert("Error", "Could not open email client. Please email us directly at " + SUPPORT_EMAIL);
                });
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
          styles.settingRow, // Reuse settingRow style name
          { backgroundColor: cardBackgroundColor },
          isFirstInSection && styles.firstRow,
          isLastInSection && styles.lastRow,
          !isLastInSection && { borderBottomColor: separatorColor, borderBottomWidth: StyleSheet.hairlineWidth },
      ];
      const content = (
          <View style={rowStyles}>
             <View style={styles.settingLeft}>
               <Feather name={iconName} size={22} color={currentTheme.textSecondary} style={styles.icon} />
               <Text style={[styles.label, { color: currentTheme.textPrimary }]}>{label}</Text>
             </View>
             <View style={styles.settingRight}>
               {rightContent}
             </View>
          </View>
      );

      // Render as TouchableOpacity only if onPress is provided
      return onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity> : content;
    };

    // Helper to render the chevron icon
    const renderChevron = () => <Feather name="chevron-right" size={22} color={currentTheme.textSecondary} />;


    return (
        // Use SafeAreaView WITHOUT edges prop for default top/bottom padding
        <SafeAreaView style={[styles.screenContainer, { backgroundColor: currentTheme.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

                {/* == Section: FAQs == */}
                 <View style={styles.section}>
                     <Text style={[styles.sectionHeader, { color: currentTheme.textSecondary }]}>Frequently Asked Questions</Text>
                     {faqs.map((faq, index) => (
                         <View
                            key={index}
                            style={[
                                styles.faqItem, // Use specific style for FAQ content padding
                                { backgroundColor: cardBackgroundColor },
                                index === 0 && styles.firstRow, // Apply radius to first
                                index === faqs.length - 1 && styles.lastRow, // Apply radius to last
                                // Add separator line between items
                                index < faqs.length - 1 && { borderBottomColor: separatorColor, borderBottomWidth: StyleSheet.hairlineWidth },
                            ]}
                         >
                            {/* FAQ Content */}
                            <Text style={[styles.faqQuestion, { color: currentTheme.textPrimary }]}>{faq.q}</Text>
                            <Text style={[styles.faqAnswer, { color: currentTheme.textSecondary }]}>{faq.a}</Text>
                         </View>
                     ))}
                </View>

                 {/* == Section: Contact Us == */}
                 <View style={styles.section}>
                     <Text style={[styles.sectionHeader, { color: currentTheme.textSecondary }]}>Contact & Support</Text>
                     {renderInfoRow(
                         "mail",
                         "Email Support",
                         renderChevron(), // Show chevron for tappable row
                         handleContactEmail,
                         true, // isFirstInSection
                         false // Not last if Report Issue is below
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
  scrollContainer: {
    paddingHorizontal: 0, // Let sections handle horizontal margin
    paddingTop: 25,
    paddingBottom: 30,
  },
  section: {
     marginBottom: 25,
     marginHorizontal: 16,
     borderRadius: 12,
     overflow: 'hidden',
     // Add shadow like SettingsScreen if desired (optional)
      // shadowColor: "#000", // Use shadowColor variable
      // shadowOffset: { width: 0, height: 1 },
      // shadowOpacity: 0.08,
      // shadowRadius: 3,
      // elevation: 2,
     // Apply border if shadow isn't prominent enough, especially in dark mode
     // borderWidth: StyleSheet.hairlineWidth,
     // borderColor: separatorColor, // Use theme separator color for border
  },
  sectionHeader: {
     fontSize: 14,
     fontWeight: '600',
     textTransform: 'uppercase',
     // color set dynamically
    //  paddingHorizontal: 15, // Indent header to align with row content
    //  paddingTop: 15,
    //  paddingBottom: 8,
     marginBottom: 8,
     // backgroundColor: currentTheme.background, // Match screen background if needed for spacing illusion
     opacity: 0.8,
  },
  // Setting Row Styles (Reused for Info Rows)
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    minHeight: 50,
    // backgroundColor set dynamically (cardBackground)
  },
   firstRow: {
     borderTopRightRadius: 12,
     borderTopLeftRadius: 12,
   },
   lastRow: {
      // Removed - Radius now on section
     borderBottomWidth: 0, // No bottom border on the last item within the section view
   },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  icon: {
    marginRight: 15,
    width: 24,
    textAlign: 'center',
  },
  label: { // Reused for infoLabel
    fontSize: 16,
  },
  settingRight: { // Reused for infoRight
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Align content to the right
  },
   infoValue: { // Style for displaying email/URL etc. (if used)
       fontSize: 14,
       marginRight: 8,
   },
   // --- FAQ Specific Styles ---
  faqItem: {
      paddingVertical: 15,
      paddingHorizontal: 15,
      // backgroundColor set dynamically
      // Borders/Radius applied conditionally in map function
  },
  faqQuestion: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 6,
      lineHeight: 22,
  },
  faqAnswer: {
      fontSize: 15,
      lineHeight: 22, // Good line height
  },
});