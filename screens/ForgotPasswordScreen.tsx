import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

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
          {/* Logo + App Name */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <FontAwesome name="handshake-o" size={32} color="#00796B" />
            </View>
            <Text style={styles.appName}>Wimbli</Text>
          </View>
    
          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Reset Your Password</Text>
    
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color="#777" style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                style={styles.textInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
    
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Send Reset Email</Text>
            </TouchableOpacity>
    
            <Text style={styles.link}>
                Back to{' '}
                <Text style={{ textDecorationLine: 'underline', color: '#FF7043', }} onPress={() => navigation.navigate('Login')}>
                    Login
                </Text>
            </Text>
          </View>
        </View>
      );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E0F7FA',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#B2EBF2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#00796B',
    },
    card: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 25,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
        title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 25,
        textAlign: 'center',
        color: '#757575',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 20,
        backgroundColor: '#f9f9f9',
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    resetButton: {
        backgroundColor: '#FF7043',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    resetButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    link: {
        textAlign: 'center',
        color: '#757575',
    },
});