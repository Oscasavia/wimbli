import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

const { width } = Dimensions.get('window');
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkFirstTime = async () => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      setTimeout(() => {
        if (!hasLaunched) {
          AsyncStorage.setItem('hasLaunched', 'true');
          navigation.replace('Signup');
        } else {
          navigation.replace('Login');
        }
      }, 3000); // animation duration
    };

    checkFirstTime();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <LottieView
          source={require('../assets/animations/wimbli-splash.json')}
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
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: width * 0.8,
    height: width * 0.8,
  },
});
