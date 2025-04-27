import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function ManagePostsScreen() {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(collection(db, "posts"), where("createdBy", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userPosts: any[] = [];
      snapshot.forEach((doc) => userPosts.push({ id: doc.id, ...doc.data() }));
      setPosts(userPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteDoc(doc(db, "posts", id)),
      },
    ]);
  };

  const renderPost = ({ item }: { item: any }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: "#f9f9f9", borderColor: currentTheme.inputBorder },
      ]}
    >
      {/* <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.cardDateTime, { color: currentTheme.textSecondary }]}>
                {new Date(item.date).toLocaleString()}
            </Text> */}
      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>
          {item.title}
        </Text>
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
      </View>

      <Text style={[styles.cardDesc, { color: currentTheme.textPrimary }]}>
        {item.description}
      </Text>
      <View style={styles.separator} />
      <View style={styles.cardBottom}>
        <Text
          style={[styles.cardCategory, { color: currentTheme.textSecondary }]}
        >
          {item.category}
        </Text>
        <Text style={[styles.cardFee, { color: currentTheme.textSecondary }]}>
          {item.fee === 0 ? "Free" : `$${item.fee}`}
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: currentTheme.primary }]}
          onPress={() => navigation.navigate("EditPost", { editPost: item })}
        >
          <Text style={[styles.buttonText, { color: currentTheme.buttonText }]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.deleteButton,
            { borderColor: "#FF6B6B", borderWidth: 1 },
          ]}
          onPress={() => confirmDelete(item.id)}
        >
          <Text style={[styles.buttonText, { color: "red" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View
        style={[styles.center, { backgroundColor: currentTheme.background }]}
      >
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={{ color: currentTheme.textSecondary }}>
          Loading your posts...
        </Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: currentTheme.background }]}
      >
        <Text style={[styles.title, { color: "#00796B" }]}>
          Manage Your Posts{" "}
        </Text>

        <View style={[styles.cardContainer, { backgroundColor: "#fff" }]}>
          <View style={[styles.center]}>
            <Text style={{ color: "#999", fontSize: 16 }}>
              You haven't posted anything yet.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient
      colors={["#E0F7FA", "#F5FDFD", "#ffffff"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={[styles.screen]}>
        <Text style={[styles.title, { color: "#00796B" }]}>
          Manage Your Posts{" "}
        </Text>

        <View style={[styles.cardContainer, { backgroundColor: "#fff" }]}>
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { backgroundColor: "#fff" }]}
            renderItem={renderPost}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  headerRow: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 6, // separate title from date nicely
  },
  cardDateTime: {
    fontSize: 13,
    color: "#666",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
    width: "100%",
  },
  list: { paddingBottom: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  // cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  // cardDateTime: { color: '#555', fontSize: 13, marginBottom: 8 },
  cardDesc: { marginTop: 8, fontSize: 15, lineHeight: 22, marginBottom: 10 },
  separator: { borderBottomWidth: 1, borderColor: "#ddd", marginBottom: 10 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardCategory: { fontSize: 14, color: "#555" },
  cardFee: { fontSize: 14, fontWeight: "bold", color: "#333" },
  buttonRow: {
    flexDirection: "row",
    marginTop: 15,
    justifyContent: "space-between",
  },
  editButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  deleteButton: {
    // backgroundColor: '#dc3545',
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    borderColor: "#dc3545",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
