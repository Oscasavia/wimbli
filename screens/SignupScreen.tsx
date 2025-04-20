import React, { useState } from 'react';
import {
  View, TextInput, Button, StyleSheet, Text, Alert, TouchableOpacity
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import CheckBox from 'expo-checkbox';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
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
      navigation.replace('Interests');
    } catch (error: any) {
      Alert.alert('Signup failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <TextInput placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={styles.input} />

      <View style={styles.checkboxContainer}>
        <CheckBox value={agreed} onValueChange={setAgreed} color={agreed ? '#007BFF' : undefined} />
        <Text style={styles.checkboxLabel}>
          I agree to the{' '}
          <Text style={styles.linkText} onPress={() => navigation.navigate('WebView', { url: 'https://cerulean-biscotti-582837.netlify.app/' })}>
            Terms
          </Text>{' '}
          and{' '}
          <Text style={styles.linkText} onPress={() => navigation.navigate('WebView', { url: 'https://lovely-unicorn-a7167c.netlify.app/' })}>
            Privacy Policy
          </Text>
        </Text>
      </View>

      <Button title="Sign Up" onPress={handleSignup} />
      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
        Already have an account? Log in
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  checkboxLabel: { flex: 1, marginLeft: 8 },
  link: { marginTop: 15, color: '#007BFF', textAlign: 'center' },
  linkText: { color: '#007BFF', textDecorationLine: 'underline' },
});
