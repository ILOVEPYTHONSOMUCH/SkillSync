import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  ActivityIndicator, // Import ActivityIndicator for loading state
  Alert,             // Import Alert for error messages
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

// Assume these images are in your project's assets folder
const images = {
  logo: require('../assets/SkillSyncLogo.png'),
  homeIcon: require('../assets/home.png'),
  quizIcon: require('../assets/quiz.png'),
  lessonIcon: require('../assets/lesson.png'),
  postIcon: require('../assets/post.png'),
  chatfeedIcon: require('../assets/chatfeed.png'),
  profileIcon: require('../assets/Sign-in.png'),
};

const API_BASE = 'http://192.168.41.31:6000'; // Define API_BASE

// Define subject-specific colors with your new preferences
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
};

// Define a new color palette for overall app theme
const appColors = {
  primary: '#7ED321',        // Slate Grey (neutral primary for general buttons)
  secondary: '#795548',      // Brown (for less critical actions like My Quiz Result)
  background: '#F5F5F5',     // Lighter grey for overall screen background
  cardBackground: '#FFFFFF', // White for cards
  textPrimary: '#212121',    // Dark grey for main text
  textSecondary: '#757575',  // Medium grey for secondary text
  accent: '#FF9800',         // Deep Orange for highlights
  headerBackground: '#004aad', // Indigo Blue for header (Note: This will be overridden by '#000c52' for headerDummy)
  navBarBackground: '#FFFFFF', // White for nav bar
  navTextActive: '#3F51B5', // Indigo Blue for active nav text
};


export default function QuizScreen() {
  const navigation = useNavigation();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // State for search input
  const [userGrade, setUserGrade] = useState(null); // State to store user's grade

  // Fetch user's grade on component mount
  useEffect(() => {
    const fetchUserGrade = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const me = await res.json();
          setUserGrade(me.grade); // Assuming 'grade' field exists in user data
        }
      } catch (e) {
        console.error("Failed to fetch user grade:", e);
      }
    };
    fetchUserGrade();
  }, []);

  // Function to get file URL from relative path
  const fileUrlFrom = (relPath) => {
    if (!relPath) return null;
    const encoded = encodeURIComponent(relPath.replace(/\\/g, '/'));
    return `${API_BASE}/api/file?path=${encoded}`;
  };

  const fetchQuizzes = useCallback(async () => {
    if (userGrade === null) {
      // Don't fetch if user grade isn't loaded yet
      setLoading(true); // Keep loading state true until grade is available or error
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to view quizzes.');
        setLoading(false);
        return;
      }

      // Add keyword and grade to the URL for filtering
      let url = `${API_BASE}/api/search/quizzes?grade=${userGrade}`;
      if (searchQuery) {
        url += `&keyword=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch quizzes.' }));
        // If the error is due to no quizzes found (e.g., 404 from specific API setup), treat as empty
        if (response.status === 404) {
          setQuizzes([]);
          return;
        }
        throw new Error(errorData.message || 'Failed to fetch quizzes.');
      }

      const data = await response.json();
      setQuizzes(data);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      setError(err.message || "Could not load quizzes.");
      setQuizzes([]); // Clear quizzes on error
    } finally {
      setLoading(false);
    }
  }, [searchQuery, userGrade]); // Depend on searchQuery AND userGrade

  useFocusEffect(
    useCallback(() => {
      fetchQuizzes();
    }, [fetchQuizzes])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header - Dummy for initial layout */}
        <View style={styles.headerDummy}></View>

        {/* Top Controls Section */}
        <View style={styles.topControls}>
          <View style={styles.leftControls}>
            <View style={styles.quizTitleContainer}>
              <Text style={styles.quizTitle}>Quiz</Text>
              <TouchableOpacity
                style={styles.createQuizButton}
                onPress={() => navigation.navigate('CreateQuiz')}
              >
                <Text style={styles.createQuizButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Searching Quiz"
                placeholderTextColor={appColors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={fetchQuizzes}
              />
              <Text style={styles.searchIcon}>🔍</Text>
            </View>
            <TouchableOpacity style={styles.myResultBtn}>
              <Text style={styles.myResultBtnText} onPress={() => navigation.navigate('QuizResults')}>My Quiz Result</Text>
            </TouchableOpacity>
          </View>
          <Image source={images.logo} style={styles.logo} />
        </View>

        {/* Main Content Area - Scrollable */}
        <ScrollView contentContainerStyle={styles.quizContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={appColors.primary} style={styles.loadingIndicator} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : quizzes.length === 0 ? (
            <View style={styles.noQuizzesContainer}>
              <Text style={styles.noQuizzesText}>
                No quizzes found
                {searchQuery ? ' matching your search criteria' : ` for your grade (Grade ${userGrade || 'N/A'})`}.
                {"\n"}Be the first to create one!
              </Text>
              <TouchableOpacity
                style={styles.createQuizButtonLarge}
                onPress={() => navigation.navigate('CreateQuiz')}
              >
                <Text style={styles.createQuizButtonTextLarge}>Create New Quiz</Text>
              </TouchableOpacity>
            </View>
          ) : (
            quizzes.map((quiz) => (
              <View
                key={quiz.quizId}
                style={[
                  styles.quizCard,
                  { borderLeftColor: subjectColors[quiz.subject] || subjectColors.Default }
                ]}
              >
                {quiz.coverImage && (
                  <Image
                    source={{ uri: fileUrlFrom(quiz.coverImage) }}
                    style={styles.quizCoverImage}
                    resizeMode="cover"
                  />
                )}
                <Text style={styles.quizCardTitle}>{quiz.title || 'N/A'}</Text>
                <Text style={styles.quizCardText}>Subject: {quiz.subject || 'N/A'}</Text>
                <Text style={styles.quizCardText}>Grade: {quiz.grade || 'N/A'}</Text>
                <Text style={styles.quizCardText}>Questions: {quiz.questions ? quiz.questions.length : 0}</Text>
                <Text style={styles.quizCardId}>Quiz ID: {quiz.quizId}</Text>
                <TouchableOpacity
                  style={[
                    styles.startBtn,
                    { backgroundColor: subjectColors[quiz.subject] || subjectColors.Default } // Dynamic button color
                  ]}
                  onPress={() => navigation.navigate('DoQuiz', { quizId: quiz.quizId })}
                >
                  {/* For black button (Music), change text to white for visibility */}
                  <Text style={[
                    styles.startBtnText,
                    quiz.subject === 'Music' && { color: '#FFFFFF' } // White text for 'Music' subject button
                  ]}>
                    Start the Quiz
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  container: {
    flex: 1,
    backgroundColor: appColors.background,
    position: 'relative',
  },
  headerDummy: {
    backgroundColor: '#000c52', // Changed to the requested color
    height: 60,
  },
  topControls: {
    backgroundColor: appColors.cardBackground,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flexWrap: 'wrap',
  },
  quizTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: appColors.textPrimary,
  },
  createQuizButton: {
    backgroundColor: appColors.primary, // Using general primary for this button
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  createQuizButtonText: {
    color: appColors.cardBackground, // White text
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderColor: '#ccc',
    borderWidth: 1,
    width: 160,
    color: appColors.textPrimary,
  },
  searchIcon: {
    marginLeft: 5,
    color: appColors.textPrimary,
    fontSize: 16,
  },
  myResultBtn: {
    backgroundColor: appColors.secondary, // Using general secondary for this button
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  myResultBtnText: {
    color: appColors.cardBackground, // White text
    fontWeight: 'bold',
    fontSize: 14,
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  quizContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  quizCard: {
    backgroundColor: appColors.cardBackground,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 8,
  },
  quizCoverImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  quizCardTitle: {
    fontSize: 22,
    marginBottom: 10,
    fontWeight: 'bold',
    color: appColors.textPrimary,
  },
  quizCardText: {
    fontSize: 14,
    marginBottom: 5,
    color: appColors.textSecondary,
  },
  quizCardId: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  startBtn: {
    marginTop: 10,
    // Background color is now dynamic, removed fixed color here
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  startBtnText: {
    color: appColors.cardBackground, // Default to white text for contrast on colored buttons
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 50,
  },
  noQuizzesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  noQuizzesText: {
    fontSize: 18,
    color: appColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  createQuizButtonLarge: {
    backgroundColor: appColors.primary, // Using general primary for this button
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  createQuizButtonTextLarge: {
    color: appColors.cardBackground, // White text
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Navigation Bar Styles
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: appColors.navBarBackground,
    height: 60,
    borderTopColor: '#ccc',
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    width: 24,
    height: 24,
    marginBottom: 2,
    resizeMode: 'contain',
  },
  navText: {
    fontSize: 11,
    color: appColors.navTextActive,
    fontWeight: '500',
  },
});