import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './screens/HomeScreen';
import PostScreen from './screens/PostScreen';
import ManagePostsScreen from './screens/ManagePostsScreen';
import ProfileScreen from './screens/ProfileScreen';
// import SettingsScreen from './screens/SettingsScreen'; // Placeholder for now

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Messages':
              iconName = 'chatbubble';
              break;
            case 'Create':
              iconName = 'add-circle';
              break;
            case 'Posts':
              iconName = 'document-text';
              break;
            case 'Profile':
                iconName = 'person';
                break;
            case 'Settings':
              iconName = 'settings';
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007BFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      {/* <Tab.Screen name="Messages" component={ProfileScreen} /> */}
      <Tab.Screen name="Create" component={PostScreen} />
      <Tab.Screen name="Posts" component={ManagePostsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {/* <Tab.Screen name="Settings" component={SettingsScreen} /> */}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={Tabs} />
      </Stack.Navigator>
  );
}
