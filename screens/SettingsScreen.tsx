import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../themeColors'; // Import theme colors
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'; // Import icons

export default function SettingsScreen() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? darkTheme : lightTheme;

    return (
        <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
            <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Settings</Text>

            {/* Dark Mode Setting */}
            <View style={[styles.settingItem, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.inputBorder }, styles.cardShadow]}>
                <View style={styles.settingLabelContainer}>
                    <Feather name="moon" size={24} color={currentTheme.textSecondary} style={styles.icon} />
                    <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Dark Mode</Text>
                </View>
                <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    thumbColor={isDark ? currentTheme.accent : currentTheme.primary}
                    trackColor={{ false: '#767577', true: currentTheme.primary }}
                />
            </View>

            {/* Account Settings (Placeholder for future) */}
            <View style={[styles.settingItem, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.inputBorder }, styles.cardShadow]}>
                <View style={styles.settingLabelContainer}>
                    <Feather name="user" size={24} color={currentTheme.textSecondary} style={styles.icon} />
                    <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Account</Text>
                </View>
                <TouchableOpacity onPress={() => console.log('Navigate to Account Settings')}>
                    <Feather name="chevron-right" size={24} color={currentTheme.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Notifications Settings (Placeholder for future) */}
            <View style={[styles.settingItem, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.inputBorder }, styles.cardShadow]}>
                <View style={styles.settingLabelContainer}>
                    <Feather name="bell" size={24} color={currentTheme.textSecondary} style={styles.icon} />
                    <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Notifications</Text>
                </View>
                <TouchableOpacity onPress={() => console.log('Navigate to Notification Settings')}>
                    <Feather name="chevron-right" size={24} color={currentTheme.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* About Section (Placeholder for future) */}
            <View style={[styles.settingItem, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.inputBorder }, styles.cardShadow]}>
                <View style={styles.settingLabelContainer}>
                    <MaterialCommunityIcons name="information-outline" size={24} color={currentTheme.textSecondary} style={styles.icon} />
                    <Text style={[styles.label, { color: currentTheme.textPrimary }]}>About</Text>
                </View>
                <TouchableOpacity onPress={() => console.log('Navigate to About')}>
                    <Feather name="chevron-right" size={24} color={currentTheme.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
    },
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 18,
        marginLeft: 15,
    },
    icon: {
        marginRight: 10,
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
});