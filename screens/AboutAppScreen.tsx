// screens/AboutAppScreen.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext'; // Adjust path if needed
import { lightTheme, darkTheme } from '../themeColors'; // Adjust path if needed
import * as Application from 'expo-application'; // For App Version

export default function AboutAppScreen() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? darkTheme : lightTheme;
    const [appVersion, setAppVersion] = useState<string | null>(null);
    const [appName, setAppName] = useState<string | null>(null);

    // Set Header Title
    useEffect(() => {
        navigation.setOptions({ title: 'About Wimbli' }); // Set the header title for this screen
    }, [navigation]);

    // Get App Info on mount
    useEffect(() => {
        setAppVersion(Application.nativeApplicationVersion || 'N/A');
        // Use a fallback name if Application.applicationName isn't available or desired
        setAppName(Application.applicationName || 'Wimbli');
    }, []);

    return (
        // Use SafeAreaView for padding respecting notches/status bars
        <SafeAreaView style={[styles.screenContainer, { backgroundColor: currentTheme.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>

                {/* Logo Area */}
                 <View style={styles.logoContainer}>
                     <Image
                       source={require("../assets/wimbli-icon-bg.png")} // Ensure path is correct
                       style={styles.logoImage}
                     />
                     {/* Display App Name if available */}
                     {appName && <Text style={[styles.appName, { color: currentTheme.textPrimary }]}>{appName}</Text>}
                     {/* Display App Version */}
                     <Text style={[styles.versionText, { color: currentTheme.textSecondary }]}>
                        Version {appVersion}
                     </Text>
                </View>

                 {/* Description/Info Area */}
                <View style={styles.infoContainer}>
                    {/* Customize this description */}
                    <Text style={[styles.descriptionText, { color: currentTheme.textSecondary }]}>
                        Wimbli helps you discover local events and connect with people who share your interests. Create events, join group chats, and explore what's happening around you.
                    </Text>
                    {/* You could add more information here, like links to website, credits etc. */}
                     {/* Example:
                     <TouchableOpacity onPress={() => Linking.openURL('https://yourwebsite.com')}>
                         <Text style={[styles.linkText, { color: currentTheme.primary }]}>Visit our Website</Text>
                     </TouchableOpacity>
                     */}
                </View>

                {/* Copyright Notice */}
                <Text style={[styles.copyrightText, { color: currentTheme.textSecondary }]}>
                     © {new Date().getFullYear()} Wimbli. All rights reserved.
                </Text>

                 {/* Placeholder for Open Source Licenses Link (Optional) */}
                {/*
                 <TouchableOpacity style={{marginTop: 20}} onPress={() => {/* Navigate to Licenses Screen or open URL *}}>
                     <Text style={[styles.linkText, { color: currentTheme.primary }]}>
                         Open Source Licenses
                     </Text>
                 </TouchableOpacity>
                 */}

            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles --- (Inspired by Settings/Login/Signup for consistency)
const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1, // Ensure content can fill space if short, or scroll if long
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
        paddingVertical: 40, // Vertical padding
        paddingHorizontal: 30, // Horizontal padding
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoImage: {
        width: 110, // Make logo prominent
        height: 110,
        resizeMode: 'contain',
        marginBottom: 15,
    },
    appName: {
        fontSize: 26, // Slightly smaller than splash/login maybe
        fontWeight: 'bold',
        marginBottom: 6,
        // color set dynamically
    },
    versionText: {
        fontSize: 16, // Larger version text
        // color set dynamically
    },
    infoContainer: {
       marginVertical: 25, // Space around the description
       width: '100%', // Ensure text wraps within padding
    },
    descriptionText: {
        fontSize: 16, // Standard text size
        lineHeight: 24, // Good readability
        textAlign: 'center',
        // color set dynamically
    },
    copyrightText: {
        fontSize: 13, // Smaller copyright
        textAlign: 'center',
        marginTop: 40, // Push copyright towards bottom
        opacity: 0.7,
        // color set dynamically
    },
    linkText: { // Style for potential links like Licenses or Website
       fontSize: 15,
       fontWeight: '500',
       textAlign: 'center',
       // color set dynamically (primary)
    }
});