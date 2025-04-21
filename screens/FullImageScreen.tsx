// FullImageScreen.tsx
import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

interface RouteParams {
    imageUrl: string;
}

export default function FullImageScreen() {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { imageUrl } = route.params as RouteParams;

    return (
        <TouchableOpacity style={styles.container} onPress={() => navigation.goBack()}>
            <Image source={{ uri: imageUrl }} style={styles.fullImage} resizeMode="contain" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
});