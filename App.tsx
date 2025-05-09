// App.tsx (Revised Structure)
import React, { useEffect, useState, useRef } from "react"; // Removed useRef if unused
import { NavigationContainer } from "@react-navigation/native"; // Removed ref hook and actions if unused
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
// Keep AsyncStorage import only if you use it elsewhere
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Import ALL Screens ---
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import InterestsScreen from "./screens/InterestsScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import PostScreen from "./screens/PostScreen";
import AppTabs from "./AppNavigator";
import SplashScreen from "./screens/SplashScreen";
import WebViewScreen from "./screens/WebViewScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { ThemeProvider } from "./ThemeContext";
import { UnreadProvider } from "./UnreadContext";
import FullImageScreen from "./screens/FullImageScreen";
import SavedEventsScreen from "./screens/SavedEventsScreen";
import HelpAndSupportScreen from "./screens/HelpAndSupportScreen";
import AboutAppScreen from "./screens/AboutAppScreen";
import ChangePasswordScreen from "./screens/ChangePasswordScreen";
import Chat from "./screens/Chat";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initialRoute, setInitialRoute] = useState<
    "Splash" | "Login" | "Main" | null
  >(null);

  useEffect(() => {
    const init = async () => {
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (!hasLaunched) {
        setInitialRoute("Splash");
      } else {
        onAuthStateChanged(auth, (user) => {
          setUser(user);
          setInitialRoute(user ? "Main" : "Login");
        });
      }
    };
    init();
  }, []);

  if (initialRoute === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00796B" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <UnreadProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerShown: false,
              animation: "none",
              gestureEnabled: false,
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen name="WebView" component={WebViewScreen} />
            <Stack.Screen name="Main" component={AppTabs} />
            <Stack.Screen name="Chat" component={Chat} />
            <Stack.Screen name="Interests" component={InterestsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="EditPost" component={PostScreen} />
            <Stack.Screen name="FullImage" component={FullImageScreen} />
            <Stack.Screen name="SavedEvents" component={SavedEventsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
            />
            <Stack.Screen
              name="HelpAndSupport"
              component={HelpAndSupportScreen}
            />
            <Stack.Screen name="AboutApp" component={AboutAppScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </UnreadProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E0F7FA", // Match your theme
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#00796B", // Match your theme
  },
});
