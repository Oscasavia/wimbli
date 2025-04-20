import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { db, auth } from '../firebase';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

export default function ManagePostsScreen() {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(collection(db, 'posts'), where('createdBy', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userPosts: any[] = [];
      snapshot.forEach((doc) => userPosts.push({ id: doc.id, ...doc.data() }));
      setPosts(userPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const confirmDelete = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteDoc(doc(db, 'posts', id)),
      },
    ]);
  };

  const renderPost = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.meta}>{item.category} • {item.location}</Text>
      <Text style={styles.meta}>{new Date(item.date).toLocaleString()}</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditPost', { editPost: item })}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmDelete(item.id)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading your posts...</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.center}>
        <Text>You haven't posted anything yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={renderPost}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#f1f1f1',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  meta: { color: '#555', fontSize: 13, marginTop: 2 },
  buttonRow: { flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' },
  editButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
