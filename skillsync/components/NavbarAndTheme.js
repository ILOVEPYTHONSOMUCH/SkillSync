// src/components/NavbarAndTheme.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// --- Theme Colors ---
export const Colors = {
    backgroundLight: '#edffff',
    primaryDarkBlue: '#000066',
    secondaryDarkBlue: '#17296a',
    redPoints: '#c00',
    inputBackground: '#ddd',
    cardBackground: '#f1f1f1',
    textSecondary: '#666',
    textPrimary: '#333',
    accentGreen: '#4CAF50',
    accentYellow: '#FFC107',
    blackBackground: '#000', // For video container
    placeholderBackground: '#e0e0e0', // For video placeholder
    whiteOverlay: 'rgba(255,255,255,0.8)', // For play button overlay
    textMuted: '#888', // For comment placeholder text
    noPostsText: '#555', // Also used for statText
    borderLight: '#eee', // For statsRow border
    likeBlue: 'blue',
    dislikeRed: 'red',
    white: '#fff',
    borderColor: '#ccc', // For navBar borderTopColor
    navTextBlue: '#000d63', // For navText
};

export const subjectColors = {
    'Math': '#6a8eec',      // Softer, slightly muted blue
    'Physics': '#d9534f',   // Muted, slightly desaturated red
    'Chemistry': '#f0ad4e', // Muted orange-yellow (instead of pure yellow for better contrast)
    'Biology': '#5cb85c',   // A standard, slightly muted green
    'Social': '#f8c057',    // Softer, sunnier orange-yellow
    'History': '#e7a6b8',   // Dusty rose/pink
    'Music': '#34495e',     // Very dark slate blue (softer than pure black)
    'Art': '#9b59b6',       // Muted purple
    'English': '#8d6e63',   // Earthy brown
    'Default': '#95a5a6',   // Muted grey (fits better with light backgrounds)
  }

export const API_BASE_URL = "http://184.0.1.55:6000/api";
// --- Navbar Component ---
export function Navbar() {
    const navigation = useNavigation();

    return (
        <View style={styles.navBar}>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
                <Image source={require('../assets/home.png')} style={styles.navIcon} />
                <Text style={styles.navText}>HOME</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Quiz')}>
                <Image source={require('../assets/quiz.png')} style={styles.navIcon} />
                <Text style={styles.navText}>QUIZ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Lesson')}>
                <Image source={require('../assets/lesson.png')} style={styles.navIcon} />
                <Text style={styles.navText}>LESSON</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Post')}>
                <Image source={require('../assets/post.png')} style={styles.navIcon} />
                <Text style={styles.navText}>POST</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ChatFeed')}>
                <Image source={require('../assets/chatfeed.png')} style={styles.navIcon} />
                <Text style={styles.navText}>CHAT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
                <Image source={require('../assets/Sign-in.png')} style={styles.navIcon} />
                <Text style={styles.navText}>PROFILE</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: Colors.white, // Using extracted color
        height: 60,
        borderTopColor: Colors.borderColor, // Using extracted color
        borderTopWidth: 1,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 10 : 0,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    navIcon: {
        width: 24,
        height: 24,
        marginBottom: 2
        // No tintColor here, as per your original code
    },
    navText: {
        fontSize: 11,
        color: Colors.navTextBlue, // Using extracted color
        fontWeight: '500'
    },
});