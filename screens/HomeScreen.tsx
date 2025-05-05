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
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { Feather } from "@expo/vector-icons"; // Use Feather exclusively
import { SafeAreaView } from "react-native-safe-area-context";
// Removed LinearGradient, FontAwesome, Animated, PanResponder

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
  // Add other fields if they exist
};

// Define INTEREST_OPTIONS if used in filters (assuming it's the same list)
const INTEREST_OPTIONS = [
    "Poetry", "Tennis", "Coding", "Volunteering", "Live Music", "Book Clubs",
    "Photography", "Dancing", "Spirituality", "Outdoor Events", "Art", "Sports",
    "Games", "Electronics", "Automotive", "Garden", "Academics", "Medical",
    "Beauty", "Pet", "Food", "Clothes",
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
  const [distanceRadius, setDistanceRadius] = useState<"All" | "1km" | "5km" | "10km">("All"); // Filter state (logic not implemented)
  const [selectedFee, setSelectedFee] = useState<"All" | "Free" | "Paid">("All"); // Filter state
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);

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
  const savedIconColor = currentTheme.primary || 'blue'; // Color for saved bookmark

  // Effect to fetch user interests and posts
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribePosts: (() => void) | null = null;
    console.log("HomeScreen useEffect triggered."); // Log effect trigger

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed. User:", user ? user.uid : null);

      // --- Cleanup listeners from previous auth state ---
      // It's crucial to clean up listeners if the user logs out or changes
      if (unsubscribeUser) {
        console.log("Cleaning up previous user listener.");
        unsubscribeUser();
        unsubscribeUser = null;
      }
      if (unsubscribePosts) {
        console.log("Cleaning up previous posts listener.");
        unsubscribePosts();
        unsubscribePosts = null;
      }

      // --- Handle User Logout: Reset state here ONLY ---
      if (!user) {
        console.log("User logged out. Resetting state.");
        setPosts([]);
        setUserInterests([]); // Reset interests state on logout
        setSavedPosts([]);   // Reset saved posts state on logout
        setLoading(false);   // Stop loading if no user
        return; // Stop further setup for this auth state change
      }

      // --- User is Logged In ---
      const userId = user.uid;
      // Set loading true when we are about to set up listeners for a logged-in user
      // Only set if not already loading maybe? Or manage carefully. Let's keep it simple for now.
      setLoading(true);
      console.log(`User ${userId} logged in. Setting up listeners...`);

      // --- Listener for User Interests (No reset here) ---
      const userDocRef = doc(db, "users", userId);
      unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
        const interestsData = userDoc.data()?.interests || [];
        const savedPostsData = userDoc.data()?.savedPosts || [];
        // Use the robust comparison logic from previous step
        setUserInterests((prevInterests) => {
            // console.log('--- Comparing Interests ---'); // Keep logs if needed
            // console.log('Previous:', JSON.stringify(prevInterests));
            // console.log('Fetched: ', JSON.stringify(interestsData));
            if (!interestsAreEqual(prevInterests, interestsData)) {
                console.log("User interests ARE different, updating state.");
                return interestsData;
            } else {
                // console.log("User interests are SAME, returning prev ref.");
                return prevInterests; // Return same reference if no change
            }
        });
        // Fetch persisted saved posts state here if implemented
        // Update local state only if fetched data differs
       setSavedPosts((prev) => savedPostsAreEqual(prev, savedPostsData) ? prev : savedPostsData);
      }, (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false); // Stop loading on user fetch error
      });

      // --- Listener for Posts (No reset here) ---
      const postsQuery = query(collection(db, "posts"));
      unsubscribePosts = onSnapshot(postsQuery, async (postsSnap) => {
         console.log(`Posts snapshot received. Size: ${postsSnap.size}`);
         // ... (Keep your existing posts processing logic here: map, filter, fetch creator, sort) ...

         // --- Start of example post processing logic ---
         if (postsSnap.empty) {
             setPosts([]);
             setLoading(false);
             setRefreshing(false);
             console.log("Posts empty, loading false.");
             return;
         }
         let postPromises = postsSnap.docs.map(async (docSnap) => {
             const data = docSnap.data();
             const postId = docSnap.id;
             const matchInterest = userInterests.length === 0 || (data.category && userInterests.includes(data.category));
             const matchCategory = selectedCategory === "All" || data.category === selectedCategory;
             const searchTextLower = searchText.toLowerCase();
             const matchSearch = !searchText ||
                                 (data.title && data.title.toLowerCase().includes(searchTextLower)) ||
                                 (data.description && data.description.toLowerCase().includes(searchTextLower));
             let matchFee = true;
             if (selectedFee === "Free") matchFee = data.fee === 0;
             else if (selectedFee === "Paid") matchFee = data.fee > 0;
             const matchDistance = distanceRadius === "All";

             if (matchInterest && matchCategory && matchSearch && matchDistance && matchFee) {
                 let creatorUsername = data.creatorUsername || "Unknown";
                 let creatorProfilePic = data.creatorProfilePic || "";
                 if ((!creatorUsername || creatorUsername === "Unknown") && data.createdBy) {
                     try {
                         const userDoc = await getDoc(doc(db, "users", data.createdBy));
                         if (userDoc.exists()) {
                             const userData = userDoc.data();
                             creatorUsername = userData.username || "Unknown";
                             creatorProfilePic = userData.profilePicture || "";
                         }
                     } catch (error) { console.error("Failed creator fetch", error); }
                 }
                 let postDate : Timestamp | string = data.date || Timestamp.now();
                 if (data.date && typeof data.date.toDate === 'function') { postDate = data.date;}
                 else if (data.date && typeof data.date === 'string') { postDate = data.date; }

                 return {
                     id: postId,
                     title: data.title || 'No Title', description: data.description || '',
                     category: data.category || 'Uncategorized', location: data.location || 'No Location',
                     date: postDate, fee: data.fee ?? 0, createdBy: data.createdBy || '',
                     creatorUsername, creatorProfilePic,
                 } as Post;
             }
             return null;
         });

         try {
             const allPosts = await Promise.all(postPromises);
             const validPosts = allPosts.filter(p => p !== null) as Post[];
             const sorted = [...validPosts].sort((a, b) => {
                 const timeA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
                 const timeB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
                 const validTimeA = isNaN(timeA) ? (sortOrder === 'asc' ? Infinity : -Infinity) : timeA;
                 const validTimeB = isNaN(timeB) ? (sortOrder === 'asc' ? Infinity : -Infinity) : timeB;
                 const diff = validTimeA - validTimeB;
                 return sortOrder === "asc" ? diff : -diff;
             });

             setPosts(sorted);
             setLoading(false); // CRITICAL: Set loading false *after* successful processing
             setRefreshing(false);
             console.log("Posts processed, loading false.");
         } catch (error) {
             console.error("Error processing posts:", error);
             setLoading(false); // Ensure loading is false on error
             setRefreshing(false);
         }
         // --- End of example post processing logic ---

      }, (error) => {
        console.error("Error fetching posts:", error);
        Alert.alert("Error", "Could not load posts.");
        setLoading(false); // Ensure loading is false on listener error
        setRefreshing(false);
      });

    }); // End of onAuthStateChanged

    // Cleanup function for the useEffect hook itself
    return () => {
      console.log("HomeScreen useEffect cleanup.");
      unsubscribeAuth(); // Unsubscribe auth listener
      if (unsubscribeUser) {
         console.log("Cleaning up user listener on unmount/re-run.");
         unsubscribeUser(); // Ensure cleanup on unmount/re-run
      }
      if (unsubscribePosts) {
         console.log("Cleaning up posts listener on unmount/re-run.");
         unsubscribePosts(); // Ensure cleanup on unmount/re-run
      }
    };
  // Use the original dependencies array
  }, [selectedCategory, sortOrder, searchText, userInterests, distanceRadius, selectedFee]);


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

  const interestsAreEqual = (arr1: string[] | undefined, arr2: string[] | undefined): boolean => {
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
      console.log(`Updating Firestore savedPosts. Action: ${isCurrentlySaved ? 'Unsave' : 'Save'}, PostID: ${postId}`);
      await updateDoc(userDocRef, {
        // *** CONFIRM 'savedPosts' is the correct field name in Firestore ***
        savedPosts: isCurrentlySaved
          ? arrayRemove(postId) // Use arrayRemove to unsave
          : arrayUnion(postId)   // Use arrayUnion to save
      });
      console.log("Firestore savedPosts updated successfully.");
    } catch (error) {
      console.error("Error updating saved posts in Firestore:", error);
      Alert.alert("Error", `Could not ${isCurrentlySaved ? 'unsave' : 'save'} event. Please try again.`);
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
    const q = query(groupsRef, where("title", "==", groupTitle), where("postId", "==", post.id)); // Query by title AND postId for uniqueness

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
        navigation.navigate("Chat", { // Ensure "Chat" is the correct route name
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
  const savedPostsAreEqual = (arr1: string[] | undefined, arr2: string[] | undefined): boolean => {
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
        const dateObj = item.date instanceof Timestamp ? item.date.toDate() : new Date(item.date);
        if (!isNaN(dateObj.getTime())) {
           displayDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }); // Shorter date format for card
        }
    } catch (e) { console.error("Date parsing error in renderPostCard:", e); }

    const isSaved = savedPosts.includes(item.id);

    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => openDetailsModal(item)}>
        <View style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor: cardBorderColor, shadowColor: shadowColor }]}>
          {/* Top Row: Creator Info + Bookmark */}
          <View style={styles.cardTopRow}>
              <TouchableOpacity
                  style={styles.creatorInfoSmall}
                  onPress={(e) => {
                      e.stopPropagation(); // Prevent card press when tapping creator
                      navigation.navigate("Profile", { userId: item.createdBy });
                  }}
              >
                  <Image
                      source={item.creatorProfilePic ? { uri: item.creatorProfilePic } : require("../assets/default-profile.png")}
                      style={styles.creatorAvatarSmall}
                  />
                  <Text style={[styles.creatorNameSmall, { color: currentTheme.textSecondary }]} numberOfLines={1}>
                      {item.creatorUsername || 'Unknown'}
                  </Text>
              </TouchableOpacity>
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
                      fill={isSaved ? savedIconColor : 'none'} // Fill icon when saved
                  />
              </TouchableOpacity>
          </View>

          {/* Main Content */}
          <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.cardDescShort, { color: currentTheme.textSecondary }]} numberOfLines={3}>
            {item.description}
          </Text>

          {/* Bottom Row: Date, Category, Fee */}
           <View style={[styles.cardBottomRow, { borderTopColor: cardBorderColor }]}>
              <View style={styles.cardInfoItem}>
                 <Feather name="calendar" size={14} color={currentTheme.textSecondary} style={styles.iconStyle} />
                 <Text style={[styles.cardInfoText, { color: currentTheme.textSecondary }]}>{displayDate}</Text>
              </View>
              <View style={styles.cardInfoItem}>
                 <Feather name="tag" size={14} color={currentTheme.textSecondary} style={styles.iconStyle} />
                 <Text style={[styles.cardInfoText, { color: currentTheme.textSecondary }]} numberOfLines={1}>{item.category}</Text>
              </View>
              <View style={styles.cardInfoItem}>
                 <Feather name="dollar-sign" size={14} color={currentTheme.textSecondary} style={styles.iconStyle} />
                 <Text style={[styles.cardInfoText, { color: currentTheme.textSecondary, fontWeight: '600' }]}>
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
    <SafeAreaView style={[styles.screenContainer, { backgroundColor: currentTheme.background }]}>
      <StatusBar
            backgroundColor={cardBackgroundColor}
            barStyle={isDark ? "light-content" : "dark-content"}
          />
      {/* Header: Search + Filter Button */}
      <View style={[styles.headerContainer, { backgroundColor: cardBackgroundColor }]}>
        <View style={[styles.searchContainer, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}>
          <Feather name="search" size={20} color={placeholderTextColor} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: currentTheme.textPrimary }]}
            placeholder="Search events..."
            placeholderTextColor={placeholderTextColor}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
           {searchText.length > 0 && ( // Show clear button only when there is text
                <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchButton}>
                    <Feather name="x-circle" size={18} color={placeholderTextColor} />
                </TouchableOpacity>
            )}
        </View>
        <TouchableOpacity style={styles.filterTriggerButton} onPress={openFilterDrawer}>
          <Feather name="sliders" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Content: List or Loading/Empty State */}
      {loading ? (
        <View style={styles.centerStatusContainer}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
          <Text style={[styles.statusText, { color: currentTheme.textSecondary }]}>
            Loading events...
          </Text>
        </View>
      ) : posts.length === 0 ? (
        <ScrollView
            contentContainerStyle={styles.centerStatusContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[currentTheme.primary]} tintColor={currentTheme.primary}/>}
        >
          <Feather name="calendar" size={50} color={currentTheme.textSecondary} />
          <Text style={[styles.statusTitle, { color: currentTheme.textPrimary }]}>No Events Found</Text>
          <Text style={[styles.statusText, { color: currentTheme.textSecondary }]}>
            No events match your current filters or interests. Try adjusting the filters!
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
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
        <Pressable style={styles.detailsModalOverlay} onPress={closeDetailsModal}>
           {/* Use Pressable for content to stop overlay press propagation */}
          <Pressable style={[styles.detailsModalContent, { backgroundColor: currentTheme.cardBackground }]}>
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
                                navigation.navigate("Profile", { userId: selectedPost.createdBy });
                            }
                        }}
                    >
                        <Image
                            source={selectedPost.creatorProfilePic ? { uri: selectedPost.creatorProfilePic } : require("../assets/default-profile.png")}
                            style={[styles.creatorAvatar, {borderColor: currentTheme.background}]}
                        />
                        <Text style={[styles.creatorNameText, { color: currentTheme.textPrimary }]} numberOfLines={1}>
                            {selectedPost.creatorUsername || "Unknown User"}
                        </Text>
                    </TouchableOpacity>

                    {/* Post Title */}
                    <Text style={[styles.detailsModalTitle, { color: currentTheme.textPrimary }]}>
                        {selectedPost.title}
                    </Text>

                    {/* Details Section (Date, Location, Category, Fee) */}
                    <View style={styles.detailsSection}>
                        <View style={styles.detailRow}>
                            <Feather name="calendar" size={18} color={currentTheme.textSecondary} style={styles.detailIcon} />
                            <Text style={[styles.detailText, { color: currentTheme.textSecondary }]}>
                                {selectedPost.date instanceof Timestamp
                                 ? selectedPost.date.toDate().toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })
                                 : new Date(selectedPost.date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })
                                }
                            </Text>
                        </View>
                         <View style={styles.detailRow}>
                            <Feather name="map-pin" size={18} color={currentTheme.textSecondary} style={styles.detailIcon} />
                            <Text style={[styles.detailText, { color: currentTheme.textSecondary }]}>
                                {selectedPost.location}
                            </Text>
                        </View>
                         <View style={styles.detailRow}>
                            <Feather name="tag" size={18} color={currentTheme.textSecondary} style={styles.detailIcon} />
                            <Text style={[styles.detailText, { color: currentTheme.textSecondary }]}>
                                {selectedPost.category}
                            </Text>
                        </View>
                         <View style={styles.detailRow}>
                            <Feather name="dollar-sign" size={18} color={currentTheme.textSecondary} style={styles.detailIcon} />
                            <Text style={[styles.detailText, styles.detailFee, { color: selectedPost.fee === 0 ? currentTheme.primary : currentTheme.textPrimary }]}>
                                {selectedPost.fee === 0 ? "Free Event" : `$${selectedPost.fee.toFixed(2)}`}
                            </Text>
                        </View>
                    </View>

                    {/* Separator */}
                    <View style={[styles.detailsSeparator, { borderBottomColor: inputBorderColor }]} />

                    {/* Description Section */}
                    <Text style={[styles.descriptionTitle, { color: currentTheme.textPrimary }]}>
                        About this event
                    </Text>
                    <Text style={[styles.detailsModalDesc, { color: currentTheme.textPrimary }]}>
                        {selectedPost.description}
                    </Text>
                </ScrollView>

                 {/* Action Buttons Footer */}
                <View style={[styles.buttonContainer, { borderTopColor: inputBorderColor }]}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.joinButton, {backgroundColor: currentTheme.primary}]} // Use theme primary for join
                        onPress={() => handleJoinChat(selectedPost)}
                    >
                        <Feather name="message-circle" size={18} color={currentTheme.buttonText || '#fff'} style={styles.buttonIcon} />
                        <Text style={[styles.actionButtonText, { color: currentTheme.buttonText || '#fff' }]}>
                            Join Chat
                        </Text>
                    </TouchableOpacity>
                     <TouchableOpacity
                        style={[styles.actionButton, styles.closeButtonAlt, { backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }]}
                        onPress={closeDetailsModal}
                    >
                        <Text style={[styles.actionButtonText, { color: currentTheme.textSecondary }]}>
                            Close
                        </Text>
                    </TouchableOpacity>
                </View>
              </>
            )}
            {/* Optional Explicit Close Icon */}
            <TouchableOpacity style={styles.modalCloseIcon} onPress={closeDetailsModal}>
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
          <Pressable style={[styles.drawerContainer, { backgroundColor: currentTheme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.drawerTitle, { color: currentTheme.textPrimary }]}>
                Filters & Sort
              </Text>

              {/* Category Filter */}
              <View style={styles.drawerSection}>
                <Text style={[styles.drawerLabel, { color: currentTheme.textSecondary }]}>Category</Text>
                <View style={[styles.pickerWrapper, { borderColor: inputBorderColor, backgroundColor: inputBackgroundColor }]}>
                  <Picker
                    selectedValue={selectedCategory}
                    onValueChange={(itemValue) => setSelectedCategory(itemValue || "All")}
                    style={[styles.picker, { color: currentTheme.textPrimary }]}
                    itemStyle={Platform.OS === 'ios' ? { color: currentTheme.textPrimary, backgroundColor: currentTheme.background } : {}} // iOS itemStyle
                    dropdownIconColor={currentTheme.textPrimary}
                    prompt="Select Category"
                  >
                    <Picker.Item label="All Categories" value="All" />
                    {/* Use INTEREST_OPTIONS defined globally or fetched */}
                    {INTEREST_OPTIONS.map((interest) => (
                      <Picker.Item key={interest} label={interest} value={interest} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Sort Order */}
               <View style={styles.drawerSection}>
                 <Text style={[styles.drawerLabel, { color: currentTheme.textSecondary }]}>Sort By Date</Text>
                 <View style={[styles.pickerWrapper, { borderColor: inputBorderColor, backgroundColor: inputBackgroundColor }]}>
                   <Picker
                     selectedValue={sortOrder}
                     onValueChange={(itemValue) => setSortOrder(itemValue as "desc" | "asc")}
                     style={[styles.picker, { color: currentTheme.textPrimary }]}
                     itemStyle={Platform.OS === 'ios' ? { color: currentTheme.textPrimary, backgroundColor: currentTheme.background } : {}}
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
                  <Text style={[styles.drawerLabel, { color: currentTheme.textSecondary }]}>Distance</Text>
                  <View style={[styles.pickerWrapper, { borderColor: inputBorderColor, backgroundColor: inputBackgroundColor }]}>
                    <Picker
                      selectedValue={distanceRadius}
                      onValueChange={(itemValue) => setDistanceRadius(itemValue as "All" | "1km" | "5km" | "10km")}
                      style={[styles.picker, { color: currentTheme.textPrimary }]}
                      itemStyle={Platform.OS === 'ios' ? { color: currentTheme.textPrimary, backgroundColor: currentTheme.background } : {}}
                      dropdownIconColor={currentTheme.textPrimary}
                      prompt="Select Distance"
                      // enabled={false} // Disable until implemented
                    >
                      {/* <Picker.Item label="All Distances" value="All" />
                      <Picker.Item label="Within 1 km (soon)" value="1km" disabled={true}/>
                      <Picker.Item label="Within 5 km (soon)" value="5km" disabled={true}/>
                      <Picker.Item label="Within 10 km (soon)" value="10km" disabled={true}/> */}
                    </Picker>
                  </View>
                  <Text style={styles.comingSoonText}>(Distance filter coming soon!)</Text>
                </View>

               {/* Fee Filter */}
                <View style={styles.drawerSection}>
                  <Text style={[styles.drawerLabel, { color: currentTheme.textSecondary }]}>Fee</Text>
                  <View style={[styles.pickerWrapper, { borderColor: inputBorderColor, backgroundColor: inputBackgroundColor }]}>
                    <Picker
                      selectedValue={selectedFee}
                      onValueChange={(itemValue) => setSelectedFee(itemValue as "All" | "Free" | "Paid")}
                      style={[styles.picker, { color: currentTheme.textPrimary }]}
                      itemStyle={Platform.OS === 'ios' ? { color: currentTheme.textPrimary, backgroundColor: currentTheme.background } : {}}
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
                style={[styles.drawerCloseButton, { backgroundColor: currentTheme.primary }]}
                onPress={closeFilterDrawer}
              >
                <Text style={[styles.drawerCloseButtonText, { color: currentTheme.buttonText || '#fff' }]}>
                  Apply Filters
                </Text>
              </TouchableOpacity>
              <View style={{ height: 30 }} />{/* Bottom Spacer */}
            </ScrollView>
             {/* Optional Explicit Close Icon for Drawer */}
             <TouchableOpacity style={styles.drawerCloseIcon} onPress={closeFilterDrawer}>
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
  screenContainer: { // Replaces container
    flex: 1,
    // Background color set dynamically
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 15 : 10, // Adjust top padding
    paddingBottom: 10,
    // backgroundColor: currentTheme.background, // Optional: if header needs distinct bg
    borderBottomWidth: 1,
    borderBottomColor: 'transparent', // Use theme border
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    height: 44, // Consistent height
    // Dynamic background and border color
  },
  searchIcon: {
    marginRight: 8,
  },
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
  centerStatusContainer: { // For Loading and Empty states
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  statusTitle: {
     fontSize: 20,
     fontWeight: 'bold',
     marginTop: 15,
     marginBottom: 8,
     textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: { // For FlatList
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 30,
  },
  // --- Card Styles (renderPostCard) ---
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    // Dynamic background, border, shadow colors
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTopRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 10,
  },
  creatorInfoSmall: {
     flexDirection: 'row',
     alignItems: 'center',
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
     fontWeight: '500',
     flexShrink: 1, // Allow text to shrink if needed
  },
  saveIconButton: {
     paddingLeft: 10, // Increase tappable area
     paddingVertical: 5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
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
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     borderTopWidth: StyleSheet.hairlineWidth,
     marginTop: 10,
     paddingTop: 10,
     flexWrap: 'wrap', // Allow wrapping on small screens
   },
   cardInfoItem: {
     flexDirection: 'row',
     alignItems: 'center',
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
   dateTimeRow: { // If needed for card internal layout
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
   cardDateTime: { // If needed for card internal layout
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Adjust top padding for status bar/notch
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
     position: 'absolute',
     top: Platform.OS === 'ios' ? 45 : 15,
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
    marginBottom: 22,
  },
  drawerLabel: {
    fontSize: 15,
    fontWeight: "600", // Bolder label
    marginBottom: 10,
  },
  pickerWrapper: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden", // Clip picker on Android
    justifyContent: 'center', // Align picker text vertically
    height: 55, // Consistent height
    // Dynamic background and border color
  },
  picker: {
    width: "100%",
    height: '100%',
    // Dynamic color
  },
  drawerCloseButton: {
    paddingVertical: 14,
    borderRadius: 25, // Rounded button
    alignItems: "center",
    marginTop: 25, // Space above button
  },
  drawerCloseButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  comingSoonText: {
     fontSize: 12,
     fontStyle: 'italic',
     textAlign: 'center',
     marginTop: 5,
     opacity: 0.7,
     color: '#757575', // Use theme color
  },

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
    backgroundColor: '#ccc', // Use theme color
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
    borderWidth: 1.5,
    // Dynamic background and border color
  },
});