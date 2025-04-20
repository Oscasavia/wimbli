import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Button, Alert, TouchableOpacity
} from 'react-native';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const INTEREST_OPTIONS = [
  'Poetry', 'Tennis', 'Coding', 'Volunteering',
  'Live Music', 'Book Clubs', 'Photography',
  'Dancing', 'Spirituality', 'Outdoor Events'
];

export default function PostScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [fee, setFee] = useState('');
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const editPost = route.params?.editPost || null;

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setDescription(editPost.description);
      setCategory(editPost.category);
      setLocation(editPost.location);
      setFee(editPost.fee?.toString() || '');
      setDate(new Date(editPost.date));
    }
  }, [editPost]);

  useFocusEffect(
    useCallback(() => {
      if (!editPost) {
        setTitle('');
        setDescription('');
        setCategory('');
        setLocation('');
        setDate(new Date());
        setFee('');
      }
    }, [editPost])
  );

  const handlePost = async () => {
    if (!title || !description || !category || !location || !date) {
      Alert.alert('Please fill out all required fields');
      return;
    }
  
    try {
      const userId = auth.currentUser?.uid;
  
      const postData = {
        title,
        description,
        category,
        location,
        date: date.toISOString(),
        fee: parseFloat(fee) || 0,
        createdBy: userId || 'anonymous',
      };
  
      if (editPost) {
        // Update existing post
        await setDoc(doc(db, 'posts', editPost.id), {
          ...postData,
          updatedAt: serverTimestamp(),
        }, { merge: true });
  
        Alert.alert('Post updated!', 'Your changes have been saved.');
      } else {
        // Create new post
        await addDoc(collection(db, 'posts'), {
          ...postData,
          createdAt: serverTimestamp(),
        });
  
        Alert.alert('Post created!', 'Your event has been added.');
      }
  
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const openDatePicker = () => {
    DateTimePickerAndroid.open({
      value: date,
      mode: 'datetime',
      is24Hour: true,
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) {
          setDate(selectedDate);
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{editPost ? 'Edit Post' : 'Create a New Post'}</Text>

      <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, { height: 80 }]}
        multiline
      />
      <TextInput placeholder="Location" value={location} onChangeText={setLocation} style={styles.input} />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipContainer}>
        {INTEREST_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setCategory(option)}
            style={[styles.chip, category === option && styles.selectedChip]}
          >
            <Text>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Date & Time</Text>
      <TouchableOpacity onPress={openDatePicker} style={styles.input}>
        <Text>{date.toLocaleString()}</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Fee (leave blank for free)"
        value={fee}
        onChangeText={setFee}
        keyboardType="numeric"
        style={styles.input}
      />

<Button title={editPost ? 'Update' : 'Post'} onPress={handlePost} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  chip: {
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
  },
  selectedChip: { backgroundColor: '#007BFF' },
  label: { fontWeight: '600', marginTop: 10, marginBottom: 5 },
});
