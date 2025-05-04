import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Image } from "react-native";
import LottieView from "lottie-react-native";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";

const { width } = Dimensions.get("window");
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Splash">;

const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setTimeout(() => {
        if (user) {
          navigation.replace("Home"); // 👈 User is logged in
        } else {
          navigation.replace("Login"); // 👈 Not logged in
        }
      }, 3000); // ⏳ Duration of splash screen
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animated, { opacity: fadeAnim }]}>
        {/* <LottieView
          ref={animationRef}
          source={require("../assets/animations/wimbli-splash.json")}
          autoPlay
          loop={false}
          style={styles.lottie}
        /> */}
        <Image
          source={require("../assets/wimbli-icon-bg.png")}
          style={{ width: 70, height: 70, resizeMode: "contain" }}
        />
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F7FA",
    justifyContent: "center",
    alignItems: "center",
  },
  animated: {
    width: "100%",
    alignItems: "center",
  },
  lottie: {
    width: width * 0.8,
    height: width * 0.8,
  },
});
