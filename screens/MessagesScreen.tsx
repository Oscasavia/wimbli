import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Image,
} from 'react-native';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../themeColors';

type Group = {
  id: string;
  title: string;
  members: string[];
  lastMessage?: string;
  lastUpdated?: string;
};

export default function MessagesScreen({ navigation }: any) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const currentTheme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    const q = query(collection(db, 'groups'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userGroups: Group[] = snapshot.docs
        .filter(doc => doc.data().members.includes(auth.currentUser?.uid))
        .map(doc => ({
          id: doc.id,
          title: doc.data().title,
          members: doc.data().members,
          lastMessage: doc.data().lastMessage || '',
          lastUpdated: doc.data().lastUpdated || ''
        }));

      setGroups(userGroups);
    });

    return () => unsubscribe();
  }, []);

  const filteredGroups = groups.filter(group =>
    group.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
  
    return isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <Text style={styles.pageTitle}>Group Conversations</Text>
      <View style={styles.searchBar}>
        <FontAwesome name="search" size={18} color="#aaa" style={styles.searchIcon} />
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
            onPress={() => navigation.navigate('Chat', { groupId: item.id })}
          >
            <View style={styles.avatar}>
              <FontAwesome name="users" size={20} color="#fff" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.groupTitle}>{item.title}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage || 'No messages yet'}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {item.lastUpdated ? formatDate(item.lastUpdated) : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="comments-o" size={50} color="#ccc" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>You haven't joined any group chats yet.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
              <Text style={styles.discoverLink}>Discover Events</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#E0F7FA',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#00796B',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00796B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  groupTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#5A5A5A',
  },
  lastMessage: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  discoverLink: {
    marginTop: 12,
    color: '#007BFF',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
