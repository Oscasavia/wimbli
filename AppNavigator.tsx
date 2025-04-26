// AppNavigator.tsx (Simplified - Corrected Version)
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// Remove createNativeStackNavigator if not needed elsewhere in this file
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import the screen components for your tabs
import HomeScreen from './screens/HomeScreen';
import PostScreen from './screens/PostScreen';
import ManagePostsScreen from './screens/ManagePostsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import MessagesScreen from './screens/MessagesScreen';

const Tab = createBottomTabNavigator();
// const Stack = createNativeStackNavigator(); // Remove this

// Remove the Tabs function if it only wrapped the Tab.Navigator
// function Tabs() { ... }

// Export the Tab Navigator component directly
// You can keep the function name AppNavigator if you prefer,
// or rename it to AppTabs to match the import alias in App.tsx
export default function AppNavigator() { // Or rename to export default function AppTabs()
  return (
    // Return the Tab Navigator directly
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any; // Consider using more specific types like keyof Ionicons['name']
          switch (route.name) {
            case 'Home': iconName = 'home'; break;
            case 'Messages': iconName = 'chatbubble'; break;
            case 'Create': iconName = 'add-circle'; break;
            case 'Posts': iconName = 'document-text'; break;
            case 'Profile': iconName = 'person'; break;
            case 'Settings': iconName = 'settings'; break;
            default: iconName = 'ellipse'; // Fallback
          }
          // Ensure iconName type is compatible with Ionicons name prop
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00ACC1',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      {/* Your Tab Screens */}
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Create" component={PostScreen} />
      <Tab.Screen name="Posts" component={ManagePostsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {/* <Tab.Screen name="Settings" component={SettingsScreen} /> */}
    </Tab.Navigator>
  );
}