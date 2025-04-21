import React, { useState, useEffect } from 'react';
import {
    View, TextInput, TouchableOpacity, StyleSheet, Text, Alert
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import CheckBox from 'expo-checkbox';
import { FontAwesome } from '@expo/vector-icons'; // Ensure this is imported
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignupScreen() {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const navigation = useNavigation<any>();

    const handleSignup = async () => {
        if (!agreed) {
            Alert.alert('You must agree to the Terms and Privacy Policy');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Passwords do not match');
            return;
        }

        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCred.user, { displayName: username });
            
            // await AsyncStorage.setItem('showInterests', 'true');
            navigation.replace('Interests');
        } catch (error: any) {
            Alert.alert('Signup failed', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign Up</Text>

            <TextInput
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                style={styles.textInput} // Use the new style
            />
            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                style={styles.textInput} // Use the new style
            />
            <View style={styles.passwordContainer}>
                <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    style={styles.passwordInput} // Specific style for password input
                />
                <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                >
                    <FontAwesome
                        name={passwordVisible ? 'eye-slash' : 'eye'}
                        size={20}
                        color="#757575"
                    />
                </TouchableOpacity>
            </View>
            <View style={styles.passwordContainer}>
                <TextInput
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!confirmPasswordVisible}
                    style={styles.passwordInput} // Specific style for confirm password input
                />
                <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                >
                    <FontAwesome
                        name={confirmPasswordVisible ? 'eye-slash' : 'eye'}
                        size={20}
                        color="#757575"
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.checkboxContainer}>
                <CheckBox
                    value={agreed}
                    onValueChange={setAgreed}
                    color={agreed ? '#007BFF' : undefined}
                />
                <Text style={styles.checkboxLabel}>
                    I agree to the{' '}
                    <Text
                        style={styles.linkText}
                        onPress={() => navigation.navigate('WebView', { url: 'https://cerulean-biscotti-582837.netlify.app/' })}
                    >
                        Terms
                    </Text>{' '}
                    and{' '}
                    <Text
                        style={styles.linkText}
                        onPress={() => navigation.navigate('WebView', { url: 'https://lovely-unicorn-a7167c.netlify.app/' })}
                    >
                        Privacy Policy
                    </Text>
                </Text>
            </View>

            <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
                <Text style={styles.signupButtonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>
                    Already have an account? <Text style={{ fontWeight: 'bold' }}>Log in</Text>
                </Text>
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
    textInput: { // Style for username and email inputs
        borderWidth: 1,
        borderColor: '#BDBDBD',
        padding: 15,
        marginBottom: 15,
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
        fontSize: 16,
        color: '#333',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#BDBDBD',
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
    },
    passwordInput: { // Style for the text input part of the password
        flex: 1,
        padding: 15,
        fontSize: 16,
        color: '#333',
    },
    eyeIcon: {
        padding: 15,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    checkboxLabel: {
        flex: 1,
        marginLeft: 10,
        color: '#424242',
        fontSize: 16,
    },
    linkText: {
        color: '#FF7043',
        textDecorationLine: 'underline',
    },
    signupButton: {
        backgroundColor: '#00ACC1',
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
    signupButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loginLink: {
        marginTop: 25,
        color: '#757575',
        textAlign: 'center',
        fontSize: 16,
    },
});