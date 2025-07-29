import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { API_BASE_URL } from "../components/NavbarAndTheme";
// --- Local Image Imports ---
const images = {
  logo: require('../assets/SkillSyncLogo.png'),
  defaultProfilePic: require('../assets/Sign-in.png'),
  homeIcon: require('../assets/home.png'),
  quizIcon: require('../assets/quiz.png'),
  lessonIcon: require('../assets/lesson.png'),
  postIcon: require('../assets/post.png'),
  chatfeedIcon: require('../assets/chatfeed.png'),
  profileIcon: require('../assets/Sign-in.png')
};

const API_BASE = API_BASE_URL;

// --- UPDATED Subject-specific Colors (for card headers) ---
const subjectColors = {
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

// --- App Colors (consistent palette) ---
const appColors = {
  primary: '#004aad',
  secondary: '#FF9800',
  background: '#edffff',
  cardBackground: '#FFFFFF', // Main card background remains white
  textPrimary: '#333333',
  textSecondary: '#666666',
  headerBackground: '#06116b',
  navBarBackground: '#FFFFFF',
  navTextActive: '#000d63',
  statusExcellent: '#28a745',
  statusGood: '#007bff',
  statusFair: '#ffc107',
  statusNeedsPractice: '#dc3545',
};

export default function QuizResults() {
  const navigation = useNavigation();
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState({ username: 'Loading...', testTakenDate: null, profilePicture: null });
  const [detailedAttempts, setDetailedAttempts] = useState([]);

  // Function to get file URL from relative path
  const fileUrlFrom = (relPath) => {
    if (!relPath) return null;
    const encoded = encodeURIComponent(relPath.replace(/\\/g, '/'));
    return `${API_BASE}/file?path=${encoded}`;
  };

  const fetchUserProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to view your profile.');
        setLoadingProfile(false);
        return;
      }
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setUserProfile(prev => ({
          ...prev,
          username: userData.username,
          profilePicture: userData.profilePicture,
        }));
      } else {
        console.error("Failed to fetch user profile:", response.status);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const fetchQuizResults = useCallback(async () => {
    setLoadingAttempts(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to view quiz results.');
        setLoadingAttempts(false);
        return;
      }

      const response = await fetch(`${API_BASE}/quizzes/attempts/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch quiz results.' }));
        throw new Error(errorData.message || 'Failed to fetch quiz results.');
      }

      const data = await response.json();

      setUserProfile(prev => ({
        ...prev,
        testTakenDate: data.userProfile.testTakenDate,
      }));

      const processedAttempts = data.detailedAttempts.map(attempt => {
        if (!attempt.status) {
            let status = 'Not Rated';
            if (attempt.percentage >= 90) status = 'Excellent';
            else if (attempt.percentage >= 70) status = 'Good';
            else if (attempt.percentage >= 50) status = 'Fair';
            else status = 'Needs Practice';
            return { ...attempt, status };
        }
        return attempt;
      });

      setDetailedAttempts(processedAttempts);

    } catch (err) {
      console.error("Error fetching quiz results:", err);
      setError(err.message || "Could not load quiz results.");
      setDetailedAttempts([]);
    } finally {
      setLoadingAttempts(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      fetchQuizResults();
    }, [fetchUserProfile, fetchQuizResults])
  );

  // Helper to determine status text color based on the status string
  const getStatusColor = (status) => {
    switch (status) {
      case 'Excellent': return appColors.statusExcellent;
      case 'Good': return appColors.statusGood;
      case 'Fair': return appColors.statusFair;
      case 'Needs Practice': return appColors.statusNeedsPractice;
      default: return appColors.textSecondary;
    }
  };

  // Helper to determine contrasting text color (black or white) for the header
  const getContrastColor = (hexcolor) => {
    if (!hexcolor || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hexcolor)) {
        return '#000000'; // Default to black if invalid hex
    }
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const y = (r * 299 + g * 587 + b * 114) / 1000;
    return (y >= 128) ? '#000000' : '#FFFFFF'; // Return black for light backgrounds, white for dark
  };

  // Helper function to get dynamic styles for the subject header
  const getSubjectHeaderStyle = (subject) => {
    const bgColor = subjectColors[subject] || subjectColors.Default;
    const textColor = getContrastColor(bgColor);
    return {
      backgroundColor: bgColor,
      color: textColor, // This color will be passed to Text components
    };
  };

  const overallLoading = loadingProfile || loadingAttempts;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}></View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.container}>
          {/* Quiz Header */}
          <View style={styles.quizHeader}>
            <Text style={styles.quizTitle}>My Quiz Results</Text>
            <Image source={images.logo} style={styles.logo} />
          </View>

          {/* Profile Section */}
          <View style={styles.profile}>
            <Image
              source={userProfile.profilePicture ? { uri: fileUrlFrom(userProfile.profilePicture) } : images.defaultProfilePic}
              style={styles.profileImage}
            />
            <View>
              <Text style={styles.profileName}>{userProfile.username}</Text>
              <Text style={styles.profileDate}>
                Last quiz taken :{' '}
                {userProfile.testTakenDate
                  ? moment(userProfile.testTakenDate).format('Do MMMM YYYY, HH:mm')
                  : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Title for the list of attempts */}
          <Text style={styles.sectionTitle}>My Quiz Attempts</Text>

          {overallLoading ? (
            <ActivityIndicator size="large" color={appColors.headerBackground} style={styles.loadingIndicator} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : detailedAttempts.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No quiz results found for your account yet.</Text>
              <TouchableOpacity
                style={styles.goToQuizButton}
                onPress={() => navigation.navigate('Quiz')}
              >
                <Text style={styles.goToQuizButtonText}>Go to Quizzes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            detailedAttempts.map((attempt) => {
              const headerStyles = getSubjectHeaderStyle(attempt.subject);
              return (
                <View key={attempt._id} style={styles.attemptCard}>
                  {/* Subject Colored Header */}
                  <View style={[styles.cardHeader, { backgroundColor: headerStyles.backgroundColor }]}>
                    <Text style={[styles.cardHeaderTitle, { color: headerStyles.color }]}>
                      {attempt.quizTitle}
                    </Text>
                    <Text style={[styles.cardHeaderMeta, { color: headerStyles.color }]}>
                      Subject: {attempt.subject}
                    </Text>
                  </View>

                  {/* Main Card Content */}
                  <View style={styles.cardContent}>
                    <Text style={styles.attemptMeta}>Quiz ID: {attempt.quizId}</Text>
                    <View style={styles.scoreStatusRow}>
                      <Text style={styles.attemptScore}>Score: {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)</Text>
                      <Text style={[styles.attemptStatus, { color: getStatusColor(attempt.status) }]}>{attempt.status}</Text>
                    </View>
                    <Text style={styles.attemptDate}>Attempted on: {moment(attempt.attemptedAt).format('Do MMMM YYYY, HH:mm')}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Image source={images.homeIcon} style={styles.navIcon} />
          <Text style={styles.navText}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Quiz')}>
          <Image source={images.quizIcon} style={styles.navIcon} />
          <Text style={styles.navText}>QUIZ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Lesson')}>
          <Image source={images.lessonIcon} style={styles.navIcon} />
          <Text style={styles.navText}>LESSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Post')}>
          <Image source={images.postIcon} style={styles.navIcon} />
          <Text style={styles.navText}>POST</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ChatFeed')}>
          <Image source={images.chatfeedIcon} style={styles.navIcon} />
          <Text style={styles.navText}>CHAT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Image source={images.profileIcon} style={styles.navIcon} />
          <Text style={styles.navText}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  header: {
    backgroundColor: appColors.headerBackground,
    height: 80,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  container: {
    paddingHorizontal: 10,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -50,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  quizTitle: {
    fontWeight: 'bold',
    fontSize: 24,
    color: appColors.textPrimary,
  },
  logo: {
    height: 40,
    width: 40,
    resizeMode: 'contain',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: appColors.textPrimary,
  },
  profileDate: {
    fontSize: 14,
    color: appColors.textSecondary,
  },
  sectionTitle: {
    backgroundColor: appColors.primary,
    color: 'white',
    textAlign: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 15,
    fontWeight: 'bold',
    fontSize: 16,
    marginHorizontal: 10,
  },
  // --- Updated style for individual quiz attempt cards ---
  attemptCard: {
    backgroundColor: appColors.cardBackground, // Main card background remains white
    borderRadius: 10,
    marginBottom: 12,
    marginHorizontal: 10,
    overflow: 'hidden', // Ensures header respects border radius
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2, // Android shadow
    borderWidth: 1, // Overall subtle border
    borderColor: '#e0e0e0', // Light grey border
  },
  cardHeader: {
    padding: 15,
    paddingBottom: 10, // Slightly less padding at bottom of header
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)', // Subtle line below header
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardHeaderMeta: {
    fontSize: 13,
    // Color handled by headerStyles.color
  },
  cardContent: {
    padding: 15, // Padding for the main content area
    paddingTop: 10, // Adjust top padding after header
  },
  attemptMeta: {
    fontSize: 13,
    color: appColors.textSecondary,
    marginBottom: 4,
  },
  scoreStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  attemptScore: {
    fontSize: 16,
    fontWeight: '600',
    color: appColors.textPrimary,
  },
  attemptStatus: {
    fontSize: 15,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  attemptDate: {
    fontSize: 12,
    fontStyle: 'italic',
    color: appColors.textSecondary,
    marginTop: 4,
  },
  footer: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 20,
    color: appColors.textPrimary,
  },
  arrow: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: appColors.navBarBackground,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  navItem: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  navIcon: {
    height: 24,
    width: 24,
    marginBottom: 5,
    resizeMode: 'contain',
  },
  navText: {
    fontSize: 12,
    color: appColors.navTextActive,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 50,
    marginHorizontal: 20,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  noResultsText: {
    fontSize: 16,
    color: appColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  goToQuizButton: {
    backgroundColor: appColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  goToQuizButtonText: {
    color: appColors.cardBackground,
    fontSize: 16,
    fontWeight: 'bold',
  },
});