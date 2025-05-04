import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator, // Added for loading state on button
} from "react-native";
import {
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
  Timestamp, // Import Timestamp for type checking if needed
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { Picker } from "@react-native-picker/picker";
// Removed LinearGradient import
import { Feather } from "@expo/vector-icons"; // Use Feather for icons

// Assuming INTEREST_OPTIONS remains the same
const INTEREST_OPTIONS = [
  "Poetry", "Tennis", "Coding", "Volunteering", "Live Music", "Book Clubs",
  "Photography", "Dancing", "Spirituality", "Outdoor Events", "Art", "Sports",
  "Games", "Electronics", "Automotive", "Garden", "Academics", "Medical",
  "Beauty", "Pet", "Food", "Clothes",
];

export default function PostScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const editPost = route.params?.editPost || null; // Post object being edited

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date());
  const [fee, setFee] = useState(""); // Keep as string for input, parse on save
  const [isLoading, setIsLoading] = useState(false); // Saving state

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Theme variable fallbacks ---
  const inputBackgroundColor = currentTheme.inputBackground || (isDark ? "#2c2c2e" : "#f0f0f0");
  const inputBorderColor = currentTheme.inputBorder || (isDark ? "#444" : "#ddd");
  const placeholderTextColor = currentTheme.textSecondary || "#8e8e93";
  const shadowColor = currentTheme.shadowColor || "#000";

  // Populate fields if editing
  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title || "");
      setDescription(editPost.description || "");
      setCategory(editPost.category || "");
      setLocation(editPost.location || "");
      setFee(editPost.fee?.toString() || ""); // Ensure fee is string for input
      // Handle date conversion safely (Firestore timestamp or ISO string)
      try {
           // Check if it's a Firestore Timestamp object
          if (editPost.date && typeof editPost.date.toDate === 'function') {
              setDate(editPost.date.toDate());
          }
          // Check if it's an ISO string
          else if (editPost.date && typeof editPost.date === 'string') {
              const parsedDate = new Date(editPost.date);
              if (!isNaN(parsedDate.getTime())) { // Check if parsing was successful
                 setDate(parsedDate);
              } else {
                 console.warn("Invalid date string received for edit:", editPost.date);
                 setDate(new Date()); // Fallback to current date
              }
          } else {
              setDate(new Date()); // Fallback if date is missing or invalid type
          }
      } catch (error) {
         console.error("Error parsing editPost date:", error);
         setDate(new Date()); // Fallback on error
      }

    } else {
       // Reset fields when navigating to create (also handled by useFocusEffect)
       resetFormFields();
    }
  }, [editPost]); // Rerun effect if editPost changes

  // Reset fields when screen focuses and we are *not* editing
  useFocusEffect(
    useCallback(() => {
      if (!editPost) {
        resetFormFields();
      }
      // Optional: Add cleanup function if needed
      // return () => console.log("Post screen unfocused");
    }, [editPost]) // Dependency ensures this logic reruns if editPost status changes
  );

  const resetFormFields = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setLocation("");
    setDate(new Date()); // Reset to current date/time
    setFee("");
    setIsLoading(false); // Ensure loading is reset
  };

  const handlePost = async () => {
    // Trim inputs and check
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();

    if (!trimmedTitle || !trimmedDescription || !category || !trimmedLocation || !date) {
      Alert.alert("Missing Information", "Please fill out title, description, category, location, and date.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
        Alert.alert("Error", "You must be logged in to post.");
        return;
    }

    setIsLoading(true);
    try {
      const postData = {
        title: trimmedTitle,
        description: trimmedDescription,
        category: category,
        location: trimmedLocation,
        date: Timestamp.fromDate(date), // Store as Firestore Timestamp
        fee: parseFloat(fee) || 0, // Default to 0 if fee is empty or invalid
        createdBy: currentUser.uid,
        creatorUsername: currentUser.displayName || "Unknown User", // Add username for display
        // Optional: add creator profile picture URL
        // creatorProfilePic: currentUser.photoURL || null,
      };

      if (editPost && editPost.id) {
        // Update existing post
        const postRef = doc(db, "posts", editPost.id);
        await setDoc(postRef, {
            ...postData,
            updatedAt: serverTimestamp(), // Add updated timestamp
        }, { merge: true }); // Use merge: true to only update provided fields + updatedAt
        Alert.alert("Success", "Your post has been updated.");
      } else {
        // Create new post
        await addDoc(collection(db, "posts"), {
          ...postData,
          createdAt: serverTimestamp(), // Add created timestamp
        });
        Alert.alert("Success", "Your post has been created.");
      }

      navigation.goBack(); // Go back after successful post/update

    } catch (error: any) {
      console.error("Error saving post:", error);
      Alert.alert("Error", `Failed to save post: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Date/Time Picker Logic (Android Specific) ---
  const showDateTimePicker = (mode: 'date' | 'time') => {
    DateTimePickerAndroid.open({
      value: date,
      onChange: (event, selectedValue) => {
        if (event.type === 'set' && selectedValue) {
          const newDate = new Date(selectedValue);
          if (mode === 'date') {
             // If only date is picked, show time picker next
             setDate(newDate); // Update date part first
             showDateTimePicker('time'); // Then show time picker
          } else {
             // If time is picked, finalize the date
             setDate(newDate);
          }
        }
        // Handle 'dismissed' event if necessary
      },
      mode: mode,
      is24Hour: true, // Use 24-hour format
      minimumDate: new Date(), // Prevent selecting past dates/times
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined} // Use "height" if padding doesn't work well
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Adjust offset as needed
      >
         {/* Screen Title */}
         <Text style={[styles.screenTitle, { color: currentTheme.textPrimary }]}>
            {editPost ? "Edit Event Post" : "Create New Event Post"}
         </Text>

        <ScrollView
           contentContainerStyle={styles.scrollContainer}
           keyboardShouldPersistTaps="handled"
           showsVerticalScrollIndicator={false}
        >
           {/* Title Input */}
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Event Title</Text>
           <TextInput
             placeholder="Enter the title of your event"
             value={title}
             onChangeText={setTitle}
             style={[styles.input, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
             placeholderTextColor={placeholderTextColor}
             maxLength={100}
           />

           {/* Description Input */}
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Description</Text>
           <TextInput
             placeholder="Describe your event"
             value={description}
             onChangeText={setDescription}
             style={[styles.input, styles.textArea, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
             multiline
             placeholderTextColor={placeholderTextColor}
             maxLength={500}
           />

           {/* Location Input */}
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Location</Text>
           <TextInput
             placeholder="e.g., Millennium Park, Chicago or Online"
             value={location}
             onChangeText={setLocation}
             style={[styles.input, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
             placeholderTextColor={placeholderTextColor}
             maxLength={150}
           />

           {/* Category Picker */}
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Category</Text>
           <View style={[styles.pickerContainer, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}>
             <Picker
               selectedValue={category}
               onValueChange={(itemValue) => setCategory(itemValue || "")}
               style={[styles.picker, { color: currentTheme.textPrimary }]}
               dropdownIconColor={currentTheme.textPrimary} // Style dropdown icon color
               prompt="Select a category" // Android only: Title for the picker dialog
               // itemStyle={{ color: currentTheme.textPrimary }} // iOS only: style for picker items (use carefully)
             >
               <Picker.Item label="-- Select a Category --" value="" style={{ color: placeholderTextColor }} />
               {INTEREST_OPTIONS.map((option) => (
                 <Picker.Item key={option} label={option} value={option} />
               ))}
             </Picker>
           </View>

           {/* Fee Input */}
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Fee ($)</Text>
           <TextInput
             placeholder="Enter amount (e.g., 10.50) or leave blank for free"
             value={fee}
             onChangeText={setFee}
             keyboardType="decimal-pad" // Use decimal pad for currency
             style={[styles.input, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
             placeholderTextColor={placeholderTextColor}
           />

           {/* Date & Time Picker Trigger */}
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Date & Time</Text>
           <TouchableOpacity
              onPress={() => showDateTimePicker('date')} // Start with date picker
              style={[styles.input, styles.dateTrigger, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
           >
             <Text style={[styles.dateTriggerText, { color: currentTheme.textPrimary }]}>
               {date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
             </Text>
             <Feather name="calendar" size={20} color={currentTheme.textSecondary} />
           </TouchableOpacity>

           {/* Submit Button */}
           <TouchableOpacity
             onPress={handlePost}
             disabled={isLoading}
             style={[
               styles.submitButton,
               { backgroundColor: currentTheme.primary, shadowColor: shadowColor },
               isLoading && styles.submitButtonDisabled
             ]}
           >
             {isLoading ? (
               <ActivityIndicator size="small" color={currentTheme.buttonText || '#fff'} />
             ) : (
               <Text style={[styles.submitButtonText, { color: currentTheme.buttonText || '#fff' }]}>
                 {editPost ? "Update Post" : "Create Post"}
               </Text>
             )}
           </TouchableOpacity>

           {/* Spacer at bottom */}
           <View style={{ height: 50 }} />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Helper function for input styles to keep JSX cleaner
const inputStyle = (theme: any, background: string, border: string) => ({
    backgroundColor: background,
    color: theme.textPrimary,
    borderColor: border,
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10, // Reduced top padding as title is outside scroll
    paddingBottom: 30,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 15, // Add vertical margin for spacing
    paddingHorizontal: 20, // Ensure padding if text wraps
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 15, // Space above labels
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 5, // Reduced bottom margin, handled by label's marginTop
    // Dynamic styles applied via helper function
  },
  textArea: {
    height: 100, // Slightly shorter default height
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 5,
    overflow: 'hidden', // Ensure border radius clips the picker background on Android
    justifyContent: 'center', // Center picker vertically for better alignment
    height: 55, // Set fixed height consistent with inputs
  },
  picker: {
    width: "100%",
    height: '100%', // Ensure picker fills container
    // Minimal styling here, container handles appearance
     backgroundColor: 'transparent', // Make picker background transparent
  },
  dateTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 55, // Match input height
  },
  dateTriggerText: {
    fontSize: 16,
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 25, // Consistent rounded button
    alignItems: "center",
    marginTop: 30, // More space before button
    // Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});