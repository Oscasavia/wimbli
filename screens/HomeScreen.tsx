import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Pressable, // Use Pressable for modals
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  StatusBar,
  Alert,
  ScrollView,
  Dimensions, // Import Dimensions
  Platform, // Import Platform for specific styles/behavior
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  doc,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  arrayRemove,
  arrayUnion,
  getDoc,
  Timestamp, // Import Timestamp
  GeoPoint, // Import GeoPoint
  orderBy, // Import orderBy
  startAt, // Import startAt
  endAt, // Import endAt
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { Feather } from "@expo/vector-icons"; // Use Feather exclusively
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location"; // Import expo-location
import { geohashQueryBounds, distanceBetween } from "geofire-common"; // Import geofire functions
// Removed LinearGradient, FontAwesome, Animated, PanResponder

// --- Define distance options in miles ---
const DISTANCE_OPTIONS = {
  All: { label: "All Distances", value: "All" },
  "1mi": { label: "Within 1 mile", value: "1mi", miles: 1 },
  "5mi": { label: "Within 5 miles", value: "5mi", miles: 5 },
  "10mi": { label: "Within 10 miles", value: "10mi", miles: 10 },
  "25mi": { label: "Within 25 miles", value: "25mi", miles: 25 }, // Added more options
  "50mi": { label: "Within 50 miles", value: "50mi", miles: 50 },
  "100mi": { label: "Within 100 miles", value: "100mi", miles: 100 },
};
const KM_PER_MILE = 1.60934; // Conversion factor

// Updated Post type
type Post = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: Timestamp | string; // Handle both Timestamp and potential string dates
  fee: number;
  createdBy: string;
  creatorUsername?: string; // Renamed for clarity, matches PostScreen
  creatorProfilePic?: string; // Renamed for clarity, matches PostScreen
  coordinates?: GeoPoint; // Added GeoPoint coordinates
  geohash?: string; // Added geohash
  isSpontaneous?: boolean;
  // Add other fields if they exist
};

// Define INTEREST_OPTIONS if used in filters (assuming it's the same list)
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

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]); // User's saved interests
  const [selectedCategory, setSelectedCategory] = useState<string>("All"); // Filter state
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc"); // Default to newest first
  const [savedPosts, setSavedPosts] = useState<string[]>([]); // Local state for saved post IDs (Needs Persistence)
  const [searchText, setSearchText] = useState("");
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [distanceRadius, setDistanceRadius] =
    useState<keyof typeof DISTANCE_OPTIONS>("All"); // Filter state (logic not implemented)
  const [selectedFee, setSelectedFee] = useState<"All" | "Free" | "Paid">(
    "All"
  ); // Filter state
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null); // For location errors
  const [isFetchingLocation, setIsFetchingLocation] = useState(false); // Location fetching state
  const [upcomingSpontaneousEvents, setUpcomingSpontaneousEvents] = useState<
    Post[]
  >([]);

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
  const inputBorderColor =
    currentTheme.inputBorder || (isDark ? "#444" : "#ddd");
  const placeholderTextColor = currentTheme.textSecondary || "#8e8e93";
  const shadowColor = currentTheme.shadowColor || "#000";
  const savedIconColor = currentTheme.primary || "blue"; // Color for saved bookmark

  useEffect(() => {
    const filtered = posts
      .filter(
        (post) =>
          post.isSpontaneous &&
          post.date &&
          (post.date instanceof Timestamp
            ? post.date.toDate()
            : new Date(post.date)) > new Date()
      )
      .sort((a, b) => {
        // Sort by date, closest first
        const dateA = (
          a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date)
        ).getTime();
        const dateB = (
          b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date)
        ).getTime();
        return dateA - dateB;
      });
    setUpcomingSpontaneousEvents(filtered);
  }, [posts]); // Re-filter when the main posts list changes

  // --- Function to get User Location ---
  const getUserLocation = useCallback(async () => {
    setLocationError(null);
    setIsFetchingLocation(true);
    console.log("Attempting to get user location...");
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          "Permission to access location was denied. Please enable it in settings."
        );
        Alert.alert(
          "Location Permission Required",
          "Please enable location services in your settings to filter by distance."
        );
        setIsFetchingLocation(false);
        setUserLocation(null); // Explicitly set to null on denial
        setDistanceRadius("All"); // Reset filter if permission denied
        return null;
      }

      // Set a timeout for location fetching
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Use Balanced for faster results, High if needed
      });

      const timeoutPromise = new Promise(
        (_, reject) =>
          setTimeout(
            () => reject(new Error("Location request timed out")),
            10000
          ) // 10-second timeout
      );

      const locationResult = (await Promise.race([
        locationPromise,
        timeoutPromise,
      ])) as Location.LocationObject;

      const coords = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
      };
      console.log("User location obtained:", coords);
      setUserLocation(coords);
      setIsFetchingLocation(false);
      return coords; // Return coords for immediate use
    } catch (error: any) {
      console.error("Error getting location:", error);
      setLocationError(`Could not retrieve location: ${error.message}`);
      Alert.alert(
        "Location Error",
        `Could not retrieve your location: ${error.message}`
      );
      setUserLocation(null); // Explicitly set to null on error
      setIsFetchingLocation(false);
      setDistanceRadius("All"); // Reset filter on error
      return null;
    }
  }, []);

  // Effect to fetch user interests and posts
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let unsubscribeUser: (() => void) | null = null;
      let unsubscribePosts: (() => void) | null = null;

      const currentFilters = {
        distanceRadius,
        selectedCategory,
        sortOrder,
        searchText,
        selectedFee,
      };

      const setupListenersAndFetch = async (userId: string) => {
        setLoading(true);

        if (unsubscribeUser) unsubscribeUser();
        if (unsubscribePosts) unsubscribePosts();
        unsubscribeUser = null;
        unsubscribePosts = null;

        const userDocRef = doc(db, "users", userId);
        unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
          const interestsData = userDoc.data()?.interests || [];
          const savedPostsData = userDoc.data()?.savedPosts || [];
          setUserInterests((prev) =>
            !interestsAreEqual(prev, interestsData) ? interestsData : prev
          );
          setSavedPosts((prev) =>
            !savedPostsAreEqual(prev, savedPostsData) ? savedPostsData : prev
          );
        });

        try {
          let finalPosts: Post[] = [];

          if (currentFilters.distanceRadius === "All") {
            const postsQuery = query(collection(db, "posts"));
            unsubscribePosts = onSnapshot(postsQuery, async (postsSnap) => {
              if (!isMounted) return;
              const processed = await processPosts(
                postsSnap.docs,
                { ...currentFilters, userInterests },
                null
              );
              if (isMounted) {
                setPosts(processed);
                setLoading(false);
                setRefreshing(false);
              }
            });
          } else {
            let centerCoords = userLocation;
            if (!centerCoords && !isFetchingLocation && !locationError) {
              centerCoords = await getUserLocation();
            }

            if (!centerCoords) {
              if (isMounted) {
                setPosts([]);
                setLoading(false);
                setRefreshing(false);
              }
              return;
            }

            const radiusInMiles =
              DISTANCE_OPTIONS[currentFilters.distanceRadius].miles;
            const radiusInKm = radiusInMiles * KM_PER_MILE;
            const center: [number, number] = [
              centerCoords.latitude,
              centerCoords.longitude,
            ];
            const bounds = geohashQueryBounds(center, radiusInKm * 1000);

            const snapshots = await Promise.all(
              bounds.map((b) =>
                getDocs(
                  query(
                    collection(db, "posts"),
                    orderBy("geohash"),
                    startAt(b[0]),
                    endAt(b[1])
                  )
                )
              )
            );

            const matchingDocs = snapshots.flatMap((snap) => snap.docs);
            finalPosts = await processPosts(
              matchingDocs,
              { ...currentFilters, userInterests },
              center
            );

            if (isMounted) {
              setPosts(finalPosts);
              setLoading(false);
              setRefreshing(false);
            }
          }
        } catch (error) {
          console.error("Post fetch error:", error);
          if (isMounted) {
            setPosts([]);
            setLoading(false);
            setRefreshing(false);
          }
        }
      };

      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user && isMounted) {
          setupListenersAndFetch(user.uid);
        } else if (isMounted) {
          if (unsubscribeUser) unsubscribeUser();
          if (unsubscribePosts) unsubscribePosts();
          setPosts([]);
          setUserInterests([]);
          setSavedPosts([]);
          setUserLocation(null);
          setLocationError(null);
          setLoading(false);
          setRefreshing(false);
        }
      });

      return () => {
        isMounted = false;
        unsubscribeAuth();
        if (unsubscribeUser) unsubscribeUser();
        if (unsubscribePosts) unsubscribePosts();
      };
    }, [
      distanceRadius,
      selectedCategory,
      sortOrder,
      searchText,
      selectedFee,
      userLocation,
      getUserLocation,
      userInterests,
    ])
  );

  const processPosts = async (
    docs: any[],
    filters: {
      distanceRadius: string;
      selectedCategory: string;
      sortOrder: "asc" | "desc";
      searchText: string;
      selectedFee: "All" | "Free" | "Paid";
      userInterests: string[];
    },
    centerCoords: [number, number] | null
  ): Promise<Post[]> => {
    let posts = docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[];

    // Filter by category
    if (filters.selectedCategory !== "All") {
      posts = posts.filter(
        (post) => post.category === filters.selectedCategory
      );
    }

    // Filter by interests (if not "All")
    if (filters.userInterests?.length > 0) {
      posts = posts.filter((post) =>
        filters.userInterests.includes(post.category)
      );
    }

    // Filter by search text
    if (filters.searchText.trim() !== "") {
      const search = filters.searchText.toLowerCase();
      posts = posts.filter(
        (post) =>
          post.title.toLowerCase().includes(search) ||
          post.description.toLowerCase().includes(search)
      );
    }

    // Filter by fee
    if (filters.selectedFee === "Free") {
      posts = posts.filter((post) => post.fee === 0);
    } else if (filters.selectedFee === "Paid") {
      posts = posts.filter((post) => post.fee > 0);
    }

    // Filter by distance if centerCoords is provided
    if (centerCoords) {
      posts = posts.filter((post) => {
        if (!post.coordinates) return false;
        const dist = distanceBetween(
          [post.coordinates.latitude, post.coordinates.longitude],
          centerCoords
        );
        const maxDistance =
          DISTANCE_OPTIONS[filters.distanceRadius]?.miles || 1000;
        return dist <= maxDistance * 1.60934 * 1000; // convert miles to meters
      });
    }

    // Sort by date
    posts.sort((a, b) => {
      const dateA =
        a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
      const dateB =
        b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
      return filters.sortOrder === "asc"
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });

    return posts;
  };

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(isDark ? "light-content" : "dark-content", true);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(cardBackgroundColor, true);
      }
    }, [isDark, cardBackgroundColor])
  );

  // --- Actions ---
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data refreshes via onSnapshot, but we simulate a delay for visual feedback
    // In a real scenario with manual fetch, you'd re-trigger the fetch here.
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const openDetailsModal = (post: Post) => {
    setSelectedPost(post);
    setIsDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalVisible(false);
    setSelectedPost(null); // Clear selected post
  };

  const openFilterDrawer = () => {
    setIsFilterDrawerVisible(true);
  };

  const closeFilterDrawer = () => {
    setIsFilterDrawerVisible(false);
  };

  const interestsAreEqual = (
    arr1: string[] | undefined,
    arr2: string[] | undefined
  ): boolean => {
    if (!arr1 || !arr2) return arr1 === arr2; // Handle null/undefined cases
    if (arr1.length !== arr2.length) return false;
    // Create sorted copies for comparison to handle order differences
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    // Check if every element matches at the same sorted position
    return sorted1.every((value, index) => value === sorted2[index]);
  };

  const handleToggleSave = async (postId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Login Required", "You need to be logged in to save events.");
      return;
    }
    const userDocRef = doc(db, "users", currentUser.uid);

    // Check against the current state for immediate UI feedback
    const isCurrentlySaved = savedPosts.includes(postId);

    // --- Optimistic UI Update ---
    const updatedSavedPostsLocally = isCurrentlySaved
      ? savedPosts.filter((id) => id !== postId)
      : [...savedPosts, postId];
    setSavedPosts(updatedSavedPostsLocally); // Update local state first

    // --- Persist change to Firestore ---
    try {
      console.log(
        `Updating Firestore savedPosts. Action: ${isCurrentlySaved ? "Unsave" : "Save"}, PostID: ${postId}`
      );
      await updateDoc(userDocRef, {
        // *** CONFIRM 'savedPosts' is the correct field name in Firestore ***
        savedPosts: isCurrentlySaved
          ? arrayRemove(postId) // Use arrayRemove to unsave
          : arrayUnion(postId), // Use arrayUnion to save
      });
      console.log("Firestore savedPosts updated successfully.");
    } catch (error) {
      console.error("Error updating saved posts in Firestore:", error);
      Alert.alert(
        "Error",
        `Could not ${isCurrentlySaved ? "unsave" : "save"} event. Please try again.`
      );
      // Revert optimistic UI update on error
      setSavedPosts(savedPosts); // Revert to the original state before the optimistic update
    }
  };

  const handleJoinChat = async (post: Post | null) => {
    if (!post || !auth.currentUser) return;

    const userId = auth.currentUser.uid;
    const groupTitle = post.title; // Use post title as group identifier

    // Check if a group based on this post already exists
    // Using post.id might be a more unique identifier than title if titles can clash
    // const groupId = post.id; // Example: using post ID as group ID
    // const groupDocRef = doc(db, "groups", groupId);

    // Or query by title as before:
    const groupsRef = collection(db, "groups");
    const q = query(
      groupsRef,
      where("title", "==", groupTitle),
      where("postId", "==", post.id)
    ); // Query by title AND postId for uniqueness

    setIsDetailsModalVisible(false); // Close modal before navigating

    try {
      const querySnapshot = await getDocs(q);
      let groupId = "";
      let groupDocRef;

      if (querySnapshot.empty) {
        // Create new group if it doesn't exist
        console.log(`Creating new chat group for post: ${post.title}`);
        const newGroupRef = await addDoc(groupsRef, {
          postId: post.id, // Link group to the post
          title: groupTitle,
          createdAt: serverTimestamp(),
          members: [userId], // Add current user as the first member
          createdBy: post.createdBy, // Store post creator
        });
        groupId = newGroupRef.id;
      } else {
        // Group exists, join it by adding user to members array
        const groupDoc = querySnapshot.docs[0];
        groupId = groupDoc.id;
        groupDocRef = doc(db, "groups", groupId);
        console.log(`Joining existing chat group: ${groupId}`);
        await updateDoc(groupDocRef, {
          members: arrayUnion(userId), // Add user if not already present
        });
      }

      // Navigate to the Chat screen
      navigation.navigate("Chat", {
        // Ensure "Chat" is the correct route name
        groupId,
        groupName: post.title,
      });
    } catch (error) {
      console.error("Error joining or creating chat:", error);
      Alert.alert("Error", "Could not join the chat for this event.");
      setIsDetailsModalVisible(true); // Re-open modal on error if desired
    }
  };

  // Add helper function if needed
  const savedPostsAreEqual = (
    arr1: string[] | undefined,
    arr2: string[] | undefined
  ): boolean => {
    if (!arr1 || !arr2) return arr1 === arr2;
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((value, index) => value === sorted2[index]);
  };

  // --- Render Functions ---

  const renderPostCard = ({ item }: { item: Post }) => {
    // Safely parse date for display within the card
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
        }); // Shorter date format for card
      }
    } catch (e) {
      console.error("Date parsing error in renderPostCard:", e);
    }

    const isSaved = savedPosts.includes(item.id);

    return (
      // <SafeAreaView style={[styles.screenContainer, { backgroundColor: currentTheme.background }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => openDetailsModal(item)}
      >
        <StatusBar
          translucent={false}
          backgroundColor={cardBackgroundColor}
          barStyle={isDark ? "light-content" : "dark-content"}
        />
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
          {/* Top Row: Creator Info + Bookmark + Spontaneous Badge */}
          <View style={styles.cardTopRow}>
            <TouchableOpacity
              style={styles.creatorInfoSmall}
              onPress={(e) => {
                e.stopPropagation(); // Prevent card press when tapping creator
                navigation.navigate("Profile", { userId: item.createdBy });
              }}
            >
              <Image
                source={
                  item.creatorProfilePic
                    ? { uri: item.creatorProfilePic }
                    : require("../assets/default-profile.png")
                }
                style={styles.creatorAvatarSmall}
              />
              <Text
                style={[
                  styles.creatorNameSmall,
                  { color: currentTheme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {item.creatorUsername || "Unknown"}
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {item.isSpontaneous &&
                // Make sure item.date is valid and in the future for the badge to be most relevant
                (item.date instanceof Timestamp
                  ? item.date.toDate()
                  : new Date(item.date)) > new Date() && (
                  <View
                    style={[
                      styles.spontaneousBadge,
                      { backgroundColor: currentTheme.error || "red" },
                    ]}
                  >
                    <Text style={styles.spontaneousBadgeText}>🔥 Now</Text>
                  </View>
                )}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation(); // Prevent card press when tapping bookmark
                  handleToggleSave(item.id);
                }}
                style={styles.saveIconButton}
              >
                <Feather
                  name="bookmark"
                  size={22}
                  color={isSaved ? savedIconColor : currentTheme.textSecondary}
                  fill={isSaved ? savedIconColor : "none"} // Fill icon when saved
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content */}
          <Text
            style={[styles.cardTitle, { color: currentTheme.textPrimary }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.cardDescShort,
              { color: currentTheme.textSecondary },
            ]}
            numberOfLines={3}
          >
            {item.description}
          </Text>

          {/* Bottom Row: Date, Category, Fee */}
          <View
            style={[styles.cardBottomRow, { borderTopColor: cardBorderColor }]}
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

  // --- Initial Loading / Auth Check ---
  // Moved auth check logic inside useEffect, handle loading state directly
  // This prevents rendering the main UI before auth state is known.

  return (
    <SafeAreaView
      style={[
        styles.screenContainer,
        { backgroundColor: currentTheme.background },
      ]}
    >
      <StatusBar
        backgroundColor={cardBackgroundColor}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      {/* Header: Search + Filter Button */}
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: cardBackgroundColor },
        ]}
      >
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: inputBackgroundColor,
              borderColor: inputBorderColor,
            },
          ]}
        >
          <Text style={[styles.appName, { color: currentTheme.primary }]}>
                      Wimbli
                    </Text>
          {/* <Feather
            name="search"
            size={20}
            color={placeholderTextColor}
            style={styles.searchIcon}
          /> */}
          <TextInput
            style={[styles.searchInput, { color: currentTheme.textPrimary }]}
            placeholder="Search events..."
            placeholderTextColor={placeholderTextColor}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && ( // Show clear button only when there is text
            <TouchableOpacity
              onPress={() => setSearchText("")}
              style={styles.clearSearchButton}
            >
              <Feather name="x-circle" size={18} color={placeholderTextColor} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterTriggerButton}
          onPress={openFilterDrawer}
        >
          <Feather name="sliders" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
      </View>

      {/* ---- NEW: Horizontal Scroll for Spontaneous Events ---- */}
      {/* Only show this section if there are spontaneous events and not primary loading */}
      {!loading &&
        !isFetchingLocation &&
        upcomingSpontaneousEvents.length > 0 && (
          <View style={[styles.spontaneousSection, {borderBottomColor: currentTheme.separator,}]}>
            <Text
              style={[
                styles.sectionHeader,
                { color: currentTheme.textPrimary },
              ]}
            >
              🔥 Happening Soon!
            </Text>
            <FlatList
              horizontal
              data={upcomingSpontaneousEvents}
              renderItem={renderPostCard} // You can reuse renderPostCard
              // Consider creating a more compact card version for horizontal lists later
              keyExtractor={(item) => `spontaneous-${item.id}`} // Unique key prefix
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContainer}
              ItemSeparatorComponent={() => <View style={{ width: 10 }} />} // Optional spacing
            />
          </View>
        )}
      {/* ---- END: Horizontal Scroll for Spontaneous Events ---- */}

      {/* Main Content: List or Loading/Empty State */}
      {loading || isFetchingLocation ? (
        <View style={styles.centerStatusContainer}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
          <Text
            style={[styles.statusText, { color: currentTheme.textSecondary }]}
          >
            {isFetchingLocation
              ? "Getting your location..."
              : "Loading events..."}
          </Text>
          {locationError && ( // Show location error if any
            <Text style={[styles.statusText, { color: "red", marginTop: 10 }]}>
              {locationError}
            </Text>
          )}
        </View>
      ) : posts.length === 0 && upcomingSpontaneousEvents.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerStatusContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[currentTheme.primary]}
              tintColor={currentTheme.primary}
            />
          }
        >
          <Feather
            name="calendar"
            size={50}
            color={currentTheme.textSecondary}
          />
          <Text
            style={[styles.statusTitle, { color: currentTheme.textPrimary }]}
          >
            {locationError ? "Location Error" : "No Events Found"}
          </Text>
          <Text
            style={[styles.statusText, { color: currentTheme.textSecondary }]}
          >
            {locationError
              ? locationError // Display the specific error
              : "No events match your current filters. Try adjusting them or granting location permission!"}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={posts.filter(
            (p) => !upcomingSpontaneousEvents.find((sp) => sp.id === p.id)
          )}
          renderItem={renderPostCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[currentTheme.primary]} // Android primary color
              tintColor={currentTheme.primary} // iOS primary color
            />
          }
        />
      )}

      {/* --- Modals --- */}

      {/* Post Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDetailsModalVisible}
        onRequestClose={closeDetailsModal}
      >
        <Pressable
          style={styles.detailsModalOverlay}
          onPress={closeDetailsModal}
        >
          {/* Use Pressable for content to stop overlay press propagation */}
          <Pressable
            style={[
              styles.detailsModalContent,
              { backgroundColor: currentTheme.cardBackground },
            ]}
          >
            {selectedPost && (
              <>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.detailsScrollContainer}
                >
                  {/* Creator Info Header */}
                  <TouchableOpacity
                    style={styles.creatorInfoContainer}
                    onPress={() => {
                      closeDetailsModal();
                      if (selectedPost?.createdBy) {
                        navigation.navigate("Profile", {
                          userId: selectedPost.createdBy,
                        });
                      }
                    }}
                  >
                    <Image
                      source={
                        selectedPost.creatorProfilePic
                          ? { uri: selectedPost.creatorProfilePic }
                          : require("../assets/default-profile.png")
                      }
                      style={[
                        styles.creatorAvatar,
                        { borderColor: currentTheme.background },
                      ]}
                    />
                    <Text
                      style={[
                        styles.creatorNameText,
                        { color: currentTheme.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedPost.creatorUsername || "Unknown User"}
                    </Text>
                  </TouchableOpacity>

                  {/* Post Title */}
                  <Text
                    style={[
                      styles.detailsModalTitle,
                      { color: currentTheme.textPrimary },
                    ]}
                  >
                    {selectedPost.title}
                  </Text>

                  {/* Details Section (Date, Location, Category, Fee) */}
                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <Feather
                        name="calendar"
                        size={18}
                        color={currentTheme.textSecondary}
                        style={styles.detailIcon}
                      />
                      <Text
                        style={[
                          styles.detailText,
                          { color: currentTheme.textSecondary },
                        ]}
                      >
                        {selectedPost.date instanceof Timestamp
                          ? selectedPost.date.toDate().toLocaleString([], {
                              dateStyle: "full",
                              timeStyle: "short",
                            })
                          : new Date(selectedPost.date).toLocaleString([], {
                              dateStyle: "full",
                              timeStyle: "short",
                            })}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather
                        name="map-pin"
                        size={18}
                        color={currentTheme.textSecondary}
                        style={styles.detailIcon}
                      />
                      <Text
                        style={[
                          styles.detailText,
                          { color: currentTheme.textSecondary },
                        ]}
                      >
                        {selectedPost.location}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather
                        name="tag"
                        size={18}
                        color={currentTheme.textSecondary}
                        style={styles.detailIcon}
                      />
                      <Text
                        style={[
                          styles.detailText,
                          { color: currentTheme.textSecondary },
                        ]}
                      >
                        {selectedPost.category}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather
                        name="dollar-sign"
                        size={18}
                        color={currentTheme.textSecondary}
                        style={styles.detailIcon}
                      />
                      <Text
                        style={[
                          styles.detailText,
                          styles.detailFee,
                          {
                            color:
                              selectedPost.fee === 0
                                ? currentTheme.primary
                                : currentTheme.textPrimary,
                          },
                        ]}
                      >
                        {selectedPost.fee === 0
                          ? "Free Event"
                          : `$${selectedPost.fee.toFixed(2)}`}
                      </Text>
                    </View>
                  </View>

                  {/* Separator */}
                  <View
                    style={[
                      styles.detailsSeparator,
                      { borderBottomColor: inputBorderColor },
                    ]}
                  />

                  {/* Description Section */}
                  <Text
                    style={[
                      styles.descriptionTitle,
                      { color: currentTheme.textPrimary },
                    ]}
                  >
                    About this event
                  </Text>
                  <Text
                    style={[
                      styles.detailsModalDesc,
                      { color: currentTheme.textPrimary },
                    ]}
                  >
                    {selectedPost.description}
                  </Text>
                </ScrollView>

                {/* Action Buttons Footer */}
                <View
                  style={[
                    styles.buttonContainer,
                    { borderTopColor: inputBorderColor },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.joinButton,
                      { backgroundColor: currentTheme.primary },
                    ]} // Use theme primary for join
                    onPress={() => handleJoinChat(selectedPost)}
                  >
                    <Feather
                      name="message-circle"
                      size={18}
                      color={currentTheme.buttonText || "#fff"}
                      style={styles.buttonIcon}
                    />
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: currentTheme.buttonText || "#fff" },
                      ]}
                    >
                      Join Chat
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.closeButtonAlt,
                      {
                        backgroundColor: inputBackgroundColor,
                        borderColor: inputBorderColor,
                      },
                    ]}
                    onPress={closeDetailsModal}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: currentTheme.textSecondary },
                      ]}
                    >
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {/* Optional Explicit Close Icon */}
            <TouchableOpacity
              style={styles.modalCloseIcon}
              onPress={closeDetailsModal}
            >
              <Feather name="x" size={28} color={currentTheme.textSecondary} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filter Drawer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterDrawerVisible}
        onRequestClose={closeFilterDrawer}
      >
        <Pressable style={styles.drawerOverlay} onPress={closeFilterDrawer}>
          {/* Use Pressable for content to stop overlay press propagation */}
          <Pressable
            style={[
              styles.drawerContainer,
              { backgroundColor: currentTheme.background },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={[
                  styles.drawerTitle,
                  { color: currentTheme.textPrimary },
                ]}
              >
                Filters & Sort
              </Text>

              {/* Category Filter */}
              <View style={styles.drawerSection}>
                <Text
                  style={[
                    styles.drawerLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  Category
                </Text>
                <View
                  style={[
                    styles.pickerWrapper,
                    {
                      borderColor: inputBorderColor,
                      backgroundColor: inputBackgroundColor,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={selectedCategory}
                    onValueChange={(itemValue) =>
                      setSelectedCategory(itemValue || "All")
                    }
                    style={[styles.picker, { color: currentTheme.textPrimary }]}
                    itemStyle={
                      Platform.OS === "ios"
                        ? {
                            color: currentTheme.textPrimary,
                            backgroundColor: currentTheme.background,
                          }
                        : {}
                    } // iOS itemStyle
                    dropdownIconColor={currentTheme.textPrimary}
                    prompt="Select Category"
                  >
                    <Picker.Item label="All Categories" value="All" />
                    {/* Use INTEREST_OPTIONS defined globally or fetched */}
                    {INTEREST_OPTIONS.map((interest) => (
                      <Picker.Item
                        key={interest}
                        label={interest}
                        value={interest}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Sort Order */}
              <View style={styles.drawerSection}>
                <Text
                  style={[
                    styles.drawerLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  Sort By Date
                </Text>
                <View
                  style={[
                    styles.pickerWrapper,
                    {
                      borderColor: inputBorderColor,
                      backgroundColor: inputBackgroundColor,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={sortOrder}
                    onValueChange={(itemValue) =>
                      setSortOrder(itemValue as "desc" | "asc")
                    }
                    style={[styles.picker, { color: currentTheme.textPrimary }]}
                    //  itemStyle={Platform.OS === 'ios' ? { color: currentTheme.textPrimary, backgroundColor: currentTheme.background } : {}}
                    dropdownIconColor={currentTheme.textPrimary}
                    prompt="Sort Order"
                  >
                    <Picker.Item label="Newest First" value="desc" />
                    <Picker.Item label="Oldest First" value="asc" />
                  </Picker>
                </View>
              </View>

              {/* Distance Filter (UI only) */}
              <View style={styles.drawerSection}>
                <Text
                  style={[
                    styles.drawerLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  Distance
                </Text>
                <View
                  style={[
                    styles.pickerWrapper,
                    {
                      borderColor: inputBorderColor,
                      backgroundColor: inputBackgroundColor,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={distanceRadius}
                    onValueChange={(itemValue) => {
                      const newRadius =
                        itemValue as keyof typeof DISTANCE_OPTIONS;
                      // If user selects a distance, ensure we have location or try to get it
                      if (newRadius !== "All" && !userLocation) {
                        getUserLocation(); // Attempt to get location when filter is selected
                      }
                      setDistanceRadius(newRadius);
                    }}
                    style={[styles.picker, { color: currentTheme.textPrimary }]}
                    itemStyle={
                      Platform.OS === "ios"
                        ? {
                            color: currentTheme.textPrimary,
                            backgroundColor: currentTheme.background,
                          }
                        : {}
                    }
                    dropdownIconColor={currentTheme.textPrimary}
                    prompt="Select Distance"
                    // enabled={false} // Disable until implemented
                  >
                    {Object.entries(DISTANCE_OPTIONS).map(([key, option]) => (
                      <Picker.Item
                        key={key}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
                {isFetchingLocation && distanceRadius !== "All" && (
                  <Text
                    style={[styles.statusText, { fontSize: 12, marginTop: 5 }]}
                  >
                    Fetching location...
                  </Text>
                )}
                {locationError && distanceRadius !== "All" && (
                  <Text
                    style={[
                      styles.statusText,
                      { fontSize: 12, marginTop: 5, color: "red" },
                    ]}
                  >
                    {locationError}
                  </Text>
                )}
              </View>

              {/* Fee Filter */}
              <View style={styles.drawerSection}>
                <Text
                  style={[
                    styles.drawerLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  Fee
                </Text>
                <View
                  style={[
                    styles.pickerWrapper,
                    {
                      borderColor: inputBorderColor,
                      backgroundColor: inputBackgroundColor,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={selectedFee}
                    onValueChange={(itemValue) =>
                      setSelectedFee(itemValue as "All" | "Free" | "Paid")
                    }
                    style={[styles.picker, { color: currentTheme.textPrimary }]}
                    itemStyle={
                      Platform.OS === "ios"
                        ? {
                            color: currentTheme.textPrimary,
                            backgroundColor: currentTheme.background,
                          }
                        : {}
                    }
                    dropdownIconColor={currentTheme.textPrimary}
                    prompt="Select Fee Type"
                  >
                    <Picker.Item label="All Fees" value="All" />
                    <Picker.Item label="Free Only" value="Free" />
                    <Picker.Item label="Paid Only" value="Paid" />
                  </Picker>
                </View>
              </View>

              {/* Drawer Close Button */}
              <TouchableOpacity
                style={[
                  styles.drawerCloseButton,
                  { backgroundColor: currentTheme.primary },
                ]}
                onPress={closeFilterDrawer}
              >
                <Text
                  style={[
                    styles.drawerCloseButtonText,
                    { color: currentTheme.buttonText || "#fff" },
                  ]}
                >
                  Apply Filters
                </Text>
              </TouchableOpacity>
              <View style={{ height: 30 }} />
              {/* Bottom Spacer */}
            </ScrollView>
            {/* Optional Explicit Close Icon for Drawer */}
            <TouchableOpacity
              style={styles.drawerCloseIcon}
              onPress={closeFilterDrawer}
            >
              <Feather name="x" size={28} color={currentTheme.textSecondary} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---
const screenWidth = Dimensions.get("window").width;
const styles = StyleSheet.create({
  screenContainer: {
    // Replaces container
    flex: 1,
    // Background color set dynamically
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
  appName: {
    fontSize: 15,
    fontWeight: "bold",
    marginRight: 8,
    // color set dynamically
  },
  // searchIcon: {
  //   marginRight: 8,
  // },
  searchInput: {
    flex: 1,
    paddingVertical: 0, // Remove default padding if height is set
    fontSize: 16,
    // Dynamic color
  },
  clearSearchButton: {
    padding: 4, // Make it easier to tap
    marginLeft: 4,
  },
  filterTriggerButton: {
    marginLeft: 10,
    padding: 8,
  },
  centerStatusContainer: {
    // For Loading and Empty states
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 8,
    textAlign: "center",
  },
  statusText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  listContainer: {
    // For FlatList
    paddingHorizontal: 5,
    paddingTop: 5,
    paddingBottom: 30,
  },
  // --- Card Styles (renderPostCard) ---
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
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  creatorInfoSmall: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1, // Allow shrinking/growing
    paddingRight: 10, // Prevent overlap with bookmark
  },
  creatorAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  creatorNameSmall: {
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1, // Allow text to shrink if needed
  },
  saveIconButton: {
    paddingLeft: 10, // Increase tappable area
    paddingVertical: 5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 6,
    lineHeight: 24,
  },
  cardDescShort: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 10,
    flexWrap: "wrap", // Allow wrapping on small screens
  },
  cardInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12, // Space between items
    marginBottom: 5, // Space if items wrap
  },
  cardInfoText: {
    fontSize: 13,
    marginLeft: 4,
  },
  iconStyle: {
    // Shared style for small icons in card bottom/date rows
  },
  dateTimeRow: {
    // If needed for card internal layout
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardDateTime: {
    // If needed for card internal layout
    fontSize: 13,
    marginLeft: 4,
  },

  // --- Filter Drawer Styles ---
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  drawerContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: Math.min(screenWidth * 0.85, 350), // Limit width
    paddingTop: Platform.OS === "ios" ? 50 : 30, // Adjust top padding for status bar/notch
    paddingHorizontal: 20,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10,
    // Dynamic background color
  },
  drawerCloseIcon: {
    position: "absolute",
    top: Platform.OS === "ios" ? 45 : 15,
    right: 15,
    padding: 10,
    zIndex: 1, // Ensure it's tappable
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
  },
  drawerSection: {
    marginBottom: 12,
  },
  drawerLabel: {
    fontSize: 15,
    fontWeight: "600", // Bolder label
    marginBottom: 10,
  },
  pickerWrapper: {
    borderRadius: 25,
    borderWidth: 0,
    overflow: "hidden", // Clip picker on Android
    justifyContent: "center", // Align picker text vertically
    height: 55, // Consistent height
    // Dynamic background and border color
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  picker: {
    width: "95%",
    height: "100%",
    // Dynamic color
    backgroundColor: "transparent",
    marginLeft: 10,
  },
  drawerCloseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    paddingVertical: 12,
    borderRadius: 25, // Fully rounded buttons
    flex: 1, // Equal width
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  drawerCloseButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  // comingSoonText: {
  //    fontSize: 12,
  //    fontStyle: 'italic',
  //    textAlign: 'center',
  //    marginTop: 5,
  //    opacity: 0.7,
  //    color: '#757575', // Use theme color
  // },

  // --- Post Details Modal Styles ---
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Slightly less opaque
    justifyContent: "flex-end", // Modal comes from bottom
  },
  detailsModalContent: {
    width: "100%",
    maxHeight: "90%", // Limit height
    borderTopLeftRadius: 20, // Rounded top corners
    borderTopRightRadius: 20,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    paddingTop: 10, // Add padding at the very top for handle or spacing
    // Dynamic background color
  },
  modalCloseIcon: {
    position: "absolute",
    top: 15,
    right: 15,
    padding: 5,
    zIndex: 10,
  },
  detailsScrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 15, // Less top padding inside scroll
    paddingBottom: 20,
  },
  creatorInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2, // Add border matching modal background
  },
  creatorNameText: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailsModalTitle: {
    fontSize: 24, // Slightly smaller title
    fontWeight: "bold",
    marginBottom: 18,
    lineHeight: 32,
  },
  detailsSection: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start", // Align items top for potentially long text
    marginBottom: 14,
  },
  detailIcon: {
    marginRight: 15, // More space for icon
    marginTop: 2, // Align icon slightly lower
    width: 20,
    textAlign: "center",
  },
  detailText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1, // Allow text to wrap
  },
  detailFee: {
    fontWeight: "bold", // Make fee stand out
  },
  detailsSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ccc", // Use theme color
    marginVertical: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  detailsModalDesc: {
    fontSize: 15, // Slightly smaller description
    lineHeight: 24,
    marginBottom: 25,
  },
  buttonContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 25, // Fully rounded buttons
    flex: 1, // Equal width
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  actionButtonText: {
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  joinButton: {
    // backgroundColor: currentTheme.primary, // Use theme primary
    marginRight: 10,
  },
  // joinButtonText: { // Text color defined by buttonText in theme
  // },
  closeButtonAlt: {
    // Secondary button style
    marginLeft: 10,
    borderWidth: 0,
    // Dynamic background and border color
  },
  // ---- Styles for the Spontaneous Section ----
  spontaneousSection: {
    paddingVertical: 5,
    // Optional: add a border or slightly different background for this section
    borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: currentTheme.separator, // Use theme color
  },
  sectionHeader: {
    // You might already have a similar style
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15, // Align with card padding or screen padding
    marginBottom: 10, // Space between header and list
    // color: currentTheme.textPrimary, // Set dynamically
  },
  horizontalListContainer: {
    paddingHorizontal: 10, // Start cards a bit inset from the edge
    paddingVertical: 1,
  },
  // Spontaneous badge styles from your renderPostCard, ensure they are here
  spontaneousBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  spontaneousBadgeText: {
    color: "#fff", // Consider using currentTheme.onErrorText or similar
    fontSize: 10,
    fontWeight: "bold",
  },
});
