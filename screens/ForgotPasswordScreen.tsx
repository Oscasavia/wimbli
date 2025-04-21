import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const navigation = useNavigation<any>();

    const handleReset = async () => {
        if (!email) {
            Alert.alert('Please enter your email');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert('Check your inbox', 'We’ve sent a password reset link to your email.');
            navigation.goBack(); // Send them back to login
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Reset Your Password</Text>
            <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetButtonText}>Send Reset Email</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backLink}>Back to Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
        backgroundColor: '#E0F7FA',
    },
    title: {
        fontSize: 28,
        marginBottom: 30,
        textAlign: 'center',
        color: '#00796B',
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderColor: '#BDBDBD',
        padding: 15,
        marginBottom: 25,
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
        fontSize: 16,
        color: '#333',
    },
    resetButton: {
        backgroundColor: '#FF7043', // Secondary orange
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    resetButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backLink: {
        marginTop: 25,
        textAlign: 'center',
        color: '#757575',
        fontSize: 16,
    },
});