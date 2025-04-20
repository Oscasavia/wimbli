import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { ActivityIndicator, View, Text } from 'react-native';

// Screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import InterestsScreen from './screens/InterestsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import PostScreen from './screens/PostScreen';
import AppTabs from './AppNavigator'; // your bottom tab navigator

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={AppTabs} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="EditPost" component={PostScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Interests" component={InterestsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
