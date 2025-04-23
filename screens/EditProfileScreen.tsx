import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../themeColors';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const INTEREST_OPTIONS = [
    'Poetry', 'Tennis', 'Coding', 'Volunteering',
    'Live Music', 'Book Clubs', 'Photography',
    'Dancing', 'Spirituality', 'Outdoor Events',
    'Art', 'Sports', 'Games', 'Electronics',
    'Automotive', 'Garden', 'Academics', 'Medical',
    'Beauty', 'Pet', 'Food', 'Clothes'
];

export default function EditProfileScreen({ navigation }: any) {
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [bio, setBio] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [username, setUsername] = useState('');
    const [isModalVisible, setModalVisible] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? darkTheme : lightTheme;

    const toggleModal = () => {
        setModalVisible(!isModalVisible);
    };

    useEffect(() => {
        const loadUser = async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;

            const docSnap = await getDoc(doc(db, 'users', uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setBio(data.bio || '');
                setInterests(data.interests || []);
                setProfilePicture(data.profilePicture || null);
                setUsername(data.username || auth.currentUser?.displayName || '');
            }
        };

        loadUser();
    }, []);

    const toggleInterest = (interest: string) => {
        setInterests((prev) =>
            prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
        );
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 1,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setProfilePicture(uri);
        }
    };

    const saveChanges = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        try {
            await updateProfile(auth.currentUser!, { displayName: username });
            await setDoc(doc(db, 'users', uid), {
                bio,
                interests,
                profilePicture,
                username,
            }, { merge: true });

            Alert.alert('Success', 'Profile updated!');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: currentTheme.background }]}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                <Image
                    source={
                        profilePicture
                            ? { uri: profilePicture }
                            : require('../assets/default-profile.png')
                    }
                    style={styles.avatar}
                />
                <Text style={[styles.changePhoto, { color: currentTheme.primary }]}>Change Photo</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Username</Text>
            <TextInput
                placeholder="Enter your username"
                value={username}
                onChangeText={setUsername}
                style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.textPrimary }, styles.cardShadow]}
                placeholderTextColor={currentTheme.textSecondary}
            />

            <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Bio</Text>
            <TextInput
                placeholder="Write something about yourself..."
                value={bio}
                onChangeText={setBio}
                multiline
                style={[styles.input, { height: 100, backgroundColor: currentTheme.inputBackground, color: currentTheme.textPrimary }, styles.cardShadow]}
                placeholderTextColor={currentTheme.textSecondary}
            />

            <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Interests</Text>
            <View style={[styles.chipContainer, styles.cardShadow, { backgroundColor: currentTheme.inputBackground, padding: 10, borderRadius: 8 }]}>
                {INTEREST_OPTIONS.map((interest) => (
                    <TouchableOpacity
                        key={interest}
                        style={[
                            styles.chip,
                            interests.includes(interest) && styles.selectedChip,
                            { backgroundColor: currentTheme.chipBackground },
                        ]}
                        onPress={() => toggleInterest(interest)}
                    >
                        <Text style={[styles.chipText, { color: currentTheme.textPrimary }, interests.includes(interest) && styles.selectedChipText]}>
                            {interest}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity onPress={saveChanges} style={[styles.saveButton, { backgroundColor: currentTheme.primary }, styles.cardShadow]}>
                <Text style={[styles.saveText, { color: currentTheme.buttonText }]}>Save Changes</Text>
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
                                profilePicture
                                    ? { uri: profilePicture }
                                    : require('../assets/default-profile.png')
                            }
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    avatarContainer: { alignItems: 'center', marginBottom: 20 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    changePhoto: { textAlign: 'center', marginTop: 5 },
    label: { marginTop: 20, fontWeight: 'bold' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 8,
        marginTop: 8,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 10,
        
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        margin: 4,
        borderWidth: 1, // Add a border for better visibility when not selected
        borderColor: '#ccc',
    },
    selectedChip: {
        backgroundColor: '#FF7043',
        borderColor: '#FF7043',
    },
    chipText: {
        color: '#fff', // Default text color
    },
    selectedChipText: {
        color: '#000000',
    },
    saveButton: {
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 30,
    },
    saveText: { fontWeight: 'bold' },
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
});