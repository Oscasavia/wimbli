import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";

const { width } = Dimensions.get("window");
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Splash">;

const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    const start = async () => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      await AsyncStorage.setItem("hasLaunched", "true");

      setTimeout(() => {
        navigation.replace("Login");
      }, 3000);
    };

    start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animated, { opacity: fadeAnim }]}>
        <LottieView
          ref={animationRef}
          source={require("../assets/animations/wimbli-splash.json")}
          autoPlay
          loop={false}
          style={styles.lottie}
        />
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
