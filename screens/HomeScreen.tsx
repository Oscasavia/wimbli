import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TouchableOpacity, RefreshControl, TextInput, Modal, ScrollView
} from 'react-native';
import { collection, onSnapshot, query, doc, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../themeColors';
import { Feather } from '@expo/vector-icons'; // For icons

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
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [distanceRadius, setDistanceRadius] = useState<'All' | '1km' | '5km' | '10km'>('All');
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? darkTheme : lightTheme;

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                const userId = user.uid;

                const unsubscribeUser = onSnapshot(doc(db, 'users', userId), (userDoc) => {
                    const selectedInterests = userDoc.data()?.interests || [];
                    setInterests(selectedInterests);
                });

                const postsQuery = query(collection(db, 'posts'));

                const unsubscribePosts = onSnapshot(postsQuery, (postsSnap) => {
                    let allPosts: Post[] = [];

                    postsSnap.forEach((doc) => {
                        const data = doc.data();
                        const matchInterest = interests.length === 0 || interests.includes(data.category);
                        const matchCategory = selectedCategory === 'All' || data.category === selectedCategory;
                        const searchTextLower = searchText.toLowerCase();
                        const matchSearch = !searchText || data.title.toLowerCase().includes(searchTextLower) || data.description.toLowerCase().includes(searchTextLower);

                        // In a real app, you would implement distance-based filtering here
                        const matchDistance = distanceRadius === 'All';

                        if (matchInterest && matchCategory && matchSearch && matchDistance) {
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

                return () => {
                    unsubscribeUser();
                    unsubscribePosts();
                };
            }
        });

        return () => unsubscribeAuth();
    }, [selectedCategory, sortOrder, searchText, interests, distanceRadius]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
    };

    const openModal = (post: Post) => {
        setSelectedPost(post);
        setModalVisible(true);
    };

    const handleJoinChat = async (post: Post | null) => {
        if (!post || !auth.currentUser) return;
      
        const userId = auth.currentUser.uid;
        const groupTitle = post.title;
      
        const groupRef = collection(db, 'groups');
        const q = query(groupRef, where('title', '==', groupTitle));
        const querySnapshot = await getDocs(q);
      
        let groupId = '';
      
        if (querySnapshot.empty) {
          // Create new group
          const docRef = await addDoc(groupRef, {
            title: groupTitle,
            createdAt: serverTimestamp(),
            members: [userId],
          });
          groupId = docRef.id;
        } else {
          // Use existing group
          const groupDoc = querySnapshot.docs[0];
          groupId = groupDoc.id;
      
          const members = groupDoc.data().members || [];
          if (!members.includes(userId)) {
            await addDoc(collection(db, 'groups', groupId, 'members'), {
              userId,
              joinedAt: serverTimestamp(),
            });
          }
        }
      
        // Navigate to Messages screen with this group
        navigation.navigate('Chat', {
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
            <View style={[styles.center, { backgroundColor: currentTheme.background }]}>
                <ActivityIndicator size="large" color={currentTheme.primary} />
                <Text style={{ color: currentTheme.textSecondary }}>Checking user account...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { flex: 1, backgroundColor: currentTheme.background }]}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Feather name="search" size={20} color={currentTheme.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: currentTheme.textPrimary, backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.inputBorder }]}
                    placeholder="Search events..."
                    placeholderTextColor={currentTheme.textSecondary}
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>

            {/* Filter and Sort */}
            <View style={styles.filterSortContainer}>
                <View style={styles.pickerContainer}>
                    <Text style={[styles.filterLabel, { color: currentTheme.textPrimary }]}>Category:</Text>
                    <Picker
                        selectedValue={selectedCategory}
                        onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                        style={[styles.picker, { color: currentTheme.textPrimary, backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.inputBorder }]}
                        dropdownIconColor={currentTheme.textPrimary}
                    >
                        <Picker.Item label="All" value="All" />
                        {interests.map((interest) => (
                            <Picker.Item key={interest} label={interest} value={interest} />
                        ))}
                    </Picker>
                </View>

                <View style={styles.pickerContainer}>
                    <Text style={[styles.filterLabel, { color: currentTheme.textPrimary }]}>Sort by:</Text>
                    <Picker
                        selectedValue={sortOrder}
                        onValueChange={(itemValue) => setSortOrder(itemValue)}
                        style={[styles.picker, { color: currentTheme.textPrimary, backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.inputBorder }]}
                        dropdownIconColor={currentTheme.textPrimary}
                    >
                        <Picker.Item label="Oldest First" value="asc" />
                        <Picker.Item label="Newest First" value="desc" />
                    </Picker>
                </View>

                <View style={styles.pickerContainer}>
                    <Text style={[styles.filterLabel, { color: currentTheme.textPrimary }]}>Distance:</Text>
                    <Picker
                        selectedValue={distanceRadius}
                        onValueChange={(itemValue) => setDistanceRadius(itemValue as 'All' | '1km' | '5km' | '10km')}
                        style={[styles.picker, { color: currentTheme.textPrimary, backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.inputBorder }]}
                        dropdownIconColor={currentTheme.textPrimary}
                    >
                        <Picker.Item label="All" value="All" />
                        <Picker.Item label="Within 1 km" value="1km" />
                        <Picker.Item label="Within 5 km" value="5km" />
                        <Picker.Item label="Within 10 km" value="10km" />
                    </Picker>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={currentTheme.primary} />
                    <Text style={{ color: currentTheme.textSecondary }}>Loading timeline...</Text>
                </View>
            ) : posts.length === 0 ? (
                <View style={styles.center}>
                    <Text
                        style={{ color: currentTheme.textSecondary }}>No nearby events match your interests... yet 🎯</Text>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => openModal(item)}>
                            <View style={[styles.card, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.inputBorder }, styles.cardShadow]}>
                                <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>{item.title}</Text>
                                <Text style={[styles.cardDateTime, { color: currentTheme.textSecondary }]}>
                                    {new Date(item.date).toLocaleString()}
                                </Text>
                                <Text style={[styles.cardDescShort, { color: currentTheme.textPrimary }]}>
                                    {item.description.length > 100 ? `${item.description.substring(0, 100)}...` : item.description}
                                </Text>
                                <View style={styles.separator} />
                                <View style={styles.cardBottom}>
                                    <Text style={[styles.cardCategory, { color: currentTheme.textSecondary }]}>{item.category}</Text>
                                    <Text style={[styles.cardFee, { color: currentTheme.textSecondary }]}>{item.fee === 0 ? 'Free' : `$${item.fee}`}</Text>
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
                <TouchableOpacity style={styles.modalOverlay} onPress={closeModal}>
                    <View style={[styles.modalContent, { backgroundColor: currentTheme.background, borderColor: currentTheme.inputBorder }]}>
                        {selectedPost && (
                            <ScrollView>
                                <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>{selectedPost.title}</Text>
                                <Text style={[styles.modalDateTime, { color: currentTheme.textSecondary }]}>
                                    {new Date(selectedPost.date).toLocaleString()}
                                </Text>
                                <Text style={[styles.modalDesc, { color: currentTheme.textPrimary }]}>{selectedPost.description}</Text>
                                <View style={styles.separator} />
                                <View style={styles.modalBottom}>
                                    <Text style={[styles.modalCategory, { color: currentTheme.textSecondary }]}>Category: {selectedPost.category}</Text>
                                    <Text style={[styles.modalFee, { color: currentTheme.textSecondary }]}>Fee: {selectedPost.fee === 0 ? 'Free' : `$${selectedPost.fee}`}</Text>
                                    <Text style={[styles.modalLocation, { color: currentTheme.textSecondary }]}>Location: {selectedPost.location}</Text>
                                </View>
                            </ScrollView>
                        )}
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: '#28a745', marginTop: 10 }]}
                            onPress={() => handleJoinChat(selectedPost)}
                            >
                            <Text style={[styles.closeButtonText, { color: '#fff' }]}>Join Chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.closeButton, { backgroundColor: currentTheme.secondary }]} onPress={closeModal}>
                            <Text style={[styles.closeButtonText, { color: currentTheme.buttonText }]}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 15,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
    },
    filterSortContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    pickerContainer: {
        flex: 1,
        marginRight: 10,
    },
    filterLabel: {
        fontWeight: '600',
        marginBottom: 5,
    },
    picker: {
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    list: {
        paddingBottom: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#f9f9f9',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    cardDateTime: {
        color: '#555',
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
        borderColor: '#eee',
        marginBottom: 10,
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardCategory: {
        fontSize: 14,
        color: '#555',
    },
    cardFee: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalDateTime: {
        color: '#555',
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
        fontWeight: 'bold',
        marginBottom: 5,
    },
    modalLocation: {
        fontSize: 16,
        marginBottom: 10,
    },
    closeButton: {
        backgroundColor: '#007bff',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});