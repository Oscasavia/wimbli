// AppNavigator.tsx (Upgraded UI)
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons"; // Use Feather consistently
import {
  View, // Keep View for potential custom elements if needed later
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text, // Added for potential custom labels
} from "react-native";
import { useTheme } from "./ThemeContext"; // Adjust path if needed
import { lightTheme, darkTheme } from "./themeColors"; // Adjust path if needed

// Import Screen Components
import HomeScreen from "./screens/HomeScreen";
import PostScreen from "./screens/PostScreen";
import ManagePostsScreen from "./screens/ManagePostsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SettingsScreen from "./screens/SettingsScreen"; // Added back
import MessagesScreen from "./screens/MessagesScreen";

const Tab = createBottomTabNavigator();

export default function AppNavigator() { // Or AppTabs
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;

  // Define theme colors with fallbacks for clarity
  const activeColor = currentTheme.primary || (isDark ? darkTheme.primary : lightTheme.primary);
  const inactiveColor = currentTheme.textSecondary || (isDark ? '#a0a0a0' : 'gray');
  const barBackgroundColor = currentTheme.cardBackground || (isDark ? '#1c1c1e' : '#ffffff');
  const topBorderColor = currentTheme.separator || (isDark ? '#3a3a3c' : '#e0e0e0');
  const createButtonBg = currentTheme.primary || (isDark ? darkTheme.primary : lightTheme.primary);
  const createButtonIconColor = currentTheme.buttonText || '#ffffff';
  const shadowColor = currentTheme.shadowColor || '#000';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Keep headers managed by individual screens or stack navigators
        tabBarShowLabel: true, // **Enable labels**
        tabBarStyle: {
          // --- Style the Tab Bar ---
          // position: 'absolute', // Keep floating style if desired
          // bottom: Platform.OS === 'ios' ? 20 : 15, // Adjust vertical position
          // left: 15,
          // right: 15,
          height: Platform.OS === 'ios' ? 60 : 55, // Adjust height (consider labels)
          // borderTopRightRadius: 15, // Add rounding
          // borderTopLeftRadius: 15,
          backgroundColor: barBackgroundColor,
          // borderTopWidth: 1, // Use border instead of just shadow sometimes
          borderTopColor: topBorderColor,
          // Shadow (adjust as needed)
          shadowColor: shadowColor,
          shadowOffset: {
            width: 0,
            height: -2, // Shadow upwards for bottom bar
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600', // Make labels slightly bolder
          marginBottom: Platform.OS === 'ios' ? 0 : 5, // Adjust label spacing
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home'; // Default icon
          const iconSize = focused ? size + 1 : size; // Slightly larger when focused

          switch (route.name) {
            case "Home":
              iconName = "home";
              break;
            case "Posts": // ManagePostsScreen
              iconName = "list"; // or 'archive', 'folder'
              break;
            case "Create":
              // Custom button handles its own icon
              return null; // Return null for icon here, handled by tabBarButton
            case "Messages":
              iconName = "message-square"; // Use Feather's message icon
              break;
            case "Profile":
              iconName = "user";
              break;
            // Add Settings back if needed
             case "Settings":
               iconName = "settings";
               break;
            default:
              iconName = "circle"; // Fallback Feather icon
          }

          // Return Feather icon for standard tabs
          return <Feather name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      {/* Define Tab Screens */}
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Posts" component={ManagePostsScreen} options={{ title: 'My Posts'}}/>

      {/* Middle Create Button */}
      <Tab.Screen
        name="Create"
        component={PostScreen}
        options={{
          tabBarLabel: () => null, // Hide label for the central button
          tabBarButton: (props) => (
            <TouchableOpacity
              style={[
                  styles.createButtonWrapper,
                  // Add shadow using theme color if needed
                  // styles.createButtonShadow, { shadowColor }
              ]}
              onPress={props.onPress} // Use onPress from props
              activeOpacity={0.8}
            >
               <View style={[styles.createButton, { backgroundColor: createButtonBg }]}>
                  <Feather name="plus" size={28} color={createButtonIconColor} />
               </View>
            </TouchableOpacity>
          ),
        }}
      />

      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
       {/* Add Settings back if needed */}
       {/* <Tab.Screen name="Settings" component={SettingsScreen} /> */}
    </Tab.Navigator>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  createButtonWrapper: { // Wrapper to help with positioning/shadow if needed
      flex: 1, // Take up tab space
      alignItems: 'center',
      // backgroundColor: 'transparent', // Can help avoid layout issues
  },
  createButton: {
    // Position button slightly elevated
    top: -25, // Adjust elevation amount
    width: 65, // Slightly smaller FAB
    height: 65,
    borderRadius: 32.5, // Keep it circular
    backgroundColor: '#00ACC1', // Set dynamically
    justifyContent: 'center',
    alignItems: 'center',
    // Enhanced Shadow/Elevation
    shadowColor: '#000', // Set dynamically
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    // Optional: Add a border matching the bar background for a cutout effect
    // borderWidth: 3,
    // borderColor: barBackgroundColor, // Use the theme color
  },
  // Optional shadow style for wrapper if needed
  // createButtonShadow: {
  //   shadowColor: "#000",
  //   shadowOffset: { width: 0, height: 5 },
  //   shadowOpacity: 0.3,
  //   shadowRadius: 5,
  //   elevation: 8,
  // },
});