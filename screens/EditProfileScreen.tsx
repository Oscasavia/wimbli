import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

const INTEREST_OPTIONS = [
  'Poetry', 'Tennis', 'Coding', 'Volunteering',
  'Live Music', 'Book Clubs', 'Photography',
  'Dancing', 'Spirituality', 'Outdoor Events'
];

export default function EditProfileScreen({ navigation }: any) {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [username, setUsername] = useState('');

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
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
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
      // For simplicity, we're storing the URI locally.
      // To persist images across sessions, you'd upload to Firebase Storage.
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
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={pickImage}>
        <Image
          source={
            profilePicture
              ? { uri: profilePicture }
              : require('../assets/default-profile.png')
          }
          style={styles.avatar}
        />
        <Text style={styles.changePhoto}>Change Photo</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Username</Text>
        <TextInput
        placeholder="Enter your username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        placeholder="Write something about yourself..."
        value={bio}
        onChangeText={setBio}
        multiline
        style={[styles.input, { height: 100 }]}
      />

      <Text style={styles.label}>Interests</Text>
      <View style={styles.chipContainer}>
        {INTEREST_OPTIONS.map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[styles.chip, interests.includes(interest) && styles.selectedChip]}
            onPress={() => toggleInterest(interest)}
          >
            <Text>{interest}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={saveChanges} style={styles.saveButton}>
        <Text style={styles.saveText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center' },
  changePhoto: { textAlign: 'center', color: '#007BFF', marginTop: 5 },
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
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
  },
  selectedChip: { backgroundColor: '#007BFF' },
  saveButton: {
    backgroundColor: '#007BFF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },
  saveText: { color: '#fff', fontWeight: 'bold' },
});
