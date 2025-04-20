import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { onAuthStateChanged } from 'firebase/auth';

type Post = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  fee: number;
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userId = user.uid;
  
        const unsubscribeUser = onSnapshot(collection(db, 'users'), (userSnap) => {
          const userDoc = userSnap.docs.find((doc) => doc.id === userId);
          const selectedInterests = userDoc?.data()?.interests || [];
          setInterests(selectedInterests);
  
          const unsubscribePosts = onSnapshot(collection(db, 'posts'), (postsSnap) => {
            let allPosts: Post[] = [];
  
            postsSnap.forEach((doc) => {
              const data = doc.data();
              const matchInterest = selectedInterests.length === 0 || selectedInterests.includes(data.category);
              const matchCategory = selectedCategory === 'All' || data.category === selectedCategory;
  
              if (matchInterest && matchCategory) {
                allPosts.push({ id: doc.id, ...data } as Post);
              }
            });
  
            const sorted = allPosts.sort((a, b) => {
              const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
              return sortOrder === 'asc' ? diff : -diff;
            });
  
            setPosts(sorted);
            setLoading(false);
            setRefreshing(false);
          });
  
          return unsubscribePosts;
        });
  
        return () => {
          unsubscribeUser();
        };
      } else {
        setLoading(false);
        alert('Not logged in. Please log in again.');
      }
    });
  
    return () => unsubscribeAuth();
  }, [selectedCategory, sortOrder]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500); // Just UI reset
  };

  if (!auth.currentUser?.uid) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Checking user account...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
        <Text style={styles.profileButtonText}>👤 View Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Post')} style={styles.postButton}>
        <Text style={styles.postButtonText}>+ Create Post</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ManagePosts')} style={styles.manageButton}>
        <Text style={styles.manageButtonText}>🛠 Manage My Posts</Text>
      </TouchableOpacity>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by category:</Text>
        <Picker
          selectedValue={selectedCategory}
          onValueChange={(itemValue) => setSelectedCategory(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="All" value="All" />
          {interests.map((interest) => (
            <Picker.Item key={interest} label={interest} value={interest} />
          ))}
        </Picker>

        <Text style={styles.filterLabel}>Sort by date:</Text>
        <Picker
          selectedValue={sortOrder}
          onValueChange={(itemValue) => setSortOrder(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Oldest First" value="asc" />
          <Picker.Item label="Newest First" value="desc" />
        </Picker>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text>Loading timeline...</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text>No nearby events match your interests... yet 🎯</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.category} • {item.location}</Text>
              <Text style={styles.meta}>
                {new Date(item.date).toLocaleString()} • {item.fee === 0 ? 'Free' : `$${item.fee}`}
              </Text>
              <Text style={styles.desc}>{item.description}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  postButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 10,
    margin: 10,
    alignItems: 'center',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  meta: { color: '#555', fontSize: 13, marginTop: 2 },
  desc: { marginTop: 8, fontSize: 15 },
  filterContainer: {
    paddingHorizontal: 15,
  },
  filterLabel: {
    fontWeight: '600',
    marginTop: 10,
  },
  picker: {
    backgroundColor: '#eee',
    marginBottom: 10,
  },
  profileButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  manageButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  manageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
