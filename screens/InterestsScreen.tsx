import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Button, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const INTEREST_OPTIONS = [
  'Poetry', 'Tennis', 'Coding', 'Volunteering',
  'Live Music', 'Book Clubs', 'Photography',
  'Dancing', 'Spirituality', 'Outdoor Events'
];

export default function InterestsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const navigation = useNavigation<any>();

  const toggleInterest = (interest: string) => {
    setSelected((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const saveInterests = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await setDoc(doc(db, 'users', userId), {
        interests: selected,
      }, { merge: true });

      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert('Error saving interests', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Interests</Text>
      <FlatList
        data={INTEREST_OPTIONS}
        numColumns={2}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, selected.includes(item) && styles.selectedChip]}
            onPress={() => toggleInterest(item)}
          >
            <Text style={styles.chipText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
      <Button title="Continue" onPress={saveInterests} disabled={selected.length === 0} />
      <Text
        style={styles.skip}
        onPress={async () => {
            try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            await setDoc(doc(db, 'users', userId), {
                interests: [],
            }, { merge: true });

            navigation.replace('Home');
            } catch (error: any) {
            Alert.alert('Error skipping interests', error.message);
            }
        }}
        >
        Skip for now
        </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  chip: {
    flex: 1,
    backgroundColor: '#eee',
    margin: 5,
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  selectedChip: { backgroundColor: '#007BFF' },
  chipText: { color: '#333' },
  skip: { marginTop: 20, color: '#007BFF', textAlign: 'center' },
});
