import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar, // Import StatusBar
  ActivityIndicator // Added for initial check indication
} from "react-native";
import * as Animatable from 'react-native-animatable'; // Import Animatable
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import User type
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
// Assume RootStackParamList is defined in types.ts or similar
import { RootStackParamList } from "../types"; // Adjust path if needed
import { useTheme } from "../ThemeContext"; // Adjust path if needed
import { lightTheme, darkTheme } from "../themeColors"; // Adjust path if needed

// Define the specific navigation prop type
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Splash">;

const MIN_SPLASH_DURATION = 1500; // Minimum time splash is visible (in ms)

const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // State to track if minimum time has passed and auth check is done
  const [isTimerDone, setIsTimerDone] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [targetRoute, setTargetRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    // --- Timer ---
    const timer = setTimeout(() => {
      console.log("Splash Timer Done");
      setIsTimerDone(true);
    }, MIN_SPLASH_DURATION);

    // --- Auth Check ---
    const auth = getAuth();
    console.log("Setting up auth listener...");
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      console.log("Auth state received:", user ? `User(${user.uid})` : "No User");
      // Determine target route based on user state
      setTargetRoute(user ? "Main" : "Login"); // Assuming 'Main' is your authenticated stack root
      setIsAuthChecked(true); // Mark auth check as complete
    });

    // --- Cleanup ---
    return () => {
      clearTimeout(timer); // Clear timer if component unmounts early
      unsubscribe(); // Unsubscribe auth listener
      console.log("Splash cleanup done.");
    };
  }, []); // Run only once on mount

  // --- Navigation Effect ---
  // This effect runs when timer OR auth check completes
  useEffect(() => {
    console.log(`Checking navigation conditions: isTimerDone=${isTimerDone}, isAuthChecked=${isAuthChecked}, targetRoute=${targetRoute}`);
    // Navigate only when BOTH minimum time has passed AND auth check is complete AND we know where to go
    if (isTimerDone && isAuthChecked && targetRoute) {
       console.log(`Navigating to: ${targetRoute}`);
      navigation.replace('Login'); // Use replace to prevent going back to splash
    }
  }, [isTimerDone, isAuthChecked, targetRoute, navigation]); // Dependencies

  return (
    // Use View with themed background. SafeAreaView usually not needed for full splash.
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
       {/* Set status bar style based on theme */}
       <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={currentTheme.background} />

       {/* Use Animatable.View to animate the logo */}
       <Animatable.View
          animation="pulse" // Choose animation: pulse, bounceIn, fadeIn, etc.
          easing="ease-in-out" // Animation easing
          iterationCount="infinite" // Loop 'pulse', use 1 for 'bounceIn'/'fadeIn'
          duration={1200} // Animation duration per cycle
       >
         <Image
           source={require("../assets/wimbli-icon-bg.png")} // Ensure path is correct
           style={styles.logo}
         />
       </Animatable.View>

        {/* Optional: Subtle loading indicator while auth check runs */}
        {!isAuthChecked && (
            <ActivityIndicator
                size="small"
                color={currentTheme.textSecondary}
                style={styles.indicator}
            />
        )}

       {/* Optional Lottie Implementation (if preferred and installed) */}
       {/* Make sure to install `lottie-react-native` */}
       {/*
       <LottieView
         source={require("../assets/animations/wimbli-splash.json")} // Replace with your Lottie file path
         autoPlay
         loop={true} // Often loop on splash
         style={styles.lottie}
       />
       */}
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor applied dynamically
  },
  logo: {
    width: 100, // Slightly larger logo? Adjust as needed
    height: 100,
    resizeMode: "contain",
  },
  indicator: {
     position: 'absolute', // Position indicator below logo
     bottom: 50, // Adjust distance from bottom
  },
  // Styles for LottieView if used
  // lottie: {
  //   width: Dimensions.get("window").width * 0.6,
  //   height: Dimensions.get("window").width * 0.6,
  // },
});