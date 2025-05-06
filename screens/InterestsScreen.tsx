import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  StatusBar,
  SafeAreaView, // Use SafeAreaView
  ActivityIndicator, // Added for loading
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase"; // Adjust path if needed
import { useTheme } from "../ThemeContext"; // Adjust path if needed
import { lightTheme, darkTheme } from "../themeColors"; // Adjust path if needed
import { Feather } from "@expo/vector-icons"; // Added for icons

// Removed LinearGradient if it was implicitly assumed

const INTEREST_OPTIONS = [
    "Poetry", "Tennis", "Coding", "Volunteering", "Live Music", "Book Clubs",
    "Photography", "Dancing", "Spirituality", "Outdoor Events", "Art", "Sports",
    "Games", "Electronics", "Automotive", "Garden", "Academics", "Medical",
    "Beauty", "Pet", "Food", "Clothes",
];

export default function InterestsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Theme variable fallbacks ---
  const chipBackgroundColor = currentTheme.chipBackground || (isDark ? '#3a3a3c' : '#e5e5e5');
  const cardBackgroundColor = currentTheme.cardBackground || (isDark ? "#1c1c1e" : "#ffffff");
  const chipBorderColor = currentTheme.inputBorder || (isDark ? '#555' : '#ccc');
  const chipTextColor = currentTheme.textSecondary || (isDark ? '#ccc' : '#555');
  const selectedChipBgColor = currentTheme.primary || '#007AFF';
  const selectedChipTextColor = currentTheme.buttonText || '#ffffff';
  const shadowColor = currentTheme.shadowColor || '#000';

  const toggleInterest = (interest: string) => {
    setSelected((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  // Generic handler for finishing this step
  const handleCompletion = async (interestsToSave: string[]) => {
    if (isLoading) return; // Prevent double taps
    setIsLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
          Alert.alert("Error", "User not found. Please try logging in again.");
          setIsLoading(false); // Reset loading on error
          // Optionally navigate to login
          // navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
      }

      console.log(`Saving interests for ${userId}:`, interestsToSave);
      await setDoc(
        doc(db, "users", userId),
        { interests: interestsToSave }, // Save selected or empty array
        { merge: true } // Merge ensures other user data isn't overwritten
      );

      // Navigate to the main app stack, resetting history
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }], // Ensure 'Main' is your authenticated stack name
      });
      // No need to setLoading(false) on success due to navigation reset

    } catch (error: any) {
      console.error("Error saving/skipping interests:", error);
      Alert.alert("Error", `Could not save preferences: ${error.message}`);
      setIsLoading(false); // Reset loading on error
    }
  };

  const renderInterestChip = ({ item }: { item: string }) => {
    const isSelected = selected.includes(item);
    return (
      <TouchableOpacity
        style={[
          styles.chipContainer,
          {
            backgroundColor: isSelected ? selectedChipBgColor : chipBackgroundColor,
            borderColor: isSelected ? selectedChipBgColor : chipBorderColor,
          },
        ]}
        onPress={() => toggleInterest(item)}
        activeOpacity={0.7}
      >
         {isSelected && <Feather name="check" size={16} color={selectedChipTextColor} style={styles.chipIcon} />}
        <Text
          style={[
            styles.chipText,
            { color: isSelected ? selectedChipTextColor : chipTextColor },
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
     // Use SafeAreaView for top/bottom padding
    <SafeAreaView style={[styles.safeAreaContainer, { backgroundColor: currentTheme.background }]}>
      <StatusBar
            translucent={false}
            backgroundColor={cardBackgroundColor}
            barStyle={isDark ? "light-content" : "dark-content"}
          />
            <View style={[styles.headerContainer, { backgroundColor: cardBackgroundColor }]}>
              <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Select Your Interests</Text>
              <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>Choose a few things you like. This helps us find relevant events for you.</Text>
            </View>
            <FlatList
                data={INTEREST_OPTIONS}
                renderItem={renderInterestChip}
                keyExtractor={(item) => item}
                numColumns={2} // Keep 2 columns
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />

             {/* Continue Button */}
            <TouchableOpacity
                style={[
                styles.continueButton,
                { backgroundColor: currentTheme.primary },
                (selected.length === 0 || isLoading) && styles.disabledButton, // Disable visually
                ]}
                onPress={() => handleCompletion(selected)}
                disabled={selected.length === 0 || isLoading} // Disable functionally
                activeOpacity={0.8}
            >
                 {isLoading ? (
                     <ActivityIndicator size="small" color={currentTheme.buttonText || '#fff'} />
                 ) : (
                    <Text style={[styles.continueButtonText, { color: currentTheme.buttonText || '#fff' }]}>Continue</Text>
                 )}
            </TouchableOpacity>

             {/* Skip Link/Button */}
            <TouchableOpacity
                style={styles.skipButton}
                onPress={() => handleCompletion([])} // Save empty array on skip
                disabled={isLoading} // Disable if already saving/skipping
            >
                <Text style={[styles.skipText, { color: currentTheme.textSecondary }]}>Skip for now</Text>
            </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20, // Horizontal padding for content
    paddingTop: 40, // Space from top safe area
    paddingBottom: 15, // Space from bottom safe area
  },
  headerContainer: {
    // flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 15 : 10, // Adjust top padding
    paddingBottom: 10,
    // backgroundColor: currentTheme.background, // Optional: if header needs distinct bg
    borderBottomWidth: 1,
    borderBottomColor: 'transparent', // Use theme border
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
  title: {
    fontSize: 26, // Adjusted size
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10, // Less margin below title
    // color set dynamically
  },
  subtitle: {
     fontSize: 16,
     textAlign: 'center',
     marginBottom: 5, // Space below subtitle
     lineHeight: 22,
     // color set dynamically
  },
  listContainer: {
     paddingBottom: 10, // Space below the grid
  },
  chipContainer: {
    flex: 1, // Distribute space evenly in columns
    flexDirection: 'row', // For icon + text
    alignItems: 'center',
    justifyContent: 'center', // Center content within chip
    borderWidth: 0, // Slightly thicker border
    margin: 6, // Adjust spacing between chips
    paddingVertical: 10, // Adjust padding
    paddingHorizontal: 12,
    borderRadius: 20, // Rounded chips
    // Dynamic backgroundColor, borderColor
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  // selectedChipContainer: { // Combined into conditional style
  // },
  chipIcon: {
     marginRight: 6, // Space between check and text
  },
  chipText: {
    fontSize: 14, // Adjust font size
    fontWeight: '500',
    // Dynamic color
  },
  // selectedChipText: { // Combined into conditional style
  // },
  continueButton: {
    paddingVertical: 14,
    borderRadius: 25, // Consistent rounded button
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, // Space above button
    minHeight: 48, // Ensure consistent button height even with loader
    // Dynamic backgroundColor
    // Shadow (optional)
     shadowColor: "#000", // Use shadowColor variable
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.15,
     shadowRadius: 4,
     elevation: 3,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    // Dynamic color
  },
  disabledButton: {
    opacity: 0.6, // More pronounced disabled state
  },
  skipButton: {
      marginTop: 15, // Space above skip
      padding: 10, // Easier to tap
  },
  skipText: {
    textAlign: 'center',
    fontSize: 15,
    // Dynamic color
  },
});