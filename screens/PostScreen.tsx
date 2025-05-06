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
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator, // Added for loading state on button
} from "react-native";
import {
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  getDoc,
  GeoPoint,
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
import * as Location from 'expo-location'; // Import for location services
import { geohashForLocation } from "geofire-common"; // Import the geohash function

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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Theme variable fallbacks ---
  const cardBackgroundColor = currentTheme.cardBackground || (isDark ? "#1c1c1e" : "#ffffff");
  const inputBackgroundColor = currentTheme.inputBackground || (isDark ? "#2c2c2e" : "#f0f0f0");
  const cardBorderColor = currentTheme.cardBorder || (isDark ? "#3a3a3c" : "#e0e0e0");
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
      // setDate(editPost.date instanceof Timestamp ? editPost.date.toDate() : new Date(editPost.date) || new Date());
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

  useFocusEffect(
      useCallback(() => {
        StatusBar.setBarStyle(isDark ? "light-content" : "dark-content", true);
        if (Platform.OS === "android") {
          StatusBar.setBackgroundColor(cardBackgroundColor, true);
        }
      }, [isDark, cardBackgroundColor])
    );

  // Get user's location on component mount
  useEffect(() => {
    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location Permission Required', 'Please enable location services to use this feature.');
                return;
            }

            const locationData = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setUserLocation({
                latitude: locationData.coords.latitude,
                longitude: locationData.coords.longitude,
            });
        } catch (error) {
            console.error("Error getting location:", error);
            Alert.alert("Location Error", "Could not retrieve your location.");
        }
    };

    getLocation();
  }, []);

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

    // Ensure userLocation is available before proceeding
   if (!userLocation) {
    Alert.alert("Location Missing", "Could not retrieve location. Cannot save post with geospatial data.");
    setIsLoading(false); // Stop loading
    return; // Prevent saving without location
  }

    try {
      // Fetch the user's profile picture URL
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const creatorProfilePic = userDoc.data()?.profilePicture || currentUser.photoURL || null;

      // --- Create GeoPoint and Geohash ---
     const coords = { latitude: userLocation.latitude, longitude: userLocation.longitude };
     const hash = geohashForLocation([coords.latitude, coords.longitude]);
     const point = new GeoPoint(coords.latitude, coords.longitude);
     // --- ---
  
      const postData = {
        title: trimmedTitle,
        description: trimmedDescription,
        category: category,
        location: trimmedLocation,
        date: Timestamp.fromDate(date),
        fee: parseFloat(fee) || 0,
        createdBy: currentUser.uid,
        creatorUsername: currentUser.displayName || "Unknown User", // Add username for display
        creatorProfilePic: creatorProfilePic, // Include profile picture URL
        // --- Store GeoPoint and Geohash ---
       coordinates: point,   // Store location as GeoPoint
       geohash: hash,        // Store the calculated geohash
        // latitude: userLocation?.latitude || null,  // Store latitude
        // longitude: userLocation?.longitude || null, // Store longitude
      };
  
      if (editPost && editPost.id) {
        // Update existing post
        const postRef = doc(db, "posts", editPost.id);
        await setDoc(postRef, {
          ...postData,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        Alert.alert("Success", "Your post has been updated.");
      } else {
        // Create new post
        await addDoc(collection(db, "posts"), {
          ...postData,
          createdAt: serverTimestamp(), // Add created timestamp
        });
        Alert.alert("Success", "Your post has been created.");
      }
  
      navigation.goBack();
  
    } catch (error: any) {
      console.error("Error saving post:", error);
      Alert.alert("Error", `Failed to save post: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Date/Time Picker Logic (Android Specific) ---
  const showDateTimePicker = (mode: 'date' | 'time', dateFromDatepicker?: Date) => {
    // Use the date selected from the date picker if provided, otherwise use current state
    const currentDateValue = dateFromDatepicker || date;

    DateTimePickerAndroid.open({
      value: currentDateValue, // Use the potentially updated date
      onChange: (event, selectedValue) => {
        // Check if a value was actually selected ('set' event)
        if (event.type === 'set' && selectedValue) {
          const selectedDateOrTime = new Date(selectedValue);

          if (mode === 'date') {
            // User just picked a DATE.
            // The selectedValue contains the correct date, but potentially wrong time (often midnight UTC or current time)
            console.log("Date selected (raw):", selectedDateOrTime);
            // IMPORTANT: Don't set the state here yet.
            // Call the time picker, passing the DATE the user just selected.
            showDateTimePicker('time', selectedDateOrTime); // Pass the selected date object

          } else {
            // User just picked a TIME.
            // `currentDateValue` here holds the date the user picked in the previous step.
            // `selectedDateOrTime` holds the time the user picked (date part might be wrong).
            console.log("Time selected (raw):", selectedDateOrTime);

            // Combine the DATE from the first step and the TIME from the second step
            const finalDate = new Date(currentDateValue); // Start with the correct date
            finalDate.setHours(selectedDateOrTime.getHours()); // Apply selected hours
            finalDate.setMinutes(selectedDateOrTime.getMinutes()); // Apply selected minutes
            finalDate.setSeconds(0); // Optional: Reset seconds
            finalDate.setMilliseconds(0); // Optional: Reset milliseconds

            console.log("Final combined date:", finalDate);
            setDate(finalDate); // Update the state with the CORRECT combined date and time
          }
        } else {
           console.log(`Picker ${mode} dismissed or no value set.`);
           // Handle dismissal - maybe do nothing or show a message
        }
      },
      mode: mode,
      is24Hour: true, // Or false based on preference
      minimumDate: new Date(), // Ensure users can't select past dates/times
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.background }]}>
      <StatusBar
        translucent={false}
        backgroundColor={cardBackgroundColor}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
        <View style={[styles.headerContainer, { backgroundColor: cardBackgroundColor }]}>
         {/* Screen Title */}
         <Text style={[styles.screenTitle, { color: currentTheme.textPrimary }]}>
            {editPost ? "Edit Event Post" : "Create New Event Post"}
         </Text>
        </View>

        <ScrollView
           contentContainerStyle={styles.scrollContainer}
           keyboardShouldPersistTaps="handled"
           showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor: cardBorderColor, shadowColor: shadowColor }]}>
           {/* Title Input */}

           
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Event Title</Text>
           <View style={[styles.inputContainer, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}>
           <TextInput
             placeholder="Enter the title of your event"
             value={title}
             onChangeText={setTitle}
             style={[styles.input, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
             placeholderTextColor={placeholderTextColor}
             maxLength={100}
           />
           </View>

           {/* Description Input */}
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Description</Text>
           <View style={[styles.textAreaContainer, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}>
           <TextInput
             placeholder="Describe your event"
             value={description}
             onChangeText={setDescription}
             style={[styles.input, styles.textArea, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
             multiline
             placeholderTextColor={placeholderTextColor}
             maxLength={500}
           />
           </View>

           {/* Location Input */}
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Location</Text>
           <View style={[styles.inputContainer, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}>
           <TextInput
             placeholder="e.g., Millennium Park, Online"
             value={location}
             onChangeText={setLocation}
             style={[styles.input, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
             placeholderTextColor={placeholderTextColor}
             maxLength={150}
           />
           </View>

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
           <View style={[styles.inputContainer, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}>
           <TextInput
             placeholder="e.g., 10.50 (or leave blank for free)"
             value={fee}
             onChangeText={setFee}
             keyboardType="decimal-pad" // Use decimal pad for currency
             style={[styles.input, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
             placeholderTextColor={placeholderTextColor}
           />
           </View>

           {/* Date & Time Picker Trigger */}
           <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Date & Time</Text>
           <View style={[styles.dateTriggerContainer, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}>
           <TouchableOpacity
              onPress={() => showDateTimePicker('date')} // Start with date picker
              style={[styles.input, styles.dateTrigger, inputStyle(currentTheme, inputBackgroundColor, inputBorderColor)]}
           >
             <Text style={[styles.dateTriggerText, { color: currentTheme.textPrimary }]}>
               {date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
             </Text>
             <Feather name="calendar" size={20} color={currentTheme.textSecondary} />
           </TouchableOpacity>
           </View>

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
          </View>
        </ScrollView>
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
  headerContainer: {
    flexDirection: "row",
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
  scrollContainer: {
    paddingHorizontal: 5,
    paddingTop: 5, // Reduced top padding as title is outside scroll
    paddingBottom: 30,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 15, // Add vertical margin for spacing
    paddingHorizontal: 20, // Ensure padding if text wraps
    marginTop: '1.9%',
    marginBottom: 4,
  },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 5,
    borderWidth: 0,
    // Dynamic background, border, shadow colors
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 15, // Space above labels
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 25, // Consistent radius
    paddingHorizontal: 12,
    marginBottom: 5, // More space between inputs
    height: 50, // Consistent height
    // backgroundColor, borderColor set dynamically
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  textAreaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 25, // Consistent radius
    paddingHorizontal: 12,
    marginBottom: 5, // More space between inputs
    height: 100, // Consistent height
    // backgroundColor, borderColor set dynamically
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 15,
    paddingVertical: 12,
    // borderRadius: 10,
    borderRadius: 25,
    fontSize: 16,
    marginBottom: 5, // Reduced bottom margin, handled by label's marginTop
    // Dynamic styles applied via helper function
  },
  textArea: {
    height: 90, // Slightly shorter default height
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 0,
    borderRadius: 25,
    marginBottom: 5,
    overflow: 'hidden', // Ensure border radius clips the picker background on Android
    justifyContent: 'center', // Center picker vertically for better alignment
    height: 55, // Set fixed height consistent with inputs
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  picker: {
    width: "100%",
    height: '100%', // Ensure picker fills container
    // Minimal styling here, container handles appearance
     backgroundColor: 'transparent', // Make picker background transparent
  },
  dateTriggerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 25, // Consistent radius
    paddingHorizontal: 12,
    marginBottom: 10, // More space between inputs
    height: 55, // Consistent height
    // backgroundColor, borderColor set dynamically
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  dateTrigger: {
    // flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // height: 55, // Match input height
    // textAlignVertical: 'top',
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