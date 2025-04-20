import React, { useState } from 'react';
import {
  View, TextInput, Button, StyleSheet, Text, Alert, TouchableOpacity
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('Home');
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

      <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgot}>Forgot password?</Text>
      </TouchableOpacity>

      <Button title="Login" onPress={handleLogin} />

      <Text style={styles.link} onPress={() => navigation.navigate('Signup')}>
        Don't have an account? Sign up
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  link: { marginTop: 15, color: '#007BFF', textAlign: 'center' },
  forgot: { color: '#007BFF', marginBottom: 10, textAlign: 'right' },
});
