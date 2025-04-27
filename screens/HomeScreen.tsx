import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
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
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { Feather } from "@expo/vector-icons"; // For icons
import { SafeAreaView } from "react-native-safe-area-context";
import { updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { Animated, Dimensions, PanResponder } from "react-native";

type Post = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  fee: number;
  createdBy: string;
  creatorName?: string;
  creatorAvatar?: string;
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [distanceRadius, setDistanceRadius] = useState<
    "All" | "1km" | "5km" | "10km"
  >("All");
  const [selectedFee, setSelectedFee] = useState<"All" | "Free" | "Paid">(
    "All"
  );
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [creatorAvatar, setCreatorAvatar] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userId = user.uid;

        const unsubscribeUser = onSnapshot(
          doc(db, "users", userId),
          (userDoc) => {
            const selectedInterests = userDoc.data()?.interests || [];
            setInterests(selectedInterests);
          }
        );

        const postsQuery = query(collection(db, "posts"));

        const unsubscribePosts = onSnapshot(postsQuery, async (postsSnap) => {
          let postPromises = postsSnap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const postId = docSnap.id;

            const matchInterest =
              interests.length === 0 || interests.includes(data.category);
            const matchCategory =
              selectedCategory === "All" || data.category === selectedCategory;
            const searchTextLower = searchText.toLowerCase();
            const matchSearch =
              !searchText ||
              data.title.toLowerCase().includes(searchTextLower) ||
              data.description.toLowerCase().includes(searchTextLower);

            let matchFee = true;
            if (selectedFee === "Free") {
              matchFee = data.fee === 0;
            } else if (selectedFee === "Paid") {
              matchFee = data.fee > 0;
            }

            const matchDistance = distanceRadius === "All";

            if (
              matchInterest &&
              matchCategory &&
              matchSearch &&
              matchDistance &&
              matchFee
            ) {
              let creatorName = "Unknown";
              let creatorAvatar = "";

              try {
                if (data.createdBy) {
                  const userDoc = await getDoc(
                    doc(db, "users", data.createdBy)
                  );
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    creatorName = userData.username || "Unknown";
                    creatorAvatar = userData.profilePicture || "";
                  }
                }
              } catch (error) {
                console.error("Failed to fetch creator info", error);
              }

              return {
                id: postId,
                ...data,
                createdBy: data.createdBy,
                creatorName,
                creatorAvatar,
              } as Post;
            }
            return null;
          });

          const allPosts = await Promise.all(postPromises);
          const validPosts = allPosts.filter((post) => post !== null) as Post[];

          const sorted = validPosts.sort((a, b) => {
            const diff =
              new Date(a.date).getTime() - new Date(b.date).getTime();
            return sortOrder === "asc" ? diff : -diff;
          });

          setPosts(sorted);
          setLoading(false);
          setRefreshing(false);
        });

        return () => {
          unsubscribeUser();
          unsubscribePosts();
        };
      }
    });

    return () => unsubscribeAuth();
  }, [
    selectedCategory,
    sortOrder,
    searchText,
    interests,
    distanceRadius,
    selectedFee,
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const openModal = async (post: Post) => {
    setSelectedPost(post);

    // if (post.creatorName) {
    //     const userDoc = await getDoc(doc(db, 'users', post.creatorName));
    //     if (userDoc.exists()) {
    //         const userData = userDoc.data();
    //         setCreatorName(userData.username || 'Unknown');
    //         setCreatorAvatar(userData.profilePicture || '');
    //     }
    // }
    setModalVisible(true);
  };

  const handleToggleSave = (postId: string) => {
    setSavedPosts(
      (prev) =>
        prev.includes(postId)
          ? prev.filter((id) => id !== postId) // unsave
          : [...prev, postId] // save
    );
  };

  const handleJoinChat = async (post: Post | null) => {
    if (!post || !auth.currentUser) return;

    const userId = auth.currentUser.uid;
    const groupTitle = post.title;

    const groupRef = collection(db, "groups");
    const q = query(groupRef, where("title", "==", groupTitle));
    const querySnapshot = await getDocs(q);

    let groupId = "";

    if (querySnapshot.empty) {
      // Create new group with user as first member
      const docRef = await addDoc(groupRef, {
        title: groupTitle,
        createdAt: serverTimestamp(),
        members: [userId], // ✅ members array is created here
      });
      groupId = docRef.id;
    } else {
      const groupDoc = querySnapshot.docs[0];
      groupId = groupDoc.id;

      // ✅ Instead of adding to a subcollection, update the main group doc's members array
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(userId),
      });
    }

    // Navigate to Messages screen with this group
    navigation.navigate("Chat", {
      groupId,
      groupName: post.title, // important for displaying in header
    });
    closeModal();
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedPost(null);
  };

  if (!auth.currentUser?.uid) {
    return (
      <View
        style={[styles.center, { backgroundColor: currentTheme.background }]}
      >
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={{ color: currentTheme.textSecondary }}>
          Checking user account...
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#E0F7FA", "#F5FDFD", "#ffffff"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={[styles.container, { flex: 1 }]}>
        {/* Search Bar */}
        <View style={styles.headerContainer}>
          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={20}
              color={currentTheme.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  borderColor: currentTheme.inputBorder,
                  color: currentTheme.textPrimary,
                },
              ]} // Added color
              placeholder="Search events..."
              placeholderTextColor={currentTheme.textSecondary} // Use theme color for placeholder
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity
            style={styles.filterTriggerButton}
            onPress={() => setIsFilterDrawerVisible(true)} // Open the drawer
          >
            <Feather name="sliders" size={24} color={currentTheme.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={currentTheme.primary} />
            <Text style={{ color: currentTheme.textSecondary }}>
              Loading timeline...
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ color: currentTheme.textSecondary }}>
              No nearby events match your interests... yet 🎯
            </Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => openModal(item)}>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: currentTheme.inputBackground,
                      borderColor: currentTheme.inputBorder,
                    },
                    styles.cardShadow,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: currentTheme.textPrimary },
                      ]}
                    >
                      {item.title}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleToggleSave(item.id)}
                      style={styles.saveIconButton}
                    >
                      <Feather
                        name="bookmark"
                        size={22}
                        color={
                          savedPosts.includes(item.id)
                            ? "red"
                            : currentTheme.textSecondary
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row" }}>
                    <FontAwesome
                      name="calendar"
                      flex="1"
                      size={14}
                      color="#00ACC1"
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.cardDateTime,
                        { color: currentTheme.textSecondary, flex: 1 },
                      ]}
                    >
                      {new Date(item.date).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.cardDescShort,
                      { color: currentTheme.textPrimary },
                    ]}
                  >
                    {item.description.length > 100
                      ? `${item.description.substring(0, 100)}...`
                      : item.description}
                  </Text>

                  <Text
                    style={{ color: currentTheme.textSecondary, fontSize: 13 }}
                  >
                    {item.creatorName
                      ? `Created by: ${item.creatorName}`
                      : "Created by: Unknown"}
                  </Text>
                  <View style={styles.separator} />
                  <View style={styles.cardBottom}>
                    <Text
                      style={[
                        styles.cardCategory,
                        { color: currentTheme.textSecondary },
                      ]}
                    >
                      {item.category}
                    </Text>
                    <Text
                      style={[
                        styles.cardFee,
                        { color: currentTheme.textSecondary },
                      ]}
                    >
                      {item.fee === 0 ? "Free" : `$${item.fee}`}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Modal for Post Details */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <Pressable style={styles.detailsModalOverlay} onPress={closeModal}>
            <Pressable style={[styles.detailsModalContent]}>
              <LinearGradient
                colors={["#E0F7FA", "#F5FDFD", "#ffffff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {selectedPost && (
                  <>
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.detailsScrollContainer}
                    >
                      <TouchableOpacity
                        style={styles.creatorInfoContainer}
                        onPress={() => {
                          closeModal(); // Close this modal first
                          if (selectedPost?.createdBy) {
                            navigation.navigate("Profile", {
                              userId: selectedPost.createdBy,
                            });
                          } else {
                            console.warn("Missing creator UID");
                          }
                        }}
                      >
                        {selectedPost?.creatorAvatar ? (
                          <Image
                            source={{ uri: selectedPost.creatorAvatar }}
                            style={styles.creatorAvatar}
                          />
                        ) : (
                          <Image
                            source={require("../assets/default-profile.png")}
                            style={styles.creatorAvatar}
                          />
                        )}
                        <Text
                          style={[
                            styles.creatorNameText,
                            { color: currentTheme.primary },
                          ]}
                        >
                          {selectedPost?.creatorName || "Unknown User"}
                        </Text>
                      </TouchableOpacity>

                      <Text
                        style={[
                          styles.detailsModalTitle,
                          { color: currentTheme.textPrimary },
                        ]}
                      >
                        {selectedPost.title}
                      </Text>

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
                            {new Date(selectedPost.date).toLocaleString([], {
                              dateStyle: "medium",
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
                                    : currentTheme.textSecondary,
                              },
                            ]}
                          >
                            {selectedPost.fee === 0
                              ? "Free"
                              : `$${selectedPost.fee}`}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.detailsSeparator,
                          { borderBottomColor: currentTheme.inputBorder },
                        ]}
                      />

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

                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.joinButton]} // Specific style for Join
                        onPress={() => handleJoinChat(selectedPost)}
                      >
                        <Feather
                          name="message-circle"
                          size={18}
                          color="#fff"
                          style={styles.buttonIcon}
                        />
                        <Text
                          style={[
                            styles.actionButtonText,
                            styles.joinButtonText,
                          ]}
                        >
                          Join Chat
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.closeButtonAlt,
                          { backgroundColor: currentTheme.inputBackground },
                        ]} // Specific style for Close
                        onPress={closeModal}
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
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={closeModal}
                >
                  <Feather
                    name="x"
                    size={24}
                    color={currentTheme.textSecondary}
                  />
                </TouchableOpacity>
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Filter Drawer Modal */}
        <Modal
          animationType="slide" // Slide in from the side (or 'fade')
          transparent={true}
          visible={isFilterDrawerVisible}
          onRequestClose={() => setIsFilterDrawerVisible(false)} // Handle back button press
        >
          <TouchableOpacity
            style={styles.drawerOverlay}
            activeOpacity={1} // Prevent feedback when tapping overlay
            onPressOut={() => setIsFilterDrawerVisible(false)} // Close drawer when tapping outside
          >
            <View
              style={[
                styles.drawerContainer,
                { backgroundColor: currentTheme.background },
              ]}
            >
              <ScrollView>
                <Text
                  style={[
                    styles.drawerTitle,
                    { color: currentTheme.textPrimary },
                  ]}
                >
                  Filters & Sort
                </Text>

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
                      { borderColor: currentTheme.inputBorder },
                    ]}
                  >
                    <Picker
                      selectedValue={selectedCategory}
                      onValueChange={(itemValue) =>
                        setSelectedCategory(itemValue)
                      }
                      style={[
                        styles.picker,
                        { color: currentTheme.textPrimary },
                      ]}
                      itemStyle={{
                        color: currentTheme.textPrimary,
                        backgroundColor: currentTheme.background,
                      }} // Ensure item text is visible
                      dropdownIconColor={currentTheme.textPrimary}
                    >
                      <Picker.Item label="All" value="All" />
                      {interests.map((interest) => (
                        <Picker.Item
                          key={interest}
                          label={interest}
                          value={interest}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.drawerSection}>
                  <Text
                    style={[
                      styles.drawerLabel,
                      { color: currentTheme.textSecondary },
                    ]}
                  >
                    Sort By
                  </Text>
                  <View
                    style={[
                      styles.pickerWrapper,
                      { borderColor: currentTheme.inputBorder },
                    ]}
                  >
                    <Picker
                      selectedValue={sortOrder}
                      onValueChange={(itemValue) => setSortOrder(itemValue)}
                      style={[
                        styles.picker,
                        { color: currentTheme.textPrimary },
                      ]}
                      itemStyle={{
                        color: currentTheme.textPrimary,
                        backgroundColor: currentTheme.background,
                      }}
                      dropdownIconColor={currentTheme.textPrimary}
                    >
                      <Picker.Item label="Oldest First" value="asc" />
                      <Picker.Item label="Newest First" value="desc" />
                    </Picker>
                  </View>
                </View>

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
                      { borderColor: currentTheme.inputBorder },
                    ]}
                  >
                    <Picker
                      selectedValue={distanceRadius}
                      onValueChange={(itemValue) =>
                        setDistanceRadius(
                          itemValue as "All" | "1km" | "5km" | "10km"
                        )
                      }
                      style={[
                        styles.picker,
                        { color: currentTheme.textPrimary },
                      ]}
                      itemStyle={{
                        color: currentTheme.textPrimary,
                        backgroundColor: currentTheme.background,
                      }}
                      dropdownIconColor={currentTheme.textPrimary}
                    >
                      <Picker.Item label="All Distances" value="All" />
                      <Picker.Item label="Within 1 km" value="1km" />
                      <Picker.Item label="Within 5 km" value="5km" />
                      <Picker.Item label="Within 10 km" value="10km" />
                    </Picker>
                  </View>
                </View>

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
                      { borderColor: currentTheme.inputBorder },
                    ]}
                  >
                    <Picker
                      selectedValue={selectedFee}
                      onValueChange={(itemValue) =>
                        setSelectedFee(itemValue as "All" | "Free" | "Paid")
                      }
                      style={[
                        styles.picker,
                        { color: currentTheme.textPrimary },
                      ]}
                      itemStyle={{
                        color: currentTheme.textPrimary,
                        backgroundColor: currentTheme.background,
                      }}
                      dropdownIconColor={currentTheme.textPrimary}
                    >
                      <Picker.Item label="All Fees" value="All" />
                      <Picker.Item label="Free Only" value="Free" />
                      <Picker.Item label="Paid Only" value="Paid" />
                    </Picker>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.drawerCloseButton,
                    { backgroundColor: currentTheme.primary },
                  ]}
                  onPress={() => setIsFilterDrawerVisible(false)}
                >
                  <Text
                    style={[
                      styles.drawerCloseButtonText,
                      { color: currentTheme.buttonText },
                    ]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const screenWidth = Dimensions.get("window").width; // Get screen width

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    // paddingHorizontal: 15, // Main horizontal padding
    marginBottom: 15,
    marginTop: 10, // Add some top margin if needed
  },
  searchContainer: {
    flex: 1, // Search takes up remaining space
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    // Removed margin bottom, handled by headerContainer
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1, // Add border
    borderColor: "#eee", // Use theme border color
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent", // Container has the background now
    paddingVertical: 12,
    fontSize: 16,
    borderRadius: 10,
    // color set dynamically
  },
  filterTriggerButton: {
    marginLeft: 8, // Space between search bar and button
    padding: 8, // Make it easy to tap
    // backgroundColor: currentTheme.inputBackground,
  },
  // --- Filter Drawer Styles ---
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    // No justifyContent/alignItems needed here if drawer is positioned absolutely
  },
  drawerContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0, // Slides in from the right
    width: Math.min(screenWidth * 0.85, 400), // 85% of screen width, max 400dp
    // backgroundColor set dynamically
    paddingTop: 40, // Space for status bar or notch
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 25,
    // color set dynamically
    textAlign: "center",
  },
  drawerSection: {
    marginBottom: 20, // Space between filter sections
  },
  drawerLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    // color set dynamically
  },
  pickerWrapper: {
    // Add a wrapper for border and consistent styling
    borderRadius: 8,
    borderWidth: 1,
    // borderColor set dynamically
    // backgroundColor: currentTheme.inputBackground, // Optional: if picker bg is transparent
    overflow: "hidden", // Ensures border radius applies to picker too
  },
  picker: {
    width: "100%",
    // backgroundColor: 'transparent', // Make picker bg transparent if wrapper has it
    // color set dynamically
  },
  drawerCloseButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20, // Space above the close button
    // backgroundColor set dynamically
  },
  drawerCloseButtonText: {
    fontWeight: "bold",
    fontSize: 16,
    // color set dynamically
  },
  filterSortContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  pickerContainer: {
    flex: 1,
    marginRight: 10,
  },
  filterLabel: {
    fontWeight: "600",
    marginBottom: 5,
  },
  list: {
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 6, // separate title from date nicely
  },
  cardDateTime: {
    color: "#555",
    fontSize: 13,
    marginBottom: 8,
  },
  cardDescShort: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  separator: {
    borderBottomWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardCategory: {
    fontSize: 14,
    color: "#555",
  },
  cardFee: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalDateTime: {
    color: "#555",
    fontSize: 14,
    marginBottom: 15,
  },
  modalDesc: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  modalBottom: {
    marginTop: 15,
  },
  modalCategory: {
    fontSize: 16,
    marginBottom: 5,
  },
  modalFee: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  modalLocation: {
    fontSize: 16,
    marginBottom: 10,
  },
  closeButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // --- Styles for Revamped Post Details Modal ---
  detailsModalOverlay: {
    // Replaces modalOverlay for clarity
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)", // Slightly darker overlay
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15, // Ensures modal doesn't touch edges
    paddingVertical: 30, // Give space top/bottom
  },
  detailsModalContent: {
    // Replaces modalContent
    width: "100%", // Take full width within overlay padding
    maxWidth: 500, // Max width for very large screens/tablets
    maxHeight: "95%", // Allow more height
    borderRadius: 18, // Softer corners
    overflow: "hidden", // Clip content like ScrollView & Buttons
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    backgroundColor: "",
    // Use Pressable instead of View here to stop propagation if needed
  },
  modalCloseIcon: {
    // Optional X button
    position: "absolute",
    top: 12,
    right: 12,
    padding: 5,
    zIndex: 10, // Ensure it's above scroll content
  },
  detailsScrollContainer: {
    // Padding inside the scroll view
    paddingHorizontal: 20,
    paddingTop: 25, // Extra top padding
    paddingBottom: 10, // Padding before the fixed buttons
  },
  creatorInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    alignSelf: "flex-start", // Don't stretch full width
  },
  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18, // Make it circular
    marginRight: 12,
  },
  creatorAvatarPlaceholder: {
    borderWidth: 1,
    borderColor: "#ddd", // Use theme color later maybe
  },
  creatorNameText: {
    fontSize: 16,
    fontWeight: "600",
    // color set dynamically (using primary theme color)
  },
  detailsModalTitle: {
    // Replaces modalTitle
    fontSize: 26, // Larger title
    fontWeight: "bold", // Bold
    marginBottom: 20, // More space below title
    lineHeight: 34,
    // color set dynamically
  },
  detailsSection: {
    marginBottom: 15, // Space below the details block
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14, // Space between detail rows
  },
  detailIcon: {
    marginRight: 12, // Space between icon and text
    width: 20, // Ensure alignment
    textAlign: "center",
  },
  detailText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1, // Allow text to wrap
    // color set dynamically
  },
  detailFee: {
    fontWeight: "500", // Slightly bolder fee
  },
  detailsSeparator: {
    // Replaces separator inside modal
    height: 1,
    borderBottomWidth: StyleSheet.hairlineWidth, // Thinner line
    marginVertical: 15, // Space around separator
    // borderBottomColor set dynamically
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    // color set dynamically
  },
  detailsModalDesc: {
    // Replaces modalDesc
    fontSize: 16,
    lineHeight: 25, // Improved readability
    marginBottom: 25, // Space after description
    // color set dynamically
  },
  // --- Button Area (Fixed at the bottom of the modal) ---
  buttonContainer: {
    padding: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    // borderTopColor: currentTheme.inputBorder, // Use theme border
    // backgroundColor: currentTheme.background, // Match modal background
    flexDirection: "row", // Arrange buttons side-by-side
    justifyContent: "space-between", // Space them out
  },
  actionButton: {
    flexDirection: "row", // Icon and text side-by-side
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1, // Make buttons share space (almost equally)
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
    backgroundColor: "#28a745", // Green for primary action
    marginRight: 10, // Space between buttons
  },
  joinButtonText: {
    color: "#fff", // White text on green button
  },
  closeButtonAlt: {
    // Alternative close button style (replaces old 'closeButton')
    // backgroundColor set dynamically using theme inputBackground
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  saveIconButton: {
    padding: 5,
  },
});
