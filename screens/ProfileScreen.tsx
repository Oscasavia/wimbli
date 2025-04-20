import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
// import { useNavigation } from '@react-navigation/native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={
          userData?.profilePicture
            ? { uri: userData.profilePicture }
            : require('../assets/default-profile.png')
        }
        style={styles.avatar}
      />

    <Text style={styles.label}>Username:</Text>
    <Text style={styles.info}>{auth.currentUser?.displayName || 'Not set'}</Text>

      <Text style={styles.label}>Email:</Text>
      <Text style={styles.info}>{auth.currentUser?.email}</Text>

      <Text style={styles.label}>Password:</Text>
      <Text style={styles.info}>•••••••• (hidden)</Text>

      <Text style={styles.label}>Interests:</Text>
      <Text style={styles.info}>{userData?.interests?.join(', ') || 'None'}</Text>

      <Text style={styles.label}>Bio:</Text>
      <Text style={styles.info}>{userData?.bio || 'No bio yet'}</Text>

      <TouchableOpacity
        onPress={() => navigation.navigate('EditProfile')}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  label: { fontWeight: 'bold', fontSize: 16, alignSelf: 'flex-start', marginTop: 10 },
  info: { alignSelf: 'flex-start', fontSize: 15, marginBottom: 8 },
  button: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 10,
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
