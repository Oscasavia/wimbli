import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Text, Alert
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import CheckBox from 'expo-checkbox';
import { FontAwesome } from '@expo/vector-icons';
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
    if (!agreed) return Alert.alert('You must agree to the Terms and Privacy Policy');
    if (password !== confirmPassword) return Alert.alert('Passwords do not match');

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCred.user, { displayName: username });
      navigation.replace('Interests');
    } catch (error: any) {
      Alert.alert('Signup failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <FontAwesome name="handshake-o" size={32} color="#00796B" />
        </View>
        <Text style={styles.appName}>Wimbli</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Create Your Account</Text>

        <View style={styles.inputContainer}>
        <FontAwesome name="user" size={20} color="#777" style={styles.inputIcon} />
        <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.textInput}
            placeholderTextColor="#888"
        />
        </View>

        <View style={styles.inputContainer}>
        <FontAwesome name="envelope" size={18} color="#777" style={styles.inputIcon} />
        <TextInput
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.textInput}
            placeholderTextColor="#888"
        />
        </View>

        <View style={styles.passwordContainer}>
            <FontAwesome name="lock" size={20} color="#777" style={styles.inputIcon} />
          <TextInput
            placeholder="Password"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
            style={styles.passwordInput}
            placeholderTextColor="#888"
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
            <FontAwesome
              name={passwordVisible ? 'eye-slash' : 'eye'}
              size={20}
              color="#777"
              style={styles.inputIcon}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
            <FontAwesome name="lock" size={20} color="#777" style={styles.inputIcon} />
          <TextInput
            placeholder="Confirm Password"
            secureTextEntry={!confirmPasswordVisible}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.passwordInput}
            placeholderTextColor="#888"
          />
          <TouchableOpacity onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}>
            <FontAwesome
              name={confirmPasswordVisible ? 'eye-slash' : 'eye'}
              size={20}
              color="#777"
              style={styles.inputIcon}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
          <CheckBox
            value={agreed}
            onValueChange={setAgreed}
            color={agreed ? '#00ACC1' : undefined}
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

        <Text style={styles.loginLink}>
          Already have an account?{' '}
          <Text
            style={{ textDecorationLine: 'underline', color: '#FF7043' }}
            onPress={() => navigation.navigate('Login')}
          >
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
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputIcon: {
    marginRight: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: 10,
    color: '#757575',
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    color: '#757575',
    textAlign: 'center',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
});
