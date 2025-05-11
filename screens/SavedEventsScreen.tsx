// screens/SavedEventsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  Alert, // Added Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  doc,
  getDoc,
  Timestamp,
  DocumentData,
  updateDoc, // Added for unsave
  arrayRemove, // Added for unsave
} from "firebase/firestore";
import { db, auth } from "../firebase"; // Adjust path
import { useTheme } from "../ThemeContext"; // Adjust path
import { lightTheme, darkTheme } from "../themeColors"; // Adjust path
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons"; // Use Feather/MCI

// Re-use Post type or define specifically if needed
// Ensure it includes fields displayed on the card
type Post = {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string; // Optional based on your data
  date: Timestamp | string;
  fee: number;
  createdBy: string;
  creatorUsername?: string;
  creatorProfilePic?: string;
  // Add potentially missing fields like image if shown on card
  imageUrl?: string;
};

export default function SavedEventsScreen() {
  const navigation = useNavigation<any>();
  const [savedEvents, setSavedEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Theme variable fallbacks ---
  const cardBackgroundColor =
    currentTheme.cardBackground || (isDark ? "#1c1c1e" : "#ffffff");
  const inputBackgroundColor =
    currentTheme.inputBackground || (isDark ? "#2c2c2e" : "#f0f0f0");
  const cardBorderColor =
    currentTheme.cardBorder || (isDark ? "#3a3a3c" : "#e0e0e0");
  const shadowColor = currentTheme.shadowColor || "#000";
  const separatorColor =
    currentTheme.separator || (isDark ? "#3a3a3c" : "#e0e0e0");
  const savedIconColor = currentTheme.primary || "blue"; // Color for saved bookmark

  // Set Header Title
  useEffect(() => {
    navigation.setOptions({ title: "Saved Events" });
  }, [navigation]);

  // Fetch saved events when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true; // Prevent state updates if component unmounts quickly

      const fetchSavedEvents = async () => {
        setLoading(true);
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log("SavedEvents: No user logged in.");
          if (isActive) {
            setSavedEvents([]);
            setLoading(false);
          }
          return;
        }

        try {
          // 1. Get saved post IDs from user doc
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!isActive) return; // Check if component is still active

          if (!userDocSnap.exists()) {
            console.log("SavedEvents: User document not found.");
            setSavedEvents([]);
            setLoading(false);
            return;
          }

          const userData = userDocSnap.data();
          // *** Confirm field name: is it 'savedPosts' or 'savedEvents'? ***
          const savedPostIds: string[] = userData.savedPosts || []; // Adjust if name differs

          if (savedPostIds.length === 0) {
            console.log("SavedEvents: No saved post IDs.");
            setSavedEvents([]);
            setLoading(false);
            return;
          }

          console.log("SavedEvents: Found saved post IDs:", savedPostIds);

          // 2. Fetch actual post documents
          // Using Promise.all for concurrent fetching
          const eventPromises = savedPostIds.map((postId) =>
            getDoc(doc(db, "posts", postId))
          );
          const eventDocsSnaps = await Promise.all(eventPromises);

          if (!isActive) return; // Check again after async operations

          const eventsData: Post[] = eventDocsSnaps
            .filter((docSnap) => docSnap.exists()) // Ensure post wasn't deleted
            .map(
              (docSnap) =>
                ({
                  id: docSnap.id,
                  ...docSnap.data(),
                }) as Post
            ); // Basic mapping, assuming data matches Post type

          // 3. (Optional but recommended) Fetch/Assign denormalized creator info if needed
          // This part is less critical if your cards don't show creator info
          // For simplicity, we'll skip the extra N+1 fetch here and assume
          // basic post data is sufficient for the card display. Add if needed.

          // 4. Sort (e.g., by event date)
          eventsData.sort((a, b) => {
            const timeA =
              a.date instanceof Timestamp
                ? a.date.toMillis()
                : new Date(a.date).getTime();
            const timeB =
              b.date instanceof Timestamp
                ? b.date.toMillis()
                : new Date(b.date).getTime();
            const validTimeA = isNaN(timeA) ? 0 : timeA;
            const validTimeB = isNaN(timeB) ? 0 : timeB;
            return validTimeB - validTimeA; // Newest first
          });

          if (isActive) {
            setSavedEvents(eventsData);
            console.log(`SavedEvents: Set ${eventsData.length} saved events.`);
          }
        } catch (error) {
          console.error("SavedEvents: Error fetching saved events:", error);
          if (isActive) setSavedEvents([]);
          Alert.alert("Error", "Could not load saved events.");
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchSavedEvents();

      return () => {
        isActive = false; // Cleanup function to prevent state updates on unmount/blur
      };
    }, []) // Empty dependency array ensures it runs on focus
  );

  // --- Actions ---
  const handleUnsave = async (postId: string) => {
    Alert.alert("Unsave Event", "Remove this event from your saved list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unsave",
        style: "destructive",
        onPress: async () => {
          console.log("Attempting to unsave event:", postId);
          const currentUser = auth.currentUser;
          if (!currentUser) return;
          const userDocRef = doc(db, "users", currentUser.uid);
          try {
            // Update Firestore: Remove postId from the 'savedPosts' array
            // *** Confirm field name: 'savedPosts' ***
            await updateDoc(userDocRef, {
              savedPosts: arrayRemove(postId),
            });

            // Optimistically remove from local state for immediate UI update
            setSavedEvents((prev) =>
              prev.filter((event) => event.id !== postId)
            );
            // Alert.alert("Success", "Event unsaved."); // Optional success alert
          } catch (error) {
            console.error("Error unsaving event:", error);
            Alert.alert("Error", "Could not unsave event.");
          }
        },
      },
    ]);
  };

  const navigateToDetails = (post: Post) => {
    // Option 1: Navigate to a dedicated Post Detail Screen
    // navigation.navigate("PostDetail", { postId: post.id });

    // Option 2: Re-use the Home Screen's modal logic (requires passing post data)
    // This might involve setting some global state or passing complex params,
    // potentially less clean than a dedicated screen.
    // For simplicity, let's assume a PostDetail screen exists or just log for now.
    console.log("Navigate to details for post:", post.id);
    Alert.alert("Navigate", `Would navigate to details for "${post.title}"`);
  };

  // --- Render Helper for Saved Event Card ---
  const renderSavedEventCard = ({ item }: { item: Post }) => {
    // Format date (copy or import the formatDate helper)
    let displayDate = "Date unavailable";
    try {
      const dateObj =
        item.date instanceof Timestamp
          ? item.date.toDate()
          : new Date(item.date);
      if (!isNaN(dateObj.getTime())) {
        displayDate = dateObj.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          year: "numeric",
        }); // Full date might be better here
      }
    } catch (e) {
      console.error("Date parsing error:", e);
    }

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigateToDetails(item)}
      >
        <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          {/* Top Row: Title + Unsave Button */}
          <View style={styles.cardHeader}>
            <Text
              style={[styles.cardTitle, { color: currentTheme.textPrimary }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <TouchableOpacity
              onPress={() => handleUnsave(item.id)}
              style={styles.unsaveButton}
            >
              <Feather
                name="bookmark"
                size={22}
                color={savedIconColor}
                fill={savedIconColor}
              />
            </TouchableOpacity>
          </View>

          {/* Optional: Short Description or Location */}
          <Text
            style={[
              styles.cardDescShort,
              { color: currentTheme.textSecondary },
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Text>

          {/* Info Row: Date, Category, Fee */}
          <View
            style={[
              styles.cardInfoRow,
              {
                borderTopColor: cardBorderColor,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.cardInfoItem}>
              <Feather
                name="calendar"
                size={14}
                color={currentTheme.textSecondary}
                style={styles.iconStyle}
              />
              <Text
                style={[
                  styles.cardInfoText,
                  { color: currentTheme.textSecondary },
                ]}
              >
                {displayDate}
              </Text>
            </View>
            <View style={styles.cardInfoItem}>
              <Feather
                name="tag"
                size={14}
                color={currentTheme.textSecondary}
                style={styles.iconStyle}
              />
              <Text
                style={[
                  styles.cardInfoText,
                  { color: currentTheme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {item.category}
              </Text>
            </View>
            <View style={styles.cardInfoItem}>
              <Feather
                name="dollar-sign"
                size={14}
                color={currentTheme.textSecondary}
                style={styles.iconStyle}
              />
              <Text
                style={[
                  styles.cardInfoText,
                  { color: currentTheme.textSecondary, fontWeight: "600" },
                ]}
              >
                {item.fee === 0 ? "Free" : `$${item.fee.toFixed(2)}`}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Render Component ---

  // Loading State
  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.centerContainer,
          { backgroundColor: currentTheme.background },
        ]}
      >
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </SafeAreaView>
    );
  }

  // Empty State
  if (!loading && savedEvents.length === 0) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: inputBackgroundColor }]}
      >
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
              Saved Events
            </Text>
          </View>
          <View
            style={[
              styles.screenB,
              { backgroundColor: currentTheme.background },
            ]}
          >
            <MaterialCommunityIcons
              name="bookmark-off-outline"
              size={60}
              color={currentTheme.textSecondary}
            />
            <Text
              style={[styles.emptyTitle, { color: currentTheme.textPrimary }]}
            >
              No Saved Events
            </Text>
            <Text
              style={[styles.emptyText, { color: currentTheme.textSecondary }]}
            >
              You haven't saved any events yet. Find events on the Home screen
              and tap the bookmark icon!
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Main")}>
              <Text
                style={[styles.discoverLink, { color: currentTheme.primary }]}
              >
                Browse Events
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main List View
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: inputBackgroundColor }]}
    >
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
            Saved Events
          </Text>
        </View>
        <FlatList
          data={savedEvents}
          renderItem={renderSavedEventCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />} // Add space between cards instead of a line
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

// --- Styles --- (Adapt from ManagePostsScreen or HomeScreen)
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenB: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    zIndex: 10, // Ensures it stays above the list in case of overlap
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    marginRight: 45, // balances the left icon space
  },
  listContainer: {
    paddingHorizontal: 5,
    paddingTop: 5, // Space below header (now native)
    paddingBottom: 30,
  },
  centerContainer: {
    // For Loading and Empty states
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  discoverLink: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Card Styles (Similar to HomeScreen/ManagePostsScreen)
  card: {
    padding: 15,
    borderRadius: 12,
    // marginBottom: 0,
    borderWidth: 0,
    // Dynamic background, border, shadow colors
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Align items top
    //   marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    lineHeight: 24,
    flex: 1, // Allow title to take space
    marginRight: 10, // Space before bookmark
  },
  unsaveButton: {
    padding: 5, // Tappable area
    marginLeft: 10,
  },
  cardDescShort: {
    // Optional description style
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    // color set dynamically
  },
  cardInfoRow: {
    flexDirection: "row",
    // justifyContent: 'space-between', // Let items flow naturally
    alignItems: "center",
    marginTop: 8, // Space above info row
    flexWrap: "wrap",
    paddingTop: 8,
  },
  cardInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15, // More space between info items
    marginBottom: 5, // Space if items wrap
  },
  cardInfoText: {
    fontSize: 13,
    marginLeft: 5, // Space after icon
  },
  iconStyle: {
    // Shared style for small icons
  },
});
