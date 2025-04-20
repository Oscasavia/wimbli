import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native';
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
      <Button title="Send Reset Email" onPress={handleReset} />
      <Text style={styles.backLink} onPress={() => navigation.goBack()}>
        Back to Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, borderRadius: 5 },
  backLink: { marginTop: 15, textAlign: 'center', color: '#007BFF' },
});
