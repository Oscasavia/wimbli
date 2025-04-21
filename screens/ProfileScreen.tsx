import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, FlatList, Modal, Alert,
} from 'react-native';
import { auth, db } from '../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../themeColors';
import { Feather, MaterialIcons } from '@expo/vector-icons'; // For icons
import { SafeAreaView } from 'react-native-safe-area-context'; // For status bar awareness

export default function ProfileScreen() {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? darkTheme : lightTheme;

    const toggleModal = () => {
        setModalVisible(!isModalVisible);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigation.replace('Login');
        } catch (error: any) {
            Alert.alert('Logout Error', error.message);
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action is irreversible.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const user = auth.currentUser;
                        if (user) {
                            try {
                                const uid = user.uid;
                                await deleteDoc(doc(db, 'users', uid));
                                await deleteUser(user);
                                navigation.replace('Signup');
                            } catch (error: any) {
                                Alert.alert('Delete Account Error', error.message);
                            }
                        }
                    },
                },
            ],
            { cancelable: false }
        );
    };

    useFocusEffect(
        useCallback(() => {
            const fetchUser = async () => {
                try {
                    const uid = auth.currentUser?.uid;
                    if (!uid) return;

                    const docSnap = await getDoc(doc(db, 'users', uid));
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    }

                    setLoading(false);
                } catch (error) {
                    console.error('Error loading profile:', error);
                }
            };

            fetchUser();
        }, [])
    );

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: currentTheme.background }]}>
                <ActivityIndicator size="large" color={currentTheme.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.background }]}>
            <ScrollView style={styles.container}>
                {/* Profile Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={toggleModal}>
                        <Image
                            source={
                                userData?.profilePicture
                                    ? { uri: userData.profilePicture }
                                    : require('../assets/default-profile.png')
                            }
                            style={styles.avatar}
                        />
                    </TouchableOpacity>
                    <Text style={[styles.username, { color: currentTheme.textPrimary }]}>
                        {auth.currentUser?.displayName || 'Not set'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('EditProfile')}
                        style={styles.editButton}
                    >
                        <View style={styles.editButtonContainer}>
                            <Feather name="edit" size={20} color={currentTheme.textSecondary} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Email Section */}
                <View style={[styles.infoSection, { backgroundColor: currentTheme.inputBackground, ...styles.cardShadow }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="email" size={20} color={currentTheme.textSecondary} style={styles.sectionIcon} />
                        <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>Email</Text>
                    </View>
                    <Text style={[styles.infoText, { color: currentTheme.textSecondary }]}>{auth.currentUser?.email}</Text>
                </View>

                {/* Bio Section */}
                <View style={[styles.infoSection, { backgroundColor: currentTheme.inputBackground, ...styles.cardShadow }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="user" size={20} color={currentTheme.textSecondary} style={styles.sectionIcon} />
                        <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>Bio</Text>
                    </View>
                    <Text style={[styles.bioText, { color: currentTheme.textSecondary }]}>
                        {userData?.bio || 'No bio yet'}
                    </Text>
                </View>

                {/* Interests Section */}
                <View style={[styles.infoSection, { backgroundColor: currentTheme.inputBackground, ...styles.cardShadow }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="tag" size={20} color={currentTheme.textSecondary} style={styles.sectionIcon} />
                        <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>Interests</Text>
                    </View>
                    <View style={styles.interestsContainer}>
                        {userData?.interests?.map((item: string) => (
                            <View
                                key={item}
                                style={[styles.interestChip, { backgroundColor: currentTheme.chipBackground }]}
                            >
                                <Text style={[styles.interestChipText, { color: currentTheme.chipText }]}>{item}</Text>
                            </View>
                        )) || <Text style={{ color: currentTheme.textSecondary }}>No interests selected yet.</Text>}
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity onPress={handleLogout} style={[styles.actionButton, { backgroundColor: currentTheme.secondary }]}>
                    <Feather name="log-out" size={20} color={currentTheme.buttonText} style={styles.actionIcon} />
                    <Text style={[styles.actionButtonText, { color: currentTheme.buttonText }]}>Logout</Text>
                </TouchableOpacity>

                {/* Delete Account Button */}
                <TouchableOpacity onPress={handleDeleteAccount} style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}>
                    <Feather name="trash-2" size={20} color={currentTheme.buttonText} style={styles.actionIcon} />
                    <Text style={[styles.actionButtonText, { color: currentTheme.buttonText }]}>Delete Account</Text>
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
                                        : require('../assets/default-profile.png')
                                }
                                style={styles.fullImage}
                                resizeMode="contain"
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 2,
        borderColor: '#ddd',
    },
    username: {
        fontSize: 26,
        fontWeight: 'bold',
        marginLeft: 20,
        flex: 1,
    },
    editButton: {
        padding: 8,
    },
    editButtonContainer: {
        backgroundColor: '#eee',
        borderRadius: 15,
        padding: 8,
        shadowColor: '#000',
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
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionIcon: {
        marginRight: 10,
    },
    sectionLabel: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    infoText: {
        fontSize: 16,
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        height: '90%',
        borderRadius: 15,
        overflow: 'hidden',
    },
    fullImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 20,
    },
    actionIcon: {
        marginRight: 10,
    },
    actionButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
});