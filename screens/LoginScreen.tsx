import React, { useState } from 'react';
import {
    View, TextInput, TouchableOpacity, StyleSheet, Text, Alert
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons'; // Ensure this is imported
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const navigation = useNavigation<any>();

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            await AsyncStorage.removeItem('Interests');
            navigation.replace('Main');
        } catch (error: any) {
            Alert.alert('Login failed', error.message);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Please enter your email first');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert('Reset email sent', 'Check your inbox to reset your password.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                style={styles.textInput}
            />
            <View style={styles.passwordContainer}>
                <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    style={styles.passwordInput}
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

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotContainer} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>
                    Don't have an account? <Text style={{ fontWeight: 'bold' }}>Sign up</Text>
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
    textInput: {
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
    passwordInput: {
        flex: 1,
        padding: 15,
        fontSize: 16,
        color: '#333',
    },
    eyeIcon: {
        padding: 15,
    },
    forgotContainer: {
        marginTop: 10,
        marginBottom: 20,
        alignItems: 'center',
    },
    forgot: {
        color: '#FF7043',
        fontSize: 14,
    },
    loginButton: {
        backgroundColor: '#00ACC1',
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
    loginButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    signupLink: {
        marginTop: 25,
        color: '#757575',
        textAlign: 'center',
        fontSize: 16,
    },
});