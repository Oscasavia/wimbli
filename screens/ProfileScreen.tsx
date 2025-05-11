import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList, // Keep import if used elsewhere, though not directly in this example output
  Modal,
  Alert,
  StatusBar,
  Pressable,
  Platform,
} from "react-native";
import { auth, db } from "../firebase";
import {
  doc,
  getDocs,
  collection,
  query,
  where,
  getCountFromServer,
  onSnapshot,
  arrayRemove,
  updateDoc,
  deleteDoc,
} from "firebase/firestore"; // Removed deleteDoc unless needed elsewhere
import { signOut } from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors"; // Assuming themeColors defines cardBackground, chipBackground, chipText etc.
import {
  Feather,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons"; // Added MaterialCommunityIcons for potential stats
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [postCount, setPostCount] = useState(0);
  const [savedEventsCount, setSavedEventsCount] = useState(0);
  const currentUser = auth.currentUser; // Current logged-in user
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSettingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Assume these are defined in your themeColors.js ---
  // Add these fallbacks if they might be missing from your theme object
  const cardBackgroundColor =
    currentTheme.cardBackground || (isDark ? "#2a2a2a" : "#ffffff");
  const chipBackgroundColor =
    currentTheme.chipBackground || (isDark ? "#3a3a3a" : "#f0f0f0");
  const chipTextColor = currentTheme.chipText || currentTheme.textSecondary;
  const shadowColor = currentTheme.shadowColor || "#000"; // Define shadow color in theme if needed

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const toggleSettingsMenu = () =>
    setSettingsMenuVisible(!isSettingsMenuVisible);

  const navigateToSettings = () => {
    setSettingsMenuVisible(false); // Close menu first
    navigation.navigate("Settings"); // Navigate to Settings screen
  };

  useFocusEffect(
    useCallback(() => {
      let unsubscribeUser: () => void;
      let unsubscribePosts: () => void;

      const fetchUserAndCounts = async () => {
        setLoading(true);
        setPostCount(0); // Reset counts on focus/uid change
        setSavedEventsCount(0);
        setUserData(null); // Reset user data

        try {
          const uidToFetch = userId || auth.currentUser?.uid; // Use a different variable name
          if (!uidToFetch) {
            console.log("ProfileScreen: No UID available for fetching data.");
            // Potentially navigate to login or show a 'logged out' state if it's the user's own profile
            setLoading(false);
            return;
          }

          // Real-time listener for user data
          const userDocRef = doc(db, "users", uidToFetch);
          unsubscribeUser = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                const savedIds = data.savedPosts || [];
                setSavedEventsCount(savedIds.length);
              } else {
                console.log(
                  `ProfileScreen: User document for UID ${uidToFetch} does not exist.`
                );
                setUserData(null); // Clear data if doc doesn't exist
                setSavedEventsCount(0);
              }
            },
            (error) => {
              // It's good practice to add an error handler to listeners
              console.error(
                "ProfileScreen: Error in user data snapshot listener:",
                error
              );
              // If permission denied, this might be where the error is caught if logout happens while focused
              setUserData(null);
              setSavedEventsCount(0);
            }
          );

          // Real-time listener for user-created posts
          const postsCollectionRef = collection(db, "posts"); // Renamed for clarity
          const postsQueryInstance = query(
            postsCollectionRef,
            where("createdBy", "==", uidToFetch)
          );
          unsubscribePosts = onSnapshot(
            postsQueryInstance,
            (snapshot) => {
              setPostCount(snapshot.size);
            },
            (error) => {
              // Error handler
              console.error(
                "ProfileScreen: Error in posts count snapshot listener:",
                error
              );
              setPostCount(0);
            }
          );
        } catch (error) {
          console.error(
            "ProfileScreen: Error in fetchUserAndCounts setup:",
            error
          );
        } finally {
          setLoading(false);
        }
      };

      fetchUserAndCounts();

      // Clean-up function (optional)
      return () => {
        console.log(
          "ProfileScreen: Unfocusing or unmounting. Unsubscribing listeners."
        );
        if (unsubscribeUser) {
          unsubscribeUser();
          console.log("ProfileScreen: Unsubscribed from user data.");
        }
        if (unsubscribePosts) {
          unsubscribePosts();
          console.log("ProfileScreen: Unsubscribed from posts count.");
        }
      };
    }, [userId, auth.currentUser])
  );

  if (loading) {
    return (
      <View
        style={[styles.center, { backgroundColor: currentTheme.background }]}
      >
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  // --- Data Fallbacks ---
  const profilePictureUri = userData?.profilePicture || null; // Use null if undefined
  const userBio = userData?.bio || "No bio provided yet.";
  const userInterests = userData?.interests || [];
  // Placeholder Stats (replace with actual data if available)
  const stats = {
    // posts: userData?.postCount || 0,
    posts: postCount,
    saved: savedEventsCount,
    followers: userData?.followerCount || 0,
    following: userData?.followingCount || 0,
  };

  const isOwnProfile = !userId || (currentUser && userId === currentUser.uid);

  const displayName =
    userData?.username || // 1. Try to get displayName from the fetched userData (could be own or other user)
    (isOwnProfile ? currentUser?.displayName : undefined) || // 2. If it's own profile and userData.displayName was missing, try auth.currentUser.displayName
    "User"; // 3. Fallback to "User" if neither of the above provided a value

  const userEmail =
    userData?.email || // 1. Try to get email from the fetched userData
    (isOwnProfile ? currentUser?.email : undefined) || // 2. If it's own profile and userData.email was missing, try auth.currentUser.email
    (isOwnProfile ? "No email provided" : "Email not available"); // 3. Fallback to a context-specific message

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      console.log("ProfileScreen: Signing out..."); // Changed from SettingsScreen for clarity
      // The listeners will be cleaned up by useFocusEffect when the component unmounts
      // due to navigation.reset()
      await signOut(auth);
      console.log(
        "ProfileScreen: Sign out successful. Resetting navigation to Login."
      );

      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
      // No need to setIsLoggingOut(false) if navigating away and unmounting.
    } catch (error: any) {
      console.error("ProfileScreen: Logout Error:", error);
      Alert.alert("Logout Error", error.message);
      setIsLoggingOut(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // Delete the post from Firestore
      await deleteDoc(doc(db, "posts", postId));

      // Remove the post ID from every user's savedPosts
      await removeDeletedPostFromSaved(postId);

      Alert.alert("Deleted!", "Your post was removed.");
    } catch (error) {
      console.error("Failed to delete post:", error);
      Alert.alert("Error", "Could not delete post.");
    }
  };

  const removeDeletedPostFromSaved = async (deletedPostId: string) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("savedPosts", "array-contains", deletedPostId)
      );
      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        await updateDoc(docSnap.ref, {
          savedPosts: arrayRemove(deletedPostId),
        });
        console.log(`✅ Removed post ${deletedPostId} from user ${docSnap.id}`);
      }
    } catch (error) {
      console.error("❌ Error removing deleted post from savedPosts:", error);
    }
  };

  return (
    // Use theme background instead of fixed gradient, or adjust gradient to use theme colors
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currentTheme.background }]}
    >
      <StatusBar
        backgroundColor={currentTheme.background}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        style={[{ backgroundColor: currentTheme.background }]}
      >
        {/* --- Settings Icon Button (Top Right) --- */}
        {isOwnProfile && (
          <TouchableOpacity
            style={styles.settingsIconContainer}
            onPress={toggleSettingsMenu}
          >
            <Feather
              name="more-vertical"
              size={25} // Slightly larger icon
              color={currentTheme.textPrimary}
            />
          </TouchableOpacity>
        )}

        {/* --- Profile Header --- */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            onPress={toggleModal}
            style={styles.avatarContainer}
          >
            <Image
              source={
                profilePictureUri
                  ? { uri: profilePictureUri }
                  : require("../assets/default-profile.png")
              }
              style={styles.avatar}
            />
          </TouchableOpacity>

          <Text style={[styles.username, { color: currentTheme.textPrimary }]}>
            {displayName}
          </Text>
          <Text style={[styles.email, { color: currentTheme.textSecondary }]}>
            {userEmail}
          </Text>

          {/* --- Edit Profile Button --- */}
          {(!userId || userId === auth.currentUser?.uid) && ( // Only show Edit button on own profile
            <TouchableOpacity
              onPress={() => navigation.navigate("EditProfile")}
              style={[
                styles.editProfileButton,
                { backgroundColor: currentTheme.primary },
              ]}
            >
              <Feather
                name="edit-2"
                size={16}
                color={currentTheme.buttonText || "#ffffff"}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.editProfileButtonText,
                  { color: currentTheme.buttonText || "#ffffff" },
                ]}
              >
                Edit Profile
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* --- Stats Section (Placeholder) --- */}
        {/* You'll need to fetch actual counts for these */}
        <View
          style={[
            styles.statsContainer,
            styles.card,
            { backgroundColor: cardBackgroundColor, shadowColor: shadowColor },
          ]}
        >
          <View style={styles.statItem}>
            <Text
              style={[styles.statNumber, { color: currentTheme.textPrimary }]}
            >
              {postCount}
            </Text>
            <Text
              style={[styles.statLabel, { color: currentTheme.textSecondary }]}
            >
              Posts
            </Text>
          </View>
          <View style={styles.statSeparator}></View>
          <View style={styles.statItem}>
            <Text
              style={[styles.statNumber, { color: currentTheme.textPrimary }]}
            >
              {savedEventsCount}
            </Text>
            <Text
              style={[styles.statLabel, { color: currentTheme.textSecondary }]}
            >
              Events Saved
            </Text>
          </View>
        </View>

        {/* --- Bio Section --- */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, shadowColor: shadowColor },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={currentTheme.textPrimary}
            />{" "}
            Bio
          </Text>
          <Text style={[styles.bioText, { color: currentTheme.textSecondary }]}>
            {userBio}
          </Text>
        </View>

        {/* --- Interests Section --- */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, shadowColor: shadowColor },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}
          >
            <MaterialCommunityIcons
              name="heart-multiple-outline"
              size={20}
              color={currentTheme.textPrimary}
            />{" "}
            Interests
          </Text>
          {userInterests.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {userInterests.map((interest: string) => (
                <View
                  key={interest}
                  style={[
                    styles.interestChip,
                    {
                      backgroundColor: chipBackgroundColor,
                      borderColor: currentTheme.primary + "50", // Use primary color with opacity for border
                    },
                  ]}
                >
                  <Text
                    style={[styles.interestChipText, { color: chipTextColor }]}
                  >
                    {interest}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text
              style={[
                styles.placeholderText,
                { color: currentTheme.textSecondary },
              ]}
            >
              No interests added yet.
            </Text>
          )}
        </View>

        {/* --- Saved Posts Section --- */}
        {isOwnProfile && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: cardBackgroundColor,
                shadowColor: shadowColor,
              },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}
            >
              <MaterialCommunityIcons
                name="bookmark-multiple-outline"
                size={20}
                color={currentTheme.textPrimary}
              />{" "}
              Saved Events
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("SavedEvents")}
            >
              <Text style={[styles.linkText, { color: currentTheme.primary }]}>
                View your saved events
              </Text>
            </TouchableOpacity>
            {/* Optional: Add a small preview of saved events here if feasible */}
          </View>
        )}

        {/* Add some bottom padding to the scroll view */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* --- Full Image Modal --- */}
      <Modal
        animationType="fade" // Fade looks smoother
        transparent={true}
        visible={isModalVisible}
        onRequestClose={toggleModal}
      >
        <Pressable style={styles.modalOverlay} onPress={toggleModal}>
          <Image
            source={
              profilePictureUri
                ? { uri: profilePictureUri }
                : require("../assets/default-profile.png")
            }
            style={styles.fullImage}
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.closeButton} onPress={toggleModal}>
            <MaterialIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* --- Settings Menu Modal --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isSettingsMenuVisible}
        onRequestClose={toggleSettingsMenu}
      >
        <Pressable // Use Pressable for overlay to dismiss
          style={styles.settingsMenuOverlay}
          onPress={toggleSettingsMenu}
        >
          <Pressable
            onPress={() => {}} // Prevent closing when tapping inside menu
            style={[
              styles.settingsMenuContainer,
              {
                backgroundColor: cardBackgroundColor,
                borderColor: currentTheme.inputBorder || "#ddd",
                shadowColor: shadowColor,
              },
            ]}
          >
            {/* Settings Item */}
            <TouchableOpacity
              style={styles.settingsMenuItem}
              onPress={navigateToSettings}
            >
              <Feather
                name="settings"
                size={18}
                color={currentTheme.textSecondary}
                style={styles.settingsMenuIcon}
              />
              <Text
                style={[
                  styles.settingsMenuItemText,
                  { color: currentTheme.textPrimary },
                ]}
              >
                Settings
              </Text>
            </TouchableOpacity>

            {/* Add other menu items here if needed */}
            {/* Example: Logout (ensure handleLogout is defined) */}
            <View
              style={[
                styles.menuSeparator,
                { backgroundColor: currentTheme.inputBorder },
              ]}
            />
            <TouchableOpacity
              style={styles.settingsMenuItem}
              onPress={() => {
                toggleSettingsMenu();
                handleLogout();
              }}
            >
              <Feather
                name="log-out"
                size={18}
                color={currentTheme.error || "red"}
                style={styles.settingsMenuIcon}
              />
              <Text
                style={[
                  styles.settingsMenuItemText,
                  { color: currentTheme.error || "red" },
                ]}
              >
                Logout
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContentContainer: {
    alignItems: "center",
    paddingHorizontal: 16, // Consistent horizontal padding
    paddingTop: 10, // Adjust as needed
  },
  center: {
    // Loading indicator style
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsIconContainer: {
    position: "absolute", // Position top right
    top: 10,
    right: 16, // Match horizontal padding
    padding: 8,
    zIndex: 10, // Ensure it's above other elements if needed
  },
  profileHeader: {
    alignItems: "center",
    marginTop: 10, // Space below settings icon
    marginBottom: 20,
    width: "100%",
  },
  avatarContainer: {
    marginBottom: 5,
    // Add shadow to avatar container for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 75, // Needs to match half of avatar size
  },
  avatar: {
    width: 120, // Larger avatar
    height: 120,
    borderRadius: 60, // Half of width/height
    borderWidth: 3,
    borderColor: "#fff", // White border looks clean
  },
  username: {
    fontSize: 24, // Larger username
    fontWeight: "bold",
    marginTop: 10,
    // textAlign: "center",
  },
  email: {
    fontSize: 16,
    marginTop: 5,
    marginBottom: 10,
    textAlign: "center",
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25, // Rounded button
    marginTop: 10,
    // Shadow for button
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  editProfileButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 15, // Add vertical padding inside the card
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  statSeparator: {
    width: 1,
    height: "60%", // Adjust height as needed
    backgroundColor: "#e0e0e0", // Light separator color
    alignSelf: "center",
  },
  // Reusable Card Style
  card: {
    width: "100%",
    borderRadius: 25,
    padding: 18,
    marginBottom: 16, // Space between cards
    // Consistent shadow using theme color or fallback
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12, // Increased space below title
    flexDirection: "row", // Align icon and text
    alignItems: "center",
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22, // Improve readability
  },
  horizontalScroll: {
    // No specific styles needed here unless you want padding inside scroll
    paddingBottom: 5, // Ensure chips don't get cut off
  },
  interestChip: {
    paddingVertical: 8, // Slightly larger chips
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1, // Subtle border
    // Background and border colors set dynamically
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 15,
    // fontStyle: 'italic',
    // textAlign: 'center',
    marginTop: 10,
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8, // Space above the link
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)", // Darker overlay for image modal
    justifyContent: "center",
    alignItems: "center",
  },
  //   modalContent: { // Not strictly needed if image takes full space
  //     width: "90%",
  //     height: "80%", // Adjust size as needed
  //     borderRadius: 15,
  //     overflow: "hidden",
  //     alignItems: 'center',
  //     justifyContent: 'center'
  //   },
  fullImage: {
    width: "95%", // Leave some margin
    height: "85%", // Adjust as needed
    borderRadius: 5, // Optional: slight rounding
  },
  closeButton: {
    position: "absolute",
    top: 50, // Adjust positioning as needed
    right: 20,
    padding: 10,
    // backgroundColor: 'rgba(0,0,0,0.5)', // Optional background for visibility
    borderRadius: 20,
  },

  // --- Settings Menu Modal Styles ---
  settingsMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.15)", // Semi-transparent overlay
    // Align menu to top-right (adjust based on icon position)
    // justifyContent: "flex-start",
    // alignItems: "flex-end",
    // We use absolute positioning for the container instead
  },
  settingsMenuContainer: {
    position: "absolute",
    top: 50, // Adjust based on SafeAreaView and icon position
    right: 20,
    width: 200, // Wider menu
    borderRadius: 10, // More rounded corners
    borderWidth: StyleSheet.hairlineWidth, // Thinner border
    // Background and border color set dynamically
    elevation: 8, // Slightly more elevation
    // Shadow set dynamically
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    overflow: "hidden", // Clip content to rounded corners
  },
  settingsMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14, // More vertical padding
    paddingHorizontal: 16,
  },
  settingsMenuIcon: {
    marginRight: 16, // More space next to icon
  },
  settingsMenuItemText: {
    fontSize: 16,
    fontWeight: "500", // Slightly bolder text
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    // backgroundColor dynamically set
  },
});
