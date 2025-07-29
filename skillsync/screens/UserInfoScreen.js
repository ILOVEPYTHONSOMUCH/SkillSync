// frontend/src/screens/UserInfoScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Image,
  TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  Dimensions, Platform, FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useNavigation, useIsFocused } from '@react-navigation/native'; // Import useIsFocused
import { API_BASE_URL } from "../components/NavbarAndTheme";

const API_BASE = API_BASE_URL;
const { width } = Dimensions.get('window');
const SUBJECTS = [
  'Math',
  'Physics',
  'Chemistry',
  'Biology',
  'Social',
  'History',
  'Music',
  'Art',
  'English'
];;

// Reusable Tag component for displaying subjects (not interactive here)
const Tag = ({ label, selected }) => (
  <View
    style={[styles.tag, selected && styles.tagSelected]}
  >
    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
      {label}
    </Text>
  </View>
);

// Reusable LabelledInput component for displaying text
const LabelledInput = ({ label, value }) => (
  <View style={{ marginBottom: 15 }}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputGroup}>
      <TextInput
        style={styles.input}
        value={value}
        editable={false} // Make it non-editable
        placeholderTextColor="#888" // Keep placeholder color consistent
      />
    </View>
  </View>
);

// StatBox Component for cooler display
const StatBox = ({ label, value, icon }) => (
  <View style={styles.statBox}>
    {icon && <Text style={styles.statIcon}>{icon}</Text>}
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function UserInfoScreen({ route }) {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); // Get focus state
  const { userId } = route.params; // Get the user ID from navigation params

  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [userPostCount, setUserPostCount] = useState(0);
  const [userLessonCount, setUserLessonCount] = useState(0);
  const [userQuizCount, setUserQuizCount] = useState(0);
  const [userTotalScore, setUserTotalScore] = useState(0);

  const fileUrlFrom = useCallback((relPath) => {
    if (!relPath) return null;
    const p = relPath.replace(/\\/g, '/');
    return `${API_BASE}/file?path=${encodeURIComponent(p)}`;
  }, []);

  const fetchUserActivityData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('No token found for fetching user activity data.');
        Alert.alert('Authentication Required', 'You are not logged in. Please log in to view user profiles.');
        navigation.replace('Login');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch User Info (main profile data, including all counts)
      const userRes = await fetch(`${API_BASE}/users/${userId}`, { headers });
      if (!userRes.ok) {
          const errorData = await userRes.json().catch(() => ({ message: 'Failed to parse error' }));
          throw new Error(errorData.message || 'Failed to load user information.');
      }
      const userData = await userRes.json();

      setUserInfo({
        username: userData.username,
        email: userData.email,
        grade: Number(userData.grade) || 7,
        strengths: userData.skills?.strengths || [],
        weaknesses: userData.skills?.weaknesses || [],
        avatar: userData.avatar,
        note: userData.note || '',
      });

      // Populate counts directly from userData returned by /api/users/:id
      setUserTotalScore(userData.totalScore || 0);
      setUserPostCount(userData.totalPosts || 0);
      setUserLessonCount(userData.totalLessons || 0);
      setUserQuizCount(userData.totalQuizzes || 0);

    } catch (err) {
      console.error("Error fetching user activity data:", err);
      setError(err.message || 'Failed to load user data.');
      setUserInfo(null);
      setUserPostCount(0);
      setUserLessonCount(0);
      setUserQuizCount(0);
      setUserTotalScore(0);
    } finally {
      setLoading(false);
    }
  }, [userId, navigation]);

  useEffect(() => {
    // Add isFocused to the dependency array to re-run when the screen is focused
    if (userId && isFocused) {
      setLoading(true);
      fetchUserActivityData();
    } else if (!userId) {
      setError('No user ID provided.');
      setLoading(false);
    }
  }, [userId, fetchUserActivityData, isFocused]); // Added isFocused here

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000066" />
        <Text style={styles.loadingText}>Loading user profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!userInfo) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>User data not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Image source={require('../assets/SkillSyncLogo.png')} style={styles.logo} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={
                userInfo.avatar
                  ? { uri: fileUrlFrom(userInfo.avatar) }
                  : require('../assets/Sign-in.png')
              }
              style={styles.profilePic}
            />
          </View>
          <View style={styles.overlay}>
            <Text style={styles.name}>{userInfo.username}</Text>
            <View style={styles.userStatsContainer}>
              <StatBox label="Points" value={userTotalScore} icon="🏆" />
              <StatBox label="Posts" value={userPostCount} icon="✍️" />
              <StatBox label="Lessons" value={userLessonCount} icon="📚" />
              <StatBox label="Quizzes" value={userQuizCount} icon="🧠" />
            </View>
          </View>
        </View>

        <LabelledInput label="Name" value={userInfo.username} />
        <LabelledInput label="Email" value={userInfo.email} />

        <View style={{ marginBottom: 15 }}>
          <Text style={styles.label}>About Me</Text>
          <TextInput
            style={styles.textarea}
            value={userInfo.note || "No 'About Me' note provided."}
            editable={false}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#888"
          />
        </View>

        <Text style={styles.label}>Good on subjects:</Text>
        <FlatList
          data={SUBJECTS}
          keyExtractor={item => item}
          horizontal
          contentContainerStyle={styles.tagList}
          renderItem={({ item }) => (
            <Tag
              label={item}
              selected={userInfo.strengths.includes(item)}
            />
          )}
        />

        <Text style={styles.label}>Not good on subjects:</Text>
        <FlatList
          data={SUBJECTS}
          keyExtractor={item => item}
          horizontal
          contentContainerStyle={styles.tagList}
          renderItem={({ item }) => (
            <Tag
              label={item}
              selected={userInfo.weaknesses.includes(item)}
            />
          )}
        />

        <Text style={styles.label}>Grade: {userInfo.grade}</Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={7} maximumValue={12} step={1}
          value={userInfo.grade}
          disabled={true}
          thumbTintColor="#000066"
          minimumTrackTintColor="#000066"
          maximumTrackTintColor="#ccc"
        />
        <View style={{ height: 80 }} />
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { backgroundColor: '#000066', padding: 20, alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  logo: { height: 30, resizeMode: 'contain' },
  body: { padding: 20, paddingBottom: 80 },
  profileSection: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: { position: 'relative' },
  profilePic: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#000' },
  overlay: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },

  userStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    width: '100%',
    maxWidth: width * 0.9,
    alignSelf: 'center',
  },
  statBox: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    width: '48%',
    marginHorizontal: '1%',
    borderWidth: 1,
    borderColor: '#b3d9ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003399',
  },
  statLabel: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },

  loadingText: { marginTop: 10, fontSize: 16, color: '#000066' },
  errorText: { marginTop: 20, fontSize: 16, color: 'red', textAlign: 'center' },
  backButton: {
    marginTop: 20,
    backgroundColor: '#000066',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: { fontSize: 16, color: '#003399', fontWeight: 'bold', marginBottom: 6 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#000' },
  input: { flex: 1, fontSize: 16, paddingVertical: 6, color: '#333' },
  textarea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  tagList: { paddingVertical: 8 },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#003399', marginRight: 8 },
  tagSelected: { backgroundColor: '#003399' },
  tagText: { fontSize: 14, color: '#003399' },
  tagTextSelected: { color: '#fff' },
  navBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 80 : 60, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#ccc', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  navItem: { alignItems: 'center' },
  navIcon: { width: 24, height: 24, marginBottom: 4 },
  navText: { fontSize: 11, color: '#000d63', fontWeight: '500' }
});