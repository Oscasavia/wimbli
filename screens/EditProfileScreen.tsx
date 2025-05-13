// © 2025 Oscasavia Birungi. All rights reserved.
import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator, // Added for loading state
  Pressable, // Added for modal overlay
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"; // Added updateDoc
import { updateProfile, updateEmail } from "firebase/auth"; // Added updateEmail if needed
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Added for image upload
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { SafeAreaView } from "react-native-safe-area-context";
// Removed LinearGradient as we'll use theme background
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons"; // Added icons

const INTEREST_OPTIONS = [
  "Poetry",
  "Tennis",
  "Coding",
  "Volunteering",
  "Live Music",
  "Book Clubs",
  "Photography",
  "Dancing",
  "Spirituality",
  "Outdoor Events",
  "Art",
  "Sports",
  "Games",
  "Electronics",
  "Automotive",
  "Garden",
  "Academics",
  "Medical",
  "Beauty",
  "Pet",
  "Food",
  "Clothes",
];

export default function EditProfileScreen() {
  // Removed { navigation } prop if using hook
  const navigation = useNavigation<any>(); // Use hook for navigation
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(
    null
  ); // Local URI for picker result
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  ); // URL from Firestore/Storage
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  // Optional: Add email editing if desired
  // const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial fetch
  const [isSaving, setIsSaving] = useState(false); // Saving state indicator
  const [isModalVisible, setModalVisible] = useState(false); // Keep modal if desired
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Assume these are defined in your themeColors.js ---
  const cardBackgroundColor =
    currentTheme.cardBackground || (isDark ? "#1c1c1e" : "#ffffff");
  const inputBackgroundColor =
    currentTheme.inputBackground || (isDark ? "#2c2c2e" : "#f0f0f0");
  const chipBackgroundColor =
    currentTheme.chipBackground || (isDark ? "#3a3a3c" : "#e5e5e5");
  const selectedChipColor = currentTheme.primary;
  const selectedChipTextColor =
    currentTheme.buttonText || (isDark ? "#000" : "#fff");
  const shadowColor = currentTheme.shadowColor || "#000";

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  // Load user data on focus
  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        setIsLoading(true);
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.uid) {
          Alert.alert("Error", "Not logged in.");
          setIsLoading(false);
          navigation.goBack(); // Or navigate to login
          return;
        }

        try {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setBio(data.bio || "");
            setInterests(data.interests || []);
            setProfilePictureUrl(data.profilePicture || null); // Load existing URL
            setUsername(data.username || currentUser.displayName || "");
            // setEmail(data.email || currentUser.email || ""); // Load email if editing
          } else {
            // Fallback if Firestore doc doesn't exist but user is authenticated
            setUsername(currentUser.displayName || "");
            // setEmail(currentUser.email || "");
            setProfilePictureUrl(currentUser.photoURL || null); // Use auth photoURL as fallback
          }
        } catch (error) {
          console.error("Failed to load user data:", error);
          Alert.alert("Error", "Failed to load profile data.");
        } finally {
          setIsLoading(false);
        }
      };

      loadUser();
    }, []) // Empty dependency array means run once on mount/focus
  );

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const pickImage = async () => {
    // Request permissions first (important for standalone apps)
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "You need to allow access to your photos to change your profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Force square aspect ratio
      quality: 0.7, // Reduce quality slightly for faster uploads
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      setProfilePictureUri(localUri); // Set ONLY the local URI state
      // DO NOT: setProfilePictureUrl(localUri);
    }
  };

  // Function to upload image and get URL
  const uploadImage = async (uri: string): Promise<string | null> => {
    if (!uri.startsWith("file://")) return uri; // Already a URL or default

    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storage = getStorage();
      // Use UID for unique path, maybe add timestamp or random string if needed
      const storageRef = ref(
        storage,
        `profilePictures/${currentUser.uid}/profile.jpg`
      );
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image: ", error);
      Alert.alert("Upload Error", "Failed to upload profile picture.");
      return null;
    }
  };

  const saveChanges = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.uid) {
      Alert.alert("Error", "Not logged in.");
      return;
    }

    setIsSaving(true);
    let urlToSave = profilePictureUrl;
    let newUrlUploaded = false; // Flag to track if a new URL was successfully obtained
    // let finalProfilePictureUrl = profilePictureUrl; // Start with current URL

    // If a new image was picked (local URI exists)
    // Check if a new local image was picked
    if (profilePictureUri) {
      console.log(
        "New profile picture URI selected, attempting upload:",
        profilePictureUri
      );
      const uploadedUrl = await uploadImage(profilePictureUri); // AWAIT the upload

      if (uploadedUrl) {
        // Upload successful: Use the new permanent URL from Firebase Storage
        urlToSave = uploadedUrl;
        newUrlUploaded = true; // Mark that we have a new URL
        console.log("Image uploaded successfully. New URL:", urlToSave);
      } else {
        // Upload failed: Keep the original URL. Alert the user.
        // 'urlToSave' remains the value of 'profilePictureUrl' (the initially loaded one)
        Alert.alert(
          "Upload Error",
          "Failed to upload new profile picture. Previous picture (if any) will be kept."
        );
        console.log("Image upload failed. Keeping original URL:", urlToSave);
        // No change needed to urlToSave here, it already holds the original profilePictureUrl
      }
    }
    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          username,
          bio,
          interests,
          profilePicture: urlToSave,
        },
        { merge: true }
      );

      await updateProfile(currentUser, {
        displayName: username,
        photoURL: urlToSave || undefined,
      });

      Alert.alert("Success", "Profile updated successfully.");
      navigation.goBack();
    } catch (error) {
      console.error("Error saving profile data:", error);
      Alert.alert("Error", "Failed to save profile changes.");
    } finally {
      setIsSaving(false); // 🔁 Always reset saving state
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: currentTheme.background },
        ]}
      >
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  const displayPicture = profilePictureUri || profilePictureUrl; // Show local change immediately

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.background }}>
      <StatusBar
        translucent={false}
        backgroundColor={cardBackgroundColor}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <View
        style={[styles.screen, { backgroundColor: currentTheme.background }]}
      >
        {/* Screen Title */}
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
          <Text
            style={[styles.screenTitle, { color: currentTheme.textPrimary }]}
          >
            Edit Profile
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled" // Dismiss keyboard when tapping outside inputs
        showsVerticalScrollIndicator={false}
      >
        {/* --- Avatar Section --- */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.avatarTouchable, { shadowColor }]}
          >
            <Image
              source={
                displayPicture
                  ? { uri: displayPicture }
                  : require("../assets/default-profile.png")
              }
              style={[styles.avatar, { borderColor: currentTheme.background }]} // Border matches background
            />
            {/* Edit Icon Overlay */}
            <View
              style={[
                styles.editIconOverlay,
                { backgroundColor: currentTheme.primary + "e0" },
              ]}
            >
              <Feather
                name="camera"
                size={20}
                color={currentTheme.buttonText || "#fff"}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* --- Form Fields --- */}
        <View style={styles.formSection}>
          {/* Username */}
          <Text style={[styles.label, { color: currentTheme.textPrimary }]}>
            Username
          </Text>
          <TextInput
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            style={[
              styles.input,
              {
                backgroundColor: inputBackgroundColor,
                color: currentTheme.textPrimary,
                borderColor: currentTheme.inputBorder || "transparent", // Use theme border or transparent
              },
            ]}
            placeholderTextColor={currentTheme.textSecondary}
            maxLength={30} // Example limit
          />

          {/* Bio */}
          <Text style={[styles.label, { color: currentTheme.textPrimary }]}>
            Bio
          </Text>
          <TextInput
            placeholder="Write something about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            style={[
              styles.input,
              styles.textArea, // Specific style for height
              {
                backgroundColor: inputBackgroundColor,
                color: currentTheme.textPrimary,
                borderColor: currentTheme.inputBorder || "transparent",
              },
            ]}
            placeholderTextColor={currentTheme.textSecondary}
            maxLength={150} // Example limit
          />

          {/* Interests */}
          <Text style={[styles.label, { color: currentTheme.textPrimary }]}>
            Interests
          </Text>
          <View
            style={[
              styles.chipContainerWrapper,
              {
                backgroundColor: inputBackgroundColor,
                borderColor: currentTheme.inputBorder || "transparent",
              },
            ]}
          >
            <View style={styles.chipContainer}>
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = interests.includes(interest);
                return (
                  <TouchableOpacity
                    key={interest}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? selectedChipColor
                          : chipBackgroundColor,
                        borderColor: isSelected
                          ? selectedChipColor
                          : currentTheme.inputBorder || "#ccc",
                      },
                    ]}
                    onPress={() => toggleInterest(interest)}
                  >
                    {isSelected && (
                      <Feather
                        name="check"
                        size={14}
                        color={selectedChipTextColor}
                        style={styles.chipIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected
                            ? selectedChipTextColor
                            : currentTheme.textSecondary,
                        }, // Adjust text color based on selection
                      ]}
                    >
                      {interest}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* --- Save Button --- */}
        <TouchableOpacity
          onPress={saveChanges}
          disabled={isSaving} // Disable button while saving
          style={[
            styles.saveButton,
            { backgroundColor: currentTheme.primary, shadowColor: shadowColor },
            isSaving && styles.saveButtonDisabled, // Optional style for disabled state
          ]}
        >
          {isSaving ? (
            <ActivityIndicator
              size="small"
              color={currentTheme.buttonText || "#fff"}
            />
          ) : (
            <Text
              style={[
                styles.saveButtonText,
                { color: currentTheme.buttonText || "#fff" },
              ]}
            >
              Save Changes
            </Text>
          )}
        </TouchableOpacity>

        {/* Spacer at the bottom */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Optional: Re-add Modal for viewing image if needed, styled similarly to profile screen */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={toggleModal}
      >
        <Pressable style={styles.modalOverlay} onPress={toggleModal}>
          <Pressable onPress={() => {}}>
            <Image
              source={
                displayPicture
                  ? { uri: displayPicture }
                  : require("../assets/default-profile.png")
              }
              style={styles.fullImage}
              resizeMode="contain"
            />
          </Pressable>
          <TouchableOpacity style={styles.closeButton} onPress={toggleModal}>
            <MaterialCommunityIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    // flex: 1,
  },
  backButton: {
    paddingRight: 10,
    paddingVertical: 5,
    paddingLeft: 5,
    marginRight: 10,
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
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    marginRight: 45, // balances the left icon space
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30, // Ensure space below button
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarTouchable: {
    position: "relative", // Needed for absolute positioning of icon overlay
    borderRadius: 75, // Half of avatar size
    // Shadow for the avatar container
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4, // Make border slightly thicker
  },
  editIconOverlay: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    // Background color set dynamically
  },
  changePhoto: {
    // Kept for reference, but replaced by icon overlay
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  formSection: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 15, // Space above labels
  },
  input: {
    borderWidth: 0,
    paddingHorizontal: 15,
    paddingVertical: 12,
    // borderRadius: 10,
    borderRadius: 25,
    fontSize: 16,
  },
  textArea: {
    height: 90, // Taller text area
    textAlignVertical: "top", // Align text to top for multiline
  },
  chipContainerWrapper: {
    borderRadius: 25,
    borderWidth: 0, // Border for the container
    padding: 10,
    marginTop: 8,
    // Background and border colors set dynamically
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row", // For icon + text
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 5, // Spacing between chips
    borderWidth: 0,
    // Background and border colors set dynamically
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    // Color set dynamically
  },
  saveButton: {
    paddingVertical: 15,
    borderRadius: 25, // Match edit profile button style
    alignItems: "center",
    marginTop: 30,
    // Shadow for button
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.7, // Indicate disabled state
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    // Color set dynamically
  },
  // --- Modal Styles (copied from Profile Screen for consistency) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "95%",
    height: "85%",
    borderRadius: 5,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 10,
    borderRadius: 20,
  },
});
