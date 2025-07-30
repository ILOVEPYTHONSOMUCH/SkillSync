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
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Dimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, Navbar } from "../components/NavbarAndTheme";
import { AntDesign, Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
const images = {
  logo: require('../assets/SkillSyncLogo.png'),
  homeIcon: require('../assets/home.png'),
  quizIcon: require('../assets/quiz.png'),
  lessonIcon: require('../assets/lesson.png'),
  postIcon: require('../assets/post.png'),
  chatfeedIcon: require('../assets/chatfeed.png'),
  profileIcon: require('../assets/Sign-in.png'),
};

const API_BASE = API_BASE_URL;
const { width, height } = Dimensions.get("window");
// Define subject-specific colors
const subjectColors = {
  'Math': '#6a8eec',
  'Physics': '#d9534f',
  'Chemistry': '#f0ad4e',
  'Biology': '#5cb85c',
  'Social': '#f8c057',
  'History': '#e7a6b8',
  'Music': '#34495e',
  'Art': '#9b59b6',
  'English': '#8d6e63',
  'Default': '#95a5a6',
};

// All available subjects for filtering
const allSubjects = Object.keys(subjectColors).filter(key => key !== 'Default');

const appColors = {
  primary: '#7ED321',
  secondary: '#795548',
  background: '#F5F5F5',
  cardBackground: '#FFFFFF',
  textPrimary: '#212121',
  textSecondary: '#757575',
  accent: '#FF9800',
  headerBackground: '#004aad',
  navBarBackground: '#FFFFFF',
  navTextActive: '#3F51B5',
};

export default function QuizScreen() {
  const navigation = useNavigation();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userGrade, setUserGrade] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [gradeFilter, setGradeFilter] = useState(null);
  const [tempGradeFilter, setTempGradeFilter] = useState(null);

  // Fetch user's grade on component mount
  useEffect(() => {
    const fetchUserGrade = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const me = await res.json();
          setUserGrade(me.grade);
          setGradeFilter(me.grade); // Initialize grade filter with user's grade
          setTempGradeFilter(me.grade);
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
    return `${API_BASE}/file?path=${encoded}`;
  };

  const fetchQuizzes = useCallback(async () => {
    if (userGrade === null) {
      setLoading(true);
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

      // Build query parameters
      const params = new URLSearchParams();
      if (gradeFilter !== null) {
        params.append('grade', gradeFilter);
      }
      if (searchQuery) {
        params.append('keyword', searchQuery);
      }
      if (selectedSubjects.length > 0) {
        params.append('subjects', selectedSubjects.join(','));
      }

      const response = await fetch(`${API_BASE}/search/quizzes?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch quizzes.' }));
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
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, userGrade, gradeFilter, selectedSubjects]);

  useFocusEffect(
    useCallback(() => {
      fetchQuizzes();
    }, [fetchQuizzes])
  );

  const applyGradeFilter = () => {
    setGradeFilter(tempGradeFilter);
    setFilterModalVisible(false);
  };

  const clearGradeFilter = () => {
    setTempGradeFilter(userGrade);
    setGradeFilter(userGrade);
  };

  const toggleSubject = (subject) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const clearAllFilters = () => {
    setSelectedSubjects([]);
    clearGradeFilter();
  };

  const renderSubjectItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.subjectFilterButton,
        selectedSubjects.includes(item) && styles.selectedSubject,
      ]}
      onPress={() => toggleSubject(item)}
    >
      <Text style={[
        styles.subjectFilterText,
        selectedSubjects.includes(item) && styles.selectedSubjectText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
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
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => {
                setTempGradeFilter(gradeFilter);
                setFilterModalVisible(true);
              }}
            >
              <Feather name="filter" size={20} color="#000066" />
              <Text style={styles.filterButtonText}>
                Filter {(selectedSubjects.length > 0 || gradeFilter !== userGrade) ? 
                  `(${selectedSubjects.length + (gradeFilter !== userGrade ? 1 : 0)})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.myResultBtn}>
              <Text style={styles.myResultBtnText} onPress={() => navigation.navigate('QuizResults')}>My Quiz Result</Text>
            </TouchableOpacity>
          </View>
          <Image source={images.logo} style={styles.logo} />
        </View>

        {/* Filter Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={filterModalVisible}
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              {/* Grade Filter Section */}
              <View style={styles.gradeFilterContainer}>
                <View style={styles.gradeFilterHeader}>
                  <Text style={styles.gradeFilterTitle}>Filter by Grade</Text>
                  <Text style={styles.gradeValue}>
                    {tempGradeFilter !== null ? `Grade ${tempGradeFilter}` : 'All Grades'}
                  </Text>
                </View>
                
                <View style={styles.sliderContainer}>
                  <Slider
                    minimumValue={1}
                    maximumValue={12}
                    step={1}
                    value={tempGradeFilter || 1}
                    onValueChange={setTempGradeFilter}
                    minimumTrackTintColor="#000066"
                    maximumTrackTintColor="#d3d3d3"
                    thumbTintColor="#000066"
                  />
                </View>
                
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{color: '#777'}}>Grade 1</Text>
                  <Text style={{color: '#777'}}>Grade 12</Text>
                </View>
              </View>

              {/* Subject Filter Section */}
              <Text style={[styles.modalTitle, {marginBottom: 10}]}>Filter by Subject</Text>
              <FlatList
                data={allSubjects}
                renderItem={renderSubjectItem}
                keyExtractor={(item) => item}
                numColumns={2}
                contentContainerStyle={styles.subjectList}
                columnWrapperStyle={styles.columnWrapper}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearAllFilters}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={applyGradeFilter}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
                {searchQuery ? ' matching your search criteria' : 
                  (gradeFilter !== userGrade || selectedSubjects.length > 0) ? 
                  ' matching your filters' : 
                  ` for your grade (Grade ${userGrade || 'N/A'})`}.
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
                    { backgroundColor: subjectColors[quiz.subject] || subjectColors.Default }
                  ]}
                  onPress={() => navigation.navigate('DoQuiz', { quizId: quiz.quizId })}
                >
                  <Text style={[
                    styles.startBtnText,
                    quiz.subject === 'Music' && { color: '#FFFFFF' }
                  ]}>
                    Start the Quiz
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
        <Navbar></Navbar>
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
    backgroundColor: '#000066',
    height: 50,
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
    backgroundColor: appColors.primary,
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
    color: appColors.cardBackground,
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  filterButtonText: {
    marginLeft: 5,
    color: '#000066',
    fontWeight: '500',
  },
  myResultBtn: {
    backgroundColor: appColors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  myResultBtnText: {
    color: appColors.cardBackground,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  startBtnText: {
    color: appColors.cardBackground,
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
    backgroundColor: appColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  createQuizButtonTextLarge: {
    color: appColors.cardBackground,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  gradeFilterContainer: {
    marginBottom: 20,
  },
  gradeFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gradeFilterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gradeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000066',
  },
  sliderContainer: {
    paddingHorizontal: 10,
  },
  subjectList: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  subjectFilterButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f1f1',
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedSubject: {
    backgroundColor: '#000066',
  },
  subjectFilterText: {
    fontSize: 14,
  },
  selectedSubjectText: {
    color: 'white',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  applyButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#000066',
    borderRadius: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});