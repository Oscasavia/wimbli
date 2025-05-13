// © 2025 Oscasavia Birungi. All rights reserved.
import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator, // Added for loading state
  Platform, // Added for platform-specific styles
} from "react-native";
import {
  collection,
  query,
  onSnapshot,
  where, // Import where for recommended query
  Timestamp, // Import Timestamp for type safety if lastUpdated is a Timestamp
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Feather } from "@expo/vector-icons"; // Use Feather icons
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnreadMessages } from "../UnreadContext";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native"; // Use hook
// Removed LinearGradient, FontAwesome, useFocusEffect, useRef

type Group = {
  id: string;
  title: string;
  members: string[];
  lastMessage?: string;
  lastUpdated?: Timestamp | string; // Allow both types
  lastMessageSenderId?: string;
  isUnread?: boolean;
};

export default function MessagesScreen() {
  const navigation = useNavigation<any>(); // Use navigation hook
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true); // Add loading state
  const { setHasUnreadMessages } = useUnreadMessages(); // Get the setter from context
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // --- Theme variable fallbacks ---
  const cardBackgroundColor =
    currentTheme.cardBackground || (isDark ? "#1c1c1e" : "#ffffff");
  const inputBackgroundColor =
    currentTheme.inputBackground || (isDark ? "#2c2c2e" : "#f0f0f0");
  const inputBorderColor =
    currentTheme.inputBorder || (isDark ? "#444" : "#ddd");
  const placeholderTextColor = currentTheme.textSecondary || "#8e8e93";
  const separatorColor =
    currentTheme.separator || (isDark ? "#3a3a3c" : "#e0e0e0");
  const unreadColor = currentTheme.primary || "blue"; // Color for unread dot/text emphasis

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.uid) {
      console.log("MessagesScreen: No user logged in.");
      setLoading(false); // Stop loading if no user
      setGroups([]); // Clear groups if logged out
      setHasUnreadMessages(false);
      return; // Exit if no user
    }

    setLoading(true);
    const currentUserId = currentUser.uid; // Use this definitively

    // It's highly recommended to filter groups server-side for performance and scalability
    const groupsQuery = query(
      collection(db, "groups"),
      where("members", "array-contains", currentUserId)
    );

    console.log(
      `MessagesScreen: Setting up groups listener for user ${currentUserId}...`
    );
    const unsubscribe = onSnapshot(
      groupsQuery, // Use the server-filtered query
      async (snapshot) => {
        console.log(
          `MessagesScreen: Snapshot received for user ${currentUserId}. Size: ${snapshot.size}`
        );
        const groupPromises = snapshot.docs.map(
          async (docSnap): Promise<Group | null> => {
            const data = docSnap.data();
            const groupId = docSnap.id;

            // No need for client-side member check if server-side filter is used and correct
            // if (!data.members || !data.members.includes(currentUserId)) {
            //   return null;
            // }

            let isUnread = false;
            const lastMessageWasByCurrentUser =
              data.lastMessageSenderId === currentUserId; // Compare with fresh currentUserId

            if (lastMessageWasByCurrentUser) {
              isUnread = false;
            } else {
              // ... rest of your existing date comparison logic for unread status ...
              // Ensure you use 'currentUserId' consistently if needed inside this block for other checks
              const lastUpdatedFromData = data.lastUpdated;
              if (lastUpdatedFromData) {
                let lastUpdatedDate: Date | null = null;
                if (lastUpdatedFromData instanceof Timestamp) {
                  lastUpdatedDate = lastUpdatedFromData.toDate();
                } else if (typeof lastUpdatedFromData === "string") {
                  const parsedDate = new Date(lastUpdatedFromData);
                  if (!isNaN(parsedDate.getTime()))
                    lastUpdatedDate = parsedDate;
                } else if (typeof lastUpdatedFromData === "number") {
                  const parsedDate = new Date(lastUpdatedFromData);
                  if (!isNaN(parsedDate.getTime()))
                    lastUpdatedDate = parsedDate;
                }

                if (lastUpdatedDate) {
                  try {
                    const lastSeenKey = `lastSeen_${groupId}`;
                    const lastSeenStr = await AsyncStorage.getItem(lastSeenKey);
                    if (lastSeenStr) {
                      const lastSeenDate = new Date(lastSeenStr);
                      if (!isNaN(lastSeenDate.getTime())) {
                        isUnread = lastUpdatedDate > lastSeenDate;
                      } else {
                        isUnread = true;
                      }
                    } else {
                      isUnread = true;
                    }
                  } catch (error) {
                    console.error(`AsyncStorage error for ${groupId}:`, error);
                    isUnread = false;
                  }
                } else {
                  isUnread = false;
                }
              } else {
                isUnread = false;
              }
            }
            // ... return group object with isUnread ...
            return {
              id: groupId,
              title: data.title || "Untitled Group",
              members: data.members || [],
              lastMessage: data.lastMessage || "",
              lastUpdated: data.lastUpdated || null,
              lastMessageSenderId: data.lastMessageSenderId || null,
              isUnread,
            };
          }
        );
        // ... Promise.all logic ...
        try {
          const resolvedGroupsNullable = await Promise.all(groupPromises);
          const userGroups = resolvedGroupsNullable.filter(
            (group) => group !== null
          ) as Group[];
          const sorted = userGroups.sort((a, b) => {
            /* ... your sorting logic ... */
            const timeA = a.lastUpdated
              ? a.lastUpdated instanceof Timestamp
                ? a.lastUpdated.toMillis()
                : new Date(a.lastUpdated as string).getTime()
              : 0;
            const timeB = b.lastUpdated
              ? b.lastUpdated instanceof Timestamp
                ? b.lastUpdated.toMillis()
                : new Date(b.lastUpdated as string).getTime()
              : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          });
          setGroups(sorted);

          // Determine if there are ANY unread messages and update context
          const anyUnread = sorted.some((group) => group.isUnread === true);
          setHasUnreadMessages(anyUnread);
          console.log(`MessagesScreen: Overall unread status: ${anyUnread}`);
        } catch (error) {
          console.error("MessagesScreen: Error processing groups:", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error(
          `MessagesScreen: Error on groups listener for user ${currentUserId}:`,
          error
        );
        Alert.alert("Error", "Could not load your chats.");
        setLoading(false);
        setHasUnreadMessages(false); // Default on error
      }
    );

    return () => {
      console.log(
        `MessagesScreen: Unsubscribing groups listener for user ${currentUserId}.`
      );
      unsubscribe();
    };
  }, [auth.currentUser, setHasUnreadMessages]); // Run only on mount (or user change if auth logic was outside)

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(isDark ? "light-content" : "dark-content", true);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(cardBackgroundColor, true);
      }
    }, [isDark, cardBackgroundColor])
  );

  // Client-side search filtering
  const filteredGroups = groups.filter((group) =>
    group.title.toLowerCase().includes(search.toLowerCase())
  );

  // Format date for display
  const formatDate = (
    dateInput: Timestamp | string | null | undefined
  ): string => {
    if (!dateInput) return "";
    let date: Date;
    try {
      date =
        dateInput instanceof Timestamp
          ? dateInput.toDate()
          : new Date(dateInput);
      if (isNaN(date.getTime())) return ""; // Return empty if date is invalid
    } catch (e) {
      return ""; // Return empty on parsing error
    }

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (isYesterday) {
      return "Yesterday";
    } else {
      // Check if it's this year
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: "short", day: "numeric" }); // e.g. Mar 20
      } else {
        return date.toLocaleDateString([], {
          year: "numeric",
          month: "short",
          day: "numeric",
        }); // e.g. Mar 20, 2024
      }
    }
  };

  // Handle opening chat and marking as read
  const handleOpenChat = async (group: Group) => {
    try {
      // Update lastSeen timestamp immediately
      await AsyncStorage.setItem(
        `lastSeen_${group.id}`,
        new Date().toISOString()
      );
      // Optimistically update UI
      const updatedGroups = groups.map((g) =>
        g.id === group.id ? { ...g, isUnread: false } : g
      );
      setGroups(updatedGroups);

      // Recalculate overall unread status after marking one as read
      const anyUnreadAfterOpen = updatedGroups.some((g) => g.isUnread === true);
      setHasUnreadMessages(anyUnreadAfterOpen);

      // Navigate
      navigation.navigate("Chat", {
        groupId: group.id,
        groupName: group.title,
      }); // Pass groupName
    } catch (error) {
      console.error("Error updating lastSeen or navigating:", error);
      // Still navigate even if AsyncStorage fails? Maybe.
      navigation.navigate("Chat", {
        groupId: group.id,
        groupName: group.title,
      });
    }
  };

  // Render function for each chat row
  const renderGroupRow = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => handleOpenChat(item)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View
        style={[
          styles.avatarContainer,
          { backgroundColor: currentTheme.primary + "30" },
        ]}
      >
        <Feather name="users" size={22} color={currentTheme.primary} />
        {/* Alternative: Initials - needs a helper function */}
        {/* <Text style={[styles.avatarText, { color: currentTheme.primary }]}>{getInitials(item.title)}</Text> */}
      </View>

      {/* Text Content */}
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.groupTitle,
              { color: currentTheme.textPrimary },
              item.isUnread && styles.groupTitleUnread,
            ]}
          >
            {item.title}
          </Text>
          {item.isUnread && (
            <View
              style={[styles.unreadDot, { backgroundColor: unreadColor }]}
            />
          )}
        </View>
        <Text
          style={[
            styles.lastMessage,
            { color: currentTheme.textSecondary },
            item.isUnread && styles.lastMessageUnread, // Style unread message
          ]}
          numberOfLines={1}
        >
          {item.lastMessage || "Tap to start chatting"}
        </Text>
      </View>

      {/* Date */}
      <Text style={[styles.dateText, { color: currentTheme.textSecondary }]}>
        {formatDate(item.lastUpdated)}
      </Text>
    </TouchableOpacity>
  );

  // --- Render Component ---
  return (
    <SafeAreaView
      style={[
        styles.screenContainer,
        { backgroundColor: inputBackgroundColor },
      ]}
    >
      {/* <> */}
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
          },
        ]}
      >
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: inputBackgroundColor,
              borderColor: inputBorderColor,
            },
          ]}
        >
          <Feather
            name="search"
            size={20}
            color={placeholderTextColor}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search chats..."
            placeholderTextColor={placeholderTextColor}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: currentTheme.textPrimary }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              style={styles.clearSearchButton}
            >
              <Feather name="x-circle" size={16} color={placeholderTextColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List or Loading/Empty State */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupRow}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.separator, { backgroundColor: separatorColor }]}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather
                name="message-square"
                size={50}
                color={currentTheme.textSecondary}
                style={{ marginBottom: 15 }}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: currentTheme.textSecondary },
                ]}
              >
                You haven't joined any group chats yet.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Home")}>
                <Text
                  style={[styles.discoverLink, { color: currentTheme.primary }]}
                >
                  Discover Events & Join Chats
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    paddingHorizontal: 12,
    borderWidth: 0,
    height: 44, // Consistent height
    // Dynamic background and border color
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0, // Remove default padding
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 4,
  },
  listContainer: {
    paddingBottom: 20, // Space at the end of the list
    flexGrow: 1, // Ensure empty component can center
  },
  centerContainer: {
    // For Loading and Empty states
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    // If needed
    marginTop: 15,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1, // Take up remaining space
    marginTop: 80, // Push down from search bar
    alignItems: "center",
    justifyContent: "center", // Center vertically in available space
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 22,
  },
  discoverLink: {
    fontSize: 16,
    fontWeight: "600",
    // textDecorationLine: "underline", // Optional underline
  },
  // --- List Item Row Styles ---
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16, // Consistent horizontal padding
    // borderBottomWidth removed, using ItemSeparatorComponent
  },
  separator: {
    height: StyleSheet.hairlineWidth, // Thin separator line
    marginHorizontal: 16, // Indent separator slightly less than row padding? Or full width?
    // backgroundColor set dynamically
  },
  avatarContainer: {
    width: 50, // Slightly larger avatar
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15, // More space after avatar
    // backgroundColor set dynamically (e.g., theme primary + opacity)
  },
  avatarIcon: {
    // Style for Feather icon if needed
  },
  // avatarText: { // Style for initials if used
  //    fontSize: 18,
  //    fontWeight: 'bold',
  // },
  textContainer: {
    flex: 1, // Take remaining space
    justifyContent: "center", // Center text vertically if needed
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3, // Space between title and message
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "600", // Slightly bolder title
    marginRight: 6, // Space before dot
    // color set dynamically
  },
  groupTitleUnread: {
    fontWeight: "bold", // Make title bold if unread
  },
  unreadDot: {
    width: 9, // Slightly smaller dot
    height: 9,
    borderRadius: 4.5,
    // backgroundColor set dynamically
  },
  lastMessage: {
    fontSize: 14,
    // color set dynamically
  },
  lastMessageUnread: {
    fontWeight: "bold", // Make last message bold if unread
    // Optionally change color too: color: currentTheme.textPrimary
  },
  dateText: {
    fontSize: 12,
    marginLeft: 10, // Space before date
    textAlign: "right", // Align date to the right
    // color set dynamically
  },
});
