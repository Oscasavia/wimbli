// © 2025 Oscasavia Birungi. All rights reserved.
import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { db, auth } from "../firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  arrayRemove,
  updateDoc,
  Timestamp, // Import Timestamp for date handling
} from "firebase/firestore";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons"; // Use Feather icons
// Removed LinearGradient

// Define Post type for better type safety
interface Post {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string; // Assuming location exists based on PostScreen
  date: Timestamp | string; // Can be Timestamp or ISO string
  fee: number;
  createdBy: string;
  // Add other fields if necessary
}

export default function ManagePostsScreen() {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Theme variable fallbacks ---
  const cardBackgroundColor =
    currentTheme.cardBackground || (isDark ? "#1c1c1e" : "#ffffff");
  const cardBorderColor =
    currentTheme.cardBorder || (isDark ? "#3a3a3c" : "#e0e0e0");
  const errorColor = currentTheme.error || "#FF3B30"; // Theme error color or fallback
  const shadowColor = currentTheme.shadowColor || "#000";

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.uid) {
      console.log("No user logged in.");
      setLoading(false); // Stop loading if no user
      // Optional: navigate to login or show message
      return;
    }

    setLoading(true); // Ensure loading is true when starting fetch
    const q = query(
      collection(db, "posts"),
      where("createdBy", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const userPosts: Post[] = [];
        snapshot.forEach((doc) => {
          // Type assertion can be risky, better to validate structure if possible
          userPosts.push({ id: doc.id, ...doc.data() } as Post);
        });
        // Sort posts, e.g., by date descending (most recent first)
        userPosts.sort((a, b) => {
          const dateA =
            a.date instanceof Timestamp
              ? a.date.toMillis()
              : new Date(a.date).getTime();
          const dateB =
            b.date instanceof Timestamp
              ? b.date.toMillis()
              : new Date(b.date).getTime();
          return dateB - dateA; // Descending order
        });
        setPosts(userPosts);
        setLoading(false);
      },
      (error) => {
        // Handle listener errors
        console.error("Error fetching posts: ", error);
        Alert.alert("Error", "Could not fetch your posts.");
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs once on mount

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(isDark ? "light-content" : "dark-content", true);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(cardBackgroundColor, true);
      }
    }, [isDark, cardBackgroundColor])
  );

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to permanently delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Optional: Add visual feedback during deletion
              await deleteDoc(doc(db, "posts", id));
              // await removeDeletedPostFromSaved(id);
              // No need to manually remove from state, onSnapshot listener handles it
              // Alert.alert("Success", "Post deleted."); // Optional success message
            } catch (error) {
              console.error("Error deleting post: ", error);
              Alert.alert("Error", "Failed to delete post.");
            }
          },
        },
      ]
    );
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

  // --- Render Post Item ---
  const renderPost = ({ item }: { item: Post }) => {
    // Safely parse date
    let displayDate = "Invalid Date";
    try {
      const dateObj =
        item.date instanceof Timestamp
          ? item.date.toDate()
          : new Date(item.date);
      if (!isNaN(dateObj.getTime())) {
        displayDate = dateObj.toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short",
        });
      }
    } catch (e) {
      console.error("Date parsing error in renderPost:", e);
    }

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBackgroundColor,
            borderColor: cardBorderColor,
            shadowColor: shadowColor,
          },
        ]}
      >
        {/* Card Header: Title and Date */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>
            {item.title}
          </Text>
          <View style={styles.dateTimeRow}>
            <Feather
              name="calendar"
              size={14}
              color={currentTheme.textSecondary}
              style={styles.iconStyle}
            />
            <Text
              style={[
                styles.cardDateTime,
                { color: currentTheme.textSecondary },
              ]}
            >
              {displayDate}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text
          style={[styles.cardDesc, { color: currentTheme.textSecondary }]}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {item.description}
        </Text>

        {/* Separator */}
        <View
          style={[styles.separator, { backgroundColor: cardBorderColor }]}
        />

        {/* Info Row: Category and Fee */}
        <View style={styles.cardInfoRow}>
          <View style={styles.infoItem}>
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
            >
              {item.category || "N/A"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Feather
              name="dollar-sign"
              size={14}
              color={currentTheme.textSecondary}
              style={styles.iconStyle}
            />
            <Text
              style={[
                styles.cardInfoText,
                { color: currentTheme.textPrimary, fontWeight: "600" },
              ]}
            >
              {item.fee === 0 ? "Free" : `$${item.fee.toFixed(2)}`}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.buttonBase,
              styles.editButton,
              { backgroundColor: currentTheme.primary },
            ]}
            onPress={() => navigation.navigate("EditPost", { editPost: item })} // Ensure 'EditPost' matches route name
          >
            <Feather
              name="edit-2"
              size={16}
              color={currentTheme.buttonText || "#fff"}
              style={styles.buttonIcon}
            />
            <Text
              style={[
                styles.buttonText,
                { color: currentTheme.buttonText || "#fff" },
              ]}
            >
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.buttonBase,
              styles.deleteButton,
              { backgroundColor: errorColor },
            ]}
            onPress={() => confirmDelete(item.id)}
          >
            <Feather
              name="trash-2"
              size={16}
              color={currentTheme.buttonText || "#fff"}
              style={styles.buttonIcon}
            />
            <Text
              style={[
                styles.buttonText,
                { color: currentTheme.buttonText || "#fff" },
              ]}
            >
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.centerContainer,
          { backgroundColor: currentTheme.background },
        ]}
      >
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text
          style={[styles.loadingText, { color: currentTheme.textSecondary }]}
        >
          Loading your posts...
        </Text>
      </SafeAreaView>
    );
  }

  // --- Empty State ---
  if (!loading && posts.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
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
              },
            ]}
          >
            <Text
              style={[styles.screenTitle, { color: currentTheme.textPrimary }]}
            >
              Manage Your Posts
            </Text>
          </View>
          <View
            style={[
              styles.screenB,
              { backgroundColor: currentTheme.background },
            ]}
          >
            <Feather
              name="clipboard"
              size={60}
              color={currentTheme.textSecondary}
            />
            <Text
              style={[styles.emptyTitle, { color: currentTheme.textPrimary }]}
            >
              No Posts Yet
            </Text>
            <Text
              style={[styles.emptyText, { color: currentTheme.textSecondary }]}
            >
              You haven't created any posts. Create one from the Post tab or
              click the button bellow!
            </Text>
            <TouchableOpacity
              style={[
                styles.buttonBase2,
                { backgroundColor: currentTheme.primary, marginTop: 20 },
              ]}
              onPress={() => navigation.navigate("EditPost")}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: currentTheme.buttonText || "#fff" },
                ]}
              >
                Create First Post
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- Main List View ---
  return (
    <SafeAreaView style={{ flex: 1 }}>
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
            },
          ]}
        >
          <Text
            style={[styles.screenTitle, { color: currentTheme.textPrimary }]}
          >
            Manage Your Posts
          </Text>
        </View>
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenB: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  },
  listContainer: {
    paddingHorizontal: 5,
    paddingTop: 5, // Add some padding at the top of the list
    paddingBottom: 30, // Padding at the bottom
  },
  centerContainer: {
    // Used for Loading and Empty states
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 5,
    borderWidth: 0,
    // Dynamic background, border, shadow colors
    // Shadow properties
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardDateTime: {
    fontSize: 13,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  separator: {
    height: 1,
    marginVertical: 10,
    // Background color set dynamically
  },
  cardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15, // Space before buttons
    flexWrap: "wrap", // Allow wrapping if content is long
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15, // Space between items if they wrap
    marginBottom: 5, // Space if wrapping occurs
  },
  cardInfoText: {
    fontSize: 14,
  },
  iconStyle: {
    marginRight: 6, // Space between icon and text
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between", // Distribute buttons evenly
    marginTop: 10, // Space above buttons
  },
  buttonBase: {
    // Base style for both buttons
    flexDirection: "row", // Icon and text side-by-side
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1, // Make buttons take equal width
  },
  buttonBase2: {
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
    // flex: 1, // Make buttons take equal width
  },
  editButton: {
    marginRight: 8, // Space between buttons
    // Background color set dynamically
    // ...Platform.select({
    //   ios: {
    //     shadowColor: '#000',
    //     shadowOffset: { width: 0, height: 4 },
    //     shadowOpacity: 0.15,
    //     shadowRadius: 12,
    //   },
    //   android: {
    //     elevation: 6,
    //   },
    // }),
  },
  deleteButton: {
    marginLeft: 8, // Space between buttons
    borderWidth: 0, // Make border slightly thicker for outline button
    backgroundColor: "transparent", // Outline button background
    // Border color set dynamically
    // ...Platform.select({
    //   ios: {
    //     shadowColor: '#000',
    //     shadowOffset: { width: 0, height: 4 },
    //     shadowOpacity: 0.15,
    //     shadowRadius: 12,
    //   },
    //   android: {
    //     elevation: 6,
    //   },
    // }),
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center",
  },
  buttonIcon: {
    marginRight: 8, // Space between icon and text in button
  },
  // createButton: { // Optional button style for empty state
  //    paddingVertical: 30,
  // },
});
