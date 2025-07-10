// DoQuiz.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Configuration ---
const API_BASE = 'http://192.168.41.31:6000'; // **IMPORTANT: REPLACE WITH YOUR ACTUAL BACKEND IP ADDRESS**
const { width } = Dimensions.get('window');

// Colors for options buttons to match the image
const OPTION_COLORS = ['#3498db', '#3498db', '#f19292', '#ffa062'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function DoQuiz() {
  const navigation = useNavigation();
  const route = useRoute();
  const { quizId } = route.params;

  const [quizData, setQuizData] = useState(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentScore, setCurrentScore] = useState(0); // Score for the current quiz attempt
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);

  // Function to get file URL from relative path (for question images)
  const fileUrlFrom = useCallback((relPath) => {
    if (!relPath) return null;
    const encoded = encodeURIComponent(relPath.replace(/\\/g, '/'));
    return `${API_BASE}/api/file?path=${encoded}`;
  }, []);

  // --- Fetch Quiz Data on Component Mount ---
  useEffect(() => {
    const fetchQuiz = async () => {
      setIsLoadingQuiz(true);
      setFetchError(null);
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert('Authentication Required', 'Please log in to take quizzes.');
          navigation.replace('Login');
          return;
        }

        const response = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to parse error.' }));
          throw new Error(errorData.message || 'Failed to fetch quiz data.');
        }

        const data = await response.json();
        setQuizData(data);
        setUserAnswers(new Array(data.questions.length).fill(null));
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setFetchError(err.message || 'Could not load quiz.');
      } finally {
        setIsLoadingQuiz(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    } else {
      setFetchError('No Quiz ID provided.');
      setIsLoadingQuiz(false);
    }
  }, [quizId, navigation]);

  // --- Handle Option Selection ---
  const handleSelectOption = (optionText) => {
    if (!showFeedback) {
      setSelectedOption(optionText);
      setUserAnswers(prevAnswers => {
        const newAnswers = [...prevAnswers];
        newAnswers[currentQuestionIndex] = {
          questionIndex: currentQuestionIndex,
          given: optionText,
        };
        return newAnswers;
      });
    }
  };

  // --- Handle Checking Answer for Current Question ---
  const handleCheckAnswer = () => {
    if (selectedOption === null) {
      Alert.alert('No Answer Selected', 'Please select an answer before checking.');
      return;
    }

    if (selectedOption === quizData.questions[currentQuestionIndex].answer) {
      setCurrentScore(prevScore => prevScore + 1);
    }
    setShowFeedback(true);
  };

  // --- Logic to Determine Option Button Styling ---
  const getOptionButtonStyle = (optionText, index) => {
    const isSelected = selectedOption === optionText;
    const isCorrect = showFeedback && optionText === quizData.questions[currentQuestionIndex].answer;
    const isIncorrectAndSelected = showFeedback && isSelected && optionText !== quizData.questions[currentQuestionIndex].answer;

    return [
      styles.optionButton,
      { backgroundColor: OPTION_COLORS[index % OPTION_COLORS.length] },
      isSelected && styles.optionButtonSelected,
      isCorrect && styles.optionButtonCorrect,
      isIncorrectAndSelected && styles.optionButtonIncorrect,
    ];
  };

  // Helper for rendering the star icon for the level (kept for general aesthetics, though "Level" is now "Grade")
  const renderStarIcon = () => (
    <AntDesign name="star" size={14} color="#FFD700" style={styles.starIcon} />
  );

  // --- Submit Quiz Attempt to Backend ---
  const submitQuizAttempt = async () => {
    setIsSubmittingAttempt(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to submit your quiz.');
        navigation.replace('Login');
        return;
      }

      const response = await fetch(`${API_BASE}/api/quizzes/${quizId}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: userAnswers }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error.' }));
        throw new Error(errorData.message || 'Failed to submit quiz attempt.');
      }

      const result = await response.json();
      Alert.alert('Quiz Finished!', `You scored ${result.score} out of ${quizData.questions.length}!`);
      navigation.goBack();
    } catch (err) {
      console.error('Error submitting quiz attempt:', err);
      Alert.alert('Submission Error', err.message || 'Failed to submit your quiz.');
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  // --- Render Loading/Error States ---
  if (isLoadingQuiz) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000E5A" />
        <Text style={styles.loadingText}>Loading Quiz...</Text>
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{fetchError}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>No questions found for this quiz.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Quiz Content Rendering ---
  const currentQuestion = quizData.questions[currentQuestionIndex];
  const totalQuestions = quizData.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <AntDesign name="close" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.quizTitle}>Quiz</Text>
          <Text style={styles.physicsQuiz}>{quizData.subject || 'Unknown Subject'}</Text>
        </View>
      </View>

      <View style={styles.progressBarContainer}>
        {/* Numerical Progress Display */}
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} / {totalQuestions}
        </Text>
        <View style={styles.levelPointsContainer}>
          {/* Display Grade instead of Level */}
          <Text style={styles.levelText}>Grade {quizData.grade || 'N/A'}</Text>
          {renderStarIcon()}
          {/* Display Total Questions instead of Points */}
          <Text style={styles.pointsText}>{totalQuestions} Points</Text>
        </View>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>
            Question {currentQuestionIndex + 1}.
          </Text>
          <Text style={styles.questionText}>
            {currentQuestion.question}
          </Text>

          {currentQuestion.imagePath && (
            <Image
              source={{ uri: fileUrlFrom(currentQuestion.imagePath) }}
              style={styles.questionImage}
            />
          )}

          <View style={styles.optionsGrid}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={getOptionButtonStyle(option, index)}
                onPress={() => handleSelectOption(option)}
                disabled={showFeedback}
              >
                <Text style={styles.optionButtonText}>
                  {OPTION_LETTERS[index]}. {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!showFeedback ? (
          <TouchableOpacity
            style={styles.checkAnswersButton}
            onPress={handleCheckAnswer}
            disabled={selectedOption === null}
          >
            <Text style={styles.checkAnswersButtonText}>Check the answers</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.feedbackContainer}>
            {selectedOption === currentQuestion.answer ? (
              <Text style={styles.feedbackCorrect}>🎉 Correct Answer! 🎉</Text>
            ) : (
              <Text style={styles.feedbackIncorrect}>❌ Incorrect. The correct answer was: {currentQuestion.answer}</Text>
            )}

            {currentQuestionIndex < totalQuestions - 1 ? (
              <TouchableOpacity
                style={styles.nextQuestionButton}
                onPress={() => {
                  setShowFeedback(false);
                  setSelectedOption(null);
                  setCurrentQuestionIndex(prev => prev + 1);
                }}
              >
                <Text style={styles.nextQuestionButtonText}>Next Question</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.submitQuizButton}
                onPress={submitQuizAttempt}
                disabled={isSubmittingAttempt}
              >
                {isSubmittingAttempt ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitQuizButtonText}>Submit Quiz</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#000E5A',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#000E5A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#000E5A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    paddingHorizontal: 15,
    height: 80,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 35 : 40,
    left: 15,
    zIndex: 1,
  },
  headerTitles: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 5,
    marginLeft: 40,
  },
  quizTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  physicsQuiz: {
    color: '#F39C12',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  progressBarContainer: {
    backgroundColor: '#000E5A',
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  progressText: { // New style for numerical progress
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5, // Space between text and bar
    textAlign: 'right', // Align to right or center as preferred
    paddingRight: 5, // Small padding from right edge
  },
  levelPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  levelText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 5,
  },
  starIcon: {
    marginRight: 5,
  },
  pointsText: {
    color: '#fff',
    fontSize: 14,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F39C12',
    borderRadius: 5,
  },
  scrollViewContent: {
    padding: 15,
    paddingBottom: 30,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  questionNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001158',
    marginBottom: 10,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 30,
    marginBottom: 20,
  },
  questionImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionButton: {
    width: '48%',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  optionButtonSelected: {
    borderWidth: 3,
    borderColor: '#00FFFF',
    elevation: 6,
    shadowOpacity: 0.3,
  },
  optionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionButtonCorrect: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  optionButtonIncorrect: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  checkAnswersButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  checkAnswersButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  feedbackContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 15,
  },
  feedbackCorrect: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 10,
  },
  feedbackIncorrect: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  nextQuestionButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  nextQuestionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitQuizButton: {
    backgroundColor: '#000E5A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  submitQuizButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});