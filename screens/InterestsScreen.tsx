import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TouchableOpacity as ButtonOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const INTEREST_OPTIONS = [
    'Poetry', 'Tennis', 'Coding', 'Volunteering',
    'Live Music', 'Book Clubs', 'Photography',
    'Dancing', 'Spirituality', 'Outdoor Events',
    'Art', 'Sports', 'Games', 'Electronics',
    'Automotive', 'Garden', 'Academics', 'Medical',
    'Beauty', 'Pet', 'Food', 'Clothes'
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

            navigation.replace('Main');
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
                        <Text style={[styles.chipText, selected.includes(item) && styles.selectedChipText]}>{item}</Text>
                    </TouchableOpacity>
                )}
            />
            <ButtonOpacity
                style={[styles.continueButton, selected.length === 0 && styles.disabledButton]}
                onPress={saveInterests}
                disabled={selected.length === 0}
            >
                <Text style={styles.continueButtonText}>Continue</Text>
            </ButtonOpacity>
            <TouchableOpacity onPress={async () => {
                try {
                    const userId = auth.currentUser?.uid;
                    if (!userId) return;

                    await setDoc(doc(db, 'users', userId), {
                        interests: [],
                    }, { merge: true });

                    navigation.replace('Main');
                } catch (error: any) {
                    Alert.alert('Error skipping interests', error.message);
                }
            }}>
                <Text style={styles.skip}>Skip for now</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 30,
        backgroundColor: '#E0F7FA',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 30,
        color: '#00796B',
    },
    chip: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#BDBDBD',
        margin: 8,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
    },
    selectedChip: {
        backgroundColor: '#FF7043',
        borderColor: '#FF7043',
    },
    chipText: {
        color: '#424242',
        fontSize: 16,
    },
    selectedChipText: {
        color: 'white',
    },
    continueButton: {
        backgroundColor: '#00ACC1',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    continueButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
    },
    skip: {
        marginTop: 25,
        color: '#757575',
        textAlign: 'center',
        fontSize: 16,
    },
});