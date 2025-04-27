import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { FontAwesome } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";

type Group = {
  id: string;
  title: string;
  members: string[];
  lastMessage?: string;
  lastUpdated?: string;
  isUnread?: boolean;
};

export default function MessagesScreen({ navigation }: any) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;
  const groupSnapshotRef = useRef<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "groups"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      groupSnapshotRef.current = snapshot.docs;
      await evaluateUnreadStatus();
      const localData: Group[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (!data.members.includes(auth.currentUser?.uid)) continue;

        const lastUpdated = data.lastUpdated || "";
        const lastSeenKey = `lastSeen_${docSnap.id}`;
        const lastSeen = await AsyncStorage.getItem(lastSeenKey);
        const isUnread = lastSeen
          ? new Date(lastUpdated) > new Date(lastSeen)
          : !!lastUpdated;

        localData.push({
          id: docSnap.id,
          title: data.title,
          members: data.members,
          lastMessage: data.lastMessage || "",
          lastUpdated,
          isUnread,
        });
      }

      const sorted = localData.sort((a, b) => {
        const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return bTime - aTime;
      });

      setGroups(sorted);
    });

    return () => unsubscribe();
  }, []);

  const evaluateUnreadStatus = useCallback(async () => {
    const localData: Group[] = [];

    for (const docSnap of groupSnapshotRef.current) {
      const data = docSnap.data();
      if (!data.members.includes(auth.currentUser?.uid)) continue;

      const lastUpdated = data.lastUpdated || "";
      const lastSeenKey = `lastSeen_${docSnap.id}`;
      const lastSeen = await AsyncStorage.getItem(lastSeenKey);
      const isUnread = lastSeen
        ? new Date(lastUpdated) > new Date(lastSeen)
        : !!lastUpdated;

      localData.push({
        id: docSnap.id,
        title: data.title,
        members: data.members,
        lastMessage: data.lastMessage || "",
        lastUpdated,
        isUnread,
      });
    }

    const sorted = localData.sort((a, b) => {
      const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return bTime - aTime;
    });

    setGroups(sorted);
  }, []);

  useFocusEffect(
    useCallback(() => {
      evaluateUnreadStatus();
    }, [evaluateUnreadStatus])
  );

  const filteredGroups = groups.filter((group) =>
    group.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
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
      return date.toLocaleDateString([], { month: "short", day: "numeric" }); // e.g. Mar 20
    }
  };

  const handleOpenChat = async (groupId: string) => {
    await AsyncStorage.setItem(`lastSeen_${groupId}`, new Date().toISOString());
    navigation.navigate("Chat", { groupId });
  };

  return (
    <LinearGradient
      colors={["#E0F7FA", "#F5FDFD", "#ffffff"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={[styles.container]}>
        <Text style={styles.pageTitle}>Group Conversations</Text>
        <View style={styles.searchBar}>
          <FontAwesome
            name="search"
            size={18}
            color="#aaa"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search chats..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleOpenChat(item.id)}
            >
              <View style={styles.avatar}>
                <FontAwesome name="users" size={20} color="#fff" />
              </View>
              <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                  <Text style={styles.groupTitle}>{item.title}</Text>
                  {item.isUnread && <View style={styles.unreadDot} />}
                </View>
                <Text
                  style={[
                    styles.lastMessage,
                    item.isUnread && {
                      fontWeight: "bold",
                      color: currentTheme.textPrimary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage || "No messages yet"}
                </Text>
              </View>
              <Text style={styles.dateText}>
                {item.lastUpdated ? formatDate(item.lastUpdated) : ""}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome
                name="comments-o"
                size={50}
                color="#ccc"
                style={{ marginBottom: 10 }}
              />
              <Text style={styles.emptyText}>
                You haven't joined any group chats yet.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Home")}>
                <Text style={styles.discoverLink}>Discover Events</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  pageTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#00796B",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: { marginRight: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00796B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  groupTitle: { fontWeight: "bold", fontSize: 16, color: "#5A5A5A" },
  lastMessage: { color: "#888", fontSize: 14, marginTop: 2 },
  dateText: { fontSize: 12, color: "#888", marginLeft: 8 },
  emptyContainer: {
    marginTop: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  discoverLink: {
    marginTop: 12,
    color: "#FF7043",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    // justifyContent: 'space-between',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007AFF", // iOS-style blue
    marginLeft: 8,
  },
});
