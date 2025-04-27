import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  Pressable,
} from "react-native";
import { auth, db } from "../firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { useRoute } from "@react-navigation/native";
import { signOut, deleteUser } from "firebase/auth";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { Feather, MaterialIcons } from "@expo/vector-icons"; // For icons
import { SafeAreaView } from "react-native-safe-area-context"; // For status bar awareness
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSettingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const toggleSettingsMenu = () =>
    setSettingsMenuVisible(!isSettingsMenuVisible);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (error: any) {
      Alert.alert("Logout Error", error.message);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action is irreversible.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (user) {
              try {
                const uid = user.uid;
                await deleteDoc(doc(db, "users", uid));
                await deleteUser(user);
                navigation.replace("Signup");
              } catch (error: any) {
                Alert.alert("Delete Account Error", error.message);
              }
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const navigateToSettings = () => {
    setSettingsMenuVisible(false); // Close menu first
    navigation.navigate("Settings"); // Navigate to Settings screen
  };

  useFocusEffect(
    useCallback(() => {
      const fetchUser = async () => {
        try {
          const uid = userId || auth.currentUser?.uid;
          if (!uid) return;

          const docSnap = await getDoc(doc(db, "users", uid));
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }

          setLoading(false);
        } catch (error) {
          console.error("Error loading profile:", error);
        }
      };

      fetchUser();
    }, [])
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

  return (
    <LinearGradient
      colors={["#E0F7FA", "#F5FDFD", "#ffffff"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: "transparent" }]}
      >
        {/* --- Settings Icon Button (Top Right) --- */}
        <TouchableOpacity
          style={styles.settingsIconContainer}
          onPress={toggleSettingsMenu}
        >
          <Feather
            name="more-vertical"
            size={24}
            color={currentTheme.textPrimary}
          />
        </TouchableOpacity>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleModal}>
              <Image
                source={
                  userData?.profilePicture
                    ? { uri: userData.profilePicture }
                    : require("../assets/default-profile.png")
                }
                style={styles.avatar}
              />
            </TouchableOpacity>
            <Text
              style={[styles.username, { color: currentTheme.textPrimary }]}
            >
              {auth.currentUser?.displayName || "Not set"}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("EditProfile")}
              style={styles.editButton}
            >
              <View style={styles.editButtonContainer}>
                <Feather
                  name="edit"
                  size={20}
                  color={currentTheme.textSecondary}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Email Section */}
          <View
            style={[
              styles.infoSection,
              {
                backgroundColor: currentTheme.inputBackground,
                ...styles.cardShadow,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="email"
                size={20}
                color={currentTheme.textSecondary}
                style={styles.sectionIcon}
              />
              <Text
                style={[
                  styles.sectionLabel,
                  { color: currentTheme.textPrimary },
                ]}
              >
                Email
              </Text>
            </View>
            <Text
              style={[styles.infoText, { color: currentTheme.textSecondary }]}
            >
              {auth.currentUser?.email}
            </Text>
          </View>

          {/* Bio Section */}
          <View
            style={[
              styles.infoSection,
              {
                backgroundColor: currentTheme.inputBackground,
                ...styles.cardShadow,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Feather
                name="user"
                size={20}
                color={currentTheme.textSecondary}
                style={styles.sectionIcon}
              />
              <Text
                style={[
                  styles.sectionLabel,
                  { color: currentTheme.textPrimary },
                ]}
              >
                Bio
              </Text>
            </View>
            <Text
              style={[styles.bioText, { color: currentTheme.textSecondary }]}
            >
              {userData?.bio || "No bio yet"}
            </Text>
          </View>

          {/* Interests Section */}
          <View
            style={[
              styles.infoSection,
              {
                backgroundColor: currentTheme.inputBackground,
                ...styles.cardShadow,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Feather
                name="tag"
                size={20}
                color={currentTheme.textSecondary}
                style={styles.sectionIcon}
              />
              <Text
                style={[
                  styles.sectionLabel,
                  { color: currentTheme.textPrimary },
                ]}
              >
                Interests
              </Text>
            </View>
            <View style={styles.interestsContainer}>
              {userData?.interests?.map((item: string) => (
                <View
                  key={item}
                  style={[
                    styles.interestChip,
                    { backgroundColor: currentTheme.chipBackground },
                  ]}
                >
                  <Text
                    style={[
                      styles.interestChipText,
                      { color: currentTheme.chipText },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              )) || (
                <Text style={{ color: currentTheme.textSecondary }}>
                  No interests selected yet.
                </Text>
              )}
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            style={[
              styles.actionButton,
              { backgroundColor: currentTheme.secondary },
            ]}
          >
            <Feather
              name="log-out"
              size={20}
              color={currentTheme.buttonText}
              style={styles.actionIcon}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: currentTheme.buttonText },
              ]}
            >
              Logout
            </Text>
          </TouchableOpacity>

          {/* Delete Account Button */}
          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={[styles.actionButton, { backgroundColor: "#FF6B6B" }]}
          >
            <Feather
              name="trash-2"
              size={20}
              color={currentTheme.buttonText}
              style={styles.actionIcon}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: currentTheme.buttonText },
              ]}
            >
              Delete Account
            </Text>
          </TouchableOpacity>

          {/* Full Image Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={toggleModal}
          >
            <TouchableOpacity style={styles.modalOverlay} onPress={toggleModal}>
              <View style={styles.modalContent}>
                <Image
                  source={
                    userData?.profilePicture
                      ? { uri: userData.profilePicture }
                      : require("../assets/default-profile.png")
                  }
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </ScrollView>
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
            <View style={[styles.settingsMenuContainer]}>
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
              {/* <View style={[styles.menuSeparator, {backgroundColor: currentTheme.inputBorder}]} />
                         <TouchableOpacity style={styles.settingsMenuItem} onPress={() => { toggleSettingsMenu(); handleLogout(); }}>
                             <Feather name="log-out" size={18} color={currentTheme.textSecondary} style={styles.settingsMenuIcon} />
                             <Text style={[styles.settingsMenuItemText, { color: currentTheme.textPrimary }]}>Logout</Text>
                         </TouchableOpacity> */}
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingTop: 60, // Increased padding to account for absolute positioned settings icon
    paddingBottom: 30, // More padding at bottom
  },
  settingsIconContainer: {
    position: "absolute",
    top: 15, // Adjust based on status bar height/SafeAreaView padding
    right: 15,
    padding: 8,
    zIndex: 10, // Ensure it's above ScrollView content
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  avatarContainer: {
    position: "relative", // For positioning the edit icon
    marginRight: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#ddd",
  },
  avatarEditIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 5,
    borderRadius: 12,
  },
  username: {
    fontSize: 26,
    fontWeight: "bold",
    marginLeft: 20,
    flex: 1,
  },
  editButton: {
    padding: 8,
    marginLeft: 10,
  },
  editButtonContainer: {
    backgroundColor: "#eee",
    borderRadius: 15,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoSection: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionLabel: {
    fontWeight: "bold",
    fontSize: 18,
  },
  infoText: {
    fontSize: 16,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  interestChip: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestChipText: {
    fontSize: 14,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    height: "90%",
    borderRadius: 15,
    overflow: "hidden",
  },
  fullImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  actionIcon: {
    marginRight: 10,
  },
  actionButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  // --- Settings Menu Modal Styles ---
  settingsMenuOverlay: {
    // Can reuse modalOverlay or make specific
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Lighter overlay for menu
  },
  settingsMenuContainer: {
    position: "absolute",
    top: 55, // Position below the icon (adjust as needed)
    right: 15, // Align with the icon
    width: 180, // Adjust width as needed
    borderRadius: 8,
    borderWidth: 1,
    // backgroundColor, borderColor dynamically set
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  settingsMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  settingsMenuIcon: {
    marginRight: 15,
  },
  settingsMenuItemText: {
    fontSize: 16,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    // backgroundColor dynamically set
  },
});
