import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform
} from 'react-native';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../themeColors';
import { Picker } from '@react-native-picker/picker'; // Import Picker

const INTEREST_OPTIONS = [
    'Poetry', 'Tennis', 'Coding', 'Volunteering',
    'Live Music', 'Book Clubs', 'Photography',
    'Dancing', 'Spirituality', 'Outdoor Events',
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
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? darkTheme : lightTheme;

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
                await setDoc(doc(db, 'posts', editPost.id), {
                    ...postData,
                    updatedAt: serverTimestamp(),
                }, { merge: true });
                Alert.alert('Post updated!', 'Your changes have been saved.');
            } else {
                await addDoc(collection(db, 'posts'), {
                    ...postData,
                    createdAt: serverTimestamp(),
                });
                Alert.alert('Post created!', 'Your event has been added.');
            }

            navigation.navigate('Home');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const openDatePicker = () => {
        DateTimePickerAndroid.open({
            value: date,
            mode: 'date',
            is24Hour: true,
            onChange: (_, selectedDate) => {
                if (selectedDate) {
                  const updatedDate = new Date(selectedDate);
                  openTimePicker(updatedDate); // ⏱️ call time picker next
                }
            },
        });
    };

    const openTimePicker = (dateBase: Date) => {
        DateTimePickerAndroid.open({
          value: dateBase,
          mode: 'time',
          is24Hour: true,
          onChange: (_, selectedTime) => {
            if (selectedTime) {
              const combined = new Date(
                dateBase.getFullYear(),
                dateBase.getMonth(),
                dateBase.getDate(),
                selectedTime.getHours(),
                selectedTime.getMinutes()
              );
              setDate(combined);
            }
          },
        });
      };

    return (
        <ScrollView style={[styles.container, { backgroundColor: currentTheme.background }]}>
            <SafeAreaView>
            <Text style={[styles.title, { color: '#00796B' }]}>
                {editPost ? 'Edit Post' : 'Create a New Post'}
            </Text>

            <TextInput
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
                style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.textPrimary }, styles.cardShadow]}
                placeholderTextColor={currentTheme.textSecondary}
            />
            <TextInput
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                style={[styles.input, { height: 80, backgroundColor: currentTheme.inputBackground, color: currentTheme.textPrimary }, styles.cardShadow]}
                multiline
                placeholderTextColor={currentTheme.textSecondary}
            />
            <TextInput
                placeholder="Location"
                value={location}
                onChangeText={setLocation}
                style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.textPrimary }, styles.cardShadow]}
                placeholderTextColor={currentTheme.textSecondary}
            />

            <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Category</Text>
            <View style={[styles.pickerContainer, styles.cardShadow, { backgroundColor: currentTheme.inputBackground, borderRadius: 8, borderWidth: 1, borderColor: currentTheme.inputBorder }]}>
                <Picker
                    selectedValue={category}
                    style={[styles.picker, { color: currentTheme.textPrimary }]}
                    onValueChange={(itemValue) => setCategory(itemValue)}
                    dropdownIconColor={currentTheme.textPrimary} // Style the dropdown arrow
                >
                    <Picker.Item label="Select a category" value="" />
                    {INTEREST_OPTIONS.map((option) => (
                        <Picker.Item key={option} label={option} value={option} />
                    ))}
                </Picker>
            </View>

            <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Date & Time</Text>
            <TouchableOpacity onPress={openDatePicker} style={[styles.input, styles.cardShadow, { backgroundColor: currentTheme.inputBackground }]}>
                <Text style={{ color: currentTheme.textPrimary }}>{date.toLocaleString()}</Text>
            </TouchableOpacity>

            <TextInput
                placeholder="Fee (leave blank for free)"
                value={fee}
                onChangeText={setFee}
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.textPrimary }, styles.cardShadow]}
                placeholderTextColor={currentTheme.textSecondary}
            />

            <TouchableOpacity onPress={handlePost} style={[styles.postButton, { backgroundColor: currentTheme.primary }, styles.cardShadow]}>
                <Text style={[styles.postButtonText, { color: currentTheme.buttonText }]}>
                    {editPost ? 'Update' : 'Post'}
                </Text>
            </TouchableOpacity>
            </SafeAreaView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 10, },
    title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
    label: { fontWeight: '600', marginTop: 10, marginBottom: 5 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    pickerContainer: {
        marginBottom: 10,
        // No fixed height to allow label to be fully visible
    },
    picker: {
        height: Platform.OS === 'ios' ? 100 : 40, // Keep platform-specific height
        // No padding adjustments here initially
    },
    postButton: {
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    postButtonText: { color: '#fff', fontWeight: 'bold' },
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