import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { AntDesign } from '@expo/vector-icons'; // For plus/delete icons
import { API_BASE_URL } from "../components/NavbarAndTheme";
// --- Configuration ---
const { width } = Dimensions.get('window');
const API_BASE = API_BASE_URL;
const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'Social', 'History', 'Music', 'Art'];
const GRADES = Array.from({ length: 6 }, (_, i) => String(i + 7)); // Grades 7 to 12
const QUIZ_LEVELS = ['Easy', 'Medium', 'Hard']; // Quiz difficulty levels

// Helper for unique IDs for questions/options (client-side only for rendering)
let nextQuestionId = 0;
let nextOptionId = 0;

export default function CreateQuiz() {
  const navigation = useNavigation();
  const [quizTitle, setQuizTitle] = useState('');
  const [quizSubject, setQuizSubject] = useState(SUBJECTS[0]);
  const [quizGrade, setQuizGrade] = useState(GRADES[0]);
  const [quizLevel, setQuizLevel] = useState(QUIZ_LEVELS[0]); // New state for quiz level
  const [coverImageFile, setCoverImageFile] = useState(null); // Stores local URI for upload
  const [coverImagePath, setCoverImagePath] = useState(null); // Stores backend path after upload/fetch (not used for *creation* but useful for edit forms)

  const [questions, setQuestions] = useState([]); // Array of question objects
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to get file URL from relative path (for displaying existing images, if applicable)
  const fileUrlFrom = useCallback((relPath) => {
    if (!relPath) return null;
    const encoded = encodeURIComponent(relPath.replace(/\\/g, '/'));
    return `${API_BASE}/file?path=${encoded}`;
  }, []);

  // --- Image Picking Functions ---
  const pickCoverImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Need photo library access to pick a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true, // Allow user to crop/edit
      aspect: [16, 9], // Common aspect ratio for cover images
    });
    if (!result.canceled) {
      const uri = result.uri || result.assets?.[0]?.uri;
      if (!uri) return;
      const name = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(name);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      setCoverImageFile({ uri, name, type });
      setCoverImagePath(null); // Clear backend path if new file selected
    }
  };

  const pickQuestionImage = async (questionIndex) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Need photo library access to pick an image for the question.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3], // Common aspect ratio for question images
    });
    if (!result.canceled) {
      const uri = result.uri || result.assets?.[0]?.uri;
      if (!uri) return;
      const name = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(name);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      setQuestions(prevQuestions =>
        prevQuestions.map((q, i) =>
          i === questionIndex ? { ...q, imageFile: { uri, name, type }, imagePath: null } : q
        )
      );
    }
  };

  // --- Question Management Functions ---
  const addQuestion = () => {
    setQuestions(prevQuestions => [
      ...prevQuestions,
      {
        id: nextQuestionId++, // Client-side ID
        question: '',
        options: [{ id: nextOptionId++, text: '' }, { id: nextOptionId++, text: '' }], // Start with 2 options
        answer: '',
        imageFile: null,
        imagePath: null,
      }
    ]);
  };

  const removeQuestion = (indexToRemove) => {
    Alert.alert(
      "Remove Question",
      "Are you sure you want to remove this question?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: () => {
            setQuestions(prevQuestions =>
              prevQuestions.filter((_, index) => index !== indexToRemove)
            );
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleQuestionChange = (text, index) => {
    setQuestions(prevQuestions =>
      prevQuestions.map((q, i) =>
        i === index ? { ...q, question: text } : q
      )
    );
  };

  const addOption = (questionIndex) => {
    setQuestions(prevQuestions =>
      prevQuestions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: [...q.options, { id: nextOptionId++, text: '' }] }
          : q
      )
    );
  };

  const removeOption = (questionIndex, optionIdToRemove) => {
    setQuestions(prevQuestions =>
      prevQuestions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.filter(opt => opt.id !== optionIdToRemove) }
          : q
      )
    );
  };

  const handleOptionTextChange = (text, questionIndex, optionIdToUpdate) => {
    setQuestions(prevQuestions =>
      prevQuestions.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options.map(opt =>
                opt.id === optionIdToUpdate ? { ...opt, text: text } : opt
              )
            }
          : q
      )
    );
  };

  const handleCorrectAnswerChange = (value, questionIndex) => {
    setQuestions(prevQuestions =>
      prevQuestions.map((q, i) =>
        i === questionIndex ? { ...q, answer: value } : q
      )
    );
  };

  // --- Submission Logic ---
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Basic Validation
    if (!quizTitle.trim()) {
      return Alert.alert('Validation Error', 'Quiz Topic cannot be empty.');
    }
    if (!quizSubject) {
      return Alert.alert('Validation Error', 'Please select a subject.');
    }
    if (!quizGrade) {
      return Alert.alert('Validation Error', 'Please select a grade.');
    }
    if (!quizLevel) { // New validation for quiz level
      return Alert.alert('Validation Error', 'Please select a quiz level (Easy, Medium, Hard).');
    }
    if (questions.length === 0) {
      return Alert.alert('Validation Error', 'Please add at least one question.');
    }

    for (const [qIndex, q] of questions.entries()) {
      if (!q.question.trim()) {
        return Alert.alert('Validation Error', `Question ${qIndex + 1}: Question text cannot be empty.`);
      }
      if (q.options.length < 2) {
        return Alert.alert('Validation Error', `Question ${qIndex + 1}: Please add at least two options.`);
      }
      for (const [oIndex, opt] of q.options.entries()) {
        if (!opt.text.trim()) {
          return Alert.alert('Validation Error', `Question ${qIndex + 1}, Option ${String.fromCharCode(65 + oIndex)}: Option text cannot be empty.`);
        }
      }
      if (!q.answer.trim()) {
        return Alert.alert('Validation Error', `Question ${qIndex + 1}: Please select the correct answer.`);
      }
      if (!q.options.some(opt => opt.text === q.answer)) {
        return Alert.alert('Validation Error', `Question ${qIndex + 1}: Correct answer must be one of the provided options.`);
      }
    }

    setIsSubmitting(true);
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      setIsSubmitting(false);
      return Alert.alert('Authentication Required', 'You are not logged in. Please log in again.');
    }

    const formData = new FormData();
    formData.append('title', quizTitle);
    formData.append('subject', quizSubject);
    formData.append('grade', quizGrade);
    formData.append('level', quizLevel); // Append the new level field

    // Append cover image if selected
    if (coverImageFile) {
      formData.append('coverImage', {
        uri: coverImageFile.uri,
        name: coverImageFile.name,
        type: coverImageFile.type,
      });
    }

    // Prepare questions data and append question images
    const questionsToSubmit = questions.map(q => {
      const qData = {
        question: q.question,
        options: q.options.map(opt => opt.text), // Send only text of options
        answer: q.answer,
      };
      // For creation, imagePath won't be set, but for an edit screen, this would send existing paths
      if (q.imagePath) qData.imagePath = q.imagePath;
      return qData;
    });
    formData.append('questions', JSON.stringify(questionsToSubmit));

    // Append question images
    questions.forEach((q, index) => {
      if (q.imageFile) {
        formData.append(`questionImage_${index}`, { // Unique field name for each image
          uri: q.imageFile.uri,
          name: q.imageFile.name,
          type: q.imageFile.type,
        });
      }
    });

    try {
      const response = await fetch(`${API_BASE}/quizzes`, { // Your POST endpoint
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // 'Content-Type': 'multipart/form-data' is set automatically by fetch when using FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create quiz.';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      // Display the quizId to the user
      Alert.alert('Success', `Quiz created successfully!\n\nQuiz ID: ${result.quizId}`);
      console.log('Quiz created:', result);
      navigation.goBack(); // Or navigate to QuizDetail screen
    } catch (error) {
      console.error('Error creating quiz:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.headerDummy} />

        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.topHeader}>
            <Text style={styles.title}>Create a Quiz</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quiz Details */}
          <View style={styles.section}>
            <Text style={styles.label}>Topic:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quiz topic"
              value={quizTitle}
              onChangeText={setQuizTitle}
            />

            <Text style={styles.label}>Subject:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={quizSubject}
                onValueChange={(itemValue) => setQuizSubject(itemValue)}
                style={styles.picker}
                itemStyle={styles.pickerItem} // For iOS font size
              >
                {SUBJECTS.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Grade:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={quizGrade}
                onValueChange={(itemValue) => setQuizGrade(itemValue)}
                style={styles.picker}
                itemStyle={styles.pickerItem} // For iOS font size
              >
                {GRADES.map((g) => (
                  <Picker.Item key={g} label={`Grade ${g}`} value={g} />
                ))}
              </Picker>
            </View>

            {/* NEW: Quiz Level Picker */}
            <Text style={styles.label}>Quiz Level:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={quizLevel}
                onValueChange={(itemValue) => setQuizLevel(itemValue)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {QUIZ_LEVELS.map((l) => (
                  <Picker.Item key={l} label={l} value={l} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Cover Picture:</Text>
            <TouchableOpacity style={styles.coverPicButton} onPress={pickCoverImage}>
              {coverImageFile ? (
                <Image source={{ uri: coverImageFile.uri }} style={styles.coverPicPreview} />
              ) : coverImagePath ? (
                <Image source={{ uri: fileUrlFrom(coverImagePath) }} style={styles.coverPicPreview} />
              ) : (
                <Text style={styles.coverPicText}>Upload Cover Image</Text>
              )}
              {/* Optional: Add an icon for upload */}
              <AntDesign name="camerao" size={24} color="white" style={styles.coverPicIcon} />
            </TouchableOpacity>
          </View>

          {/* Questions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Questions</Text>
            {questions.map((q, qIndex) => (
              <View key={q.id} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>Question {qIndex + 1}</Text>
                  <TouchableOpacity onPress={() => removeQuestion(qIndex)} style={styles.removeQuestionButton}>
                    <AntDesign name="closecircle" size={20} color="red" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Question Text:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your question"
                  value={q.question}
                  onChangeText={(text) => handleQuestionChange(text, qIndex)}
                  multiline
                />

                <Text style={styles.label}>Question Image (Optional):</Text>
                <TouchableOpacity style={styles.questionImageButton} onPress={() => pickQuestionImage(qIndex)}>
                  {q.imageFile ? (
                    <Image source={{ uri: q.imageFile.uri }} style={styles.questionImagePreview} />
                  ) : q.imagePath ? (
                    <Image source={{ uri: fileUrlFrom(q.imagePath) }} style={styles.questionImagePreview} />
                  ) : (
                    <Text style={styles.questionImageText}>Add Image</Text>
                  )}
                  <AntDesign name="picture" size={20} color="#000E5A" style={styles.questionImageIcon} />
                </TouchableOpacity>

                <Text style={styles.label}>Choices:</Text>
                {q.options.map((opt, optIndex) => (
                  <View key={opt.id} style={styles.optionInputRow}>
                    <Text style={styles.optionLabel}>{String.fromCharCode(65 + optIndex)}.</Text>
                    <TextInput
                      style={styles.optionInput}
                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                      value={opt.text}
                      onChangeText={(text) => handleOptionTextChange(text, qIndex, opt.id)}
                    />
                    {q.options.length > 2 && ( // Allow removing if more than 2 options
                      <TouchableOpacity onPress={() => removeOption(qIndex, opt.id)} style={styles.removeOptionButton}>
                        <AntDesign name="minuscircleo" size={20} color="gray" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addOptionButton} onPress={() => addOption(qIndex)}>
                  <AntDesign name="pluscircleo" size={18} color="#000E5A" />
                  <Text style={styles.addOptionButtonText}>Add More Choice</Text>
                </TouchableOpacity>

                <Text style={[styles.label, styles.correctAnswerLabel]}>The correct answer:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={q.answer}
                    onValueChange={(itemValue) => handleCorrectAnswerChange(itemValue, qIndex)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="Choose the correct choice ▼" value="" />
                    {q.options.filter(opt => opt.text.trim() !== '').map((opt) => (
                      <Picker.Item key={opt.id} label={opt.text} value={opt.text} />
                    ))}
                  </Picker>
                </View>
              </View>
            ))}

            {/* Add Question Button */}
            <TouchableOpacity style={styles.addQuestionButton} onPress={addQuestion}>
              <AntDesign name="pluscircle" size={24} color="white" />
              <Text style={styles.addQuestionButtonText}>Add New Question</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar */}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
  headerDummy: {
    backgroundColor: '#000E5A',
    height: 60,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 100, // Space for nav bar
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#001158',
  },
  createBtn: {
    backgroundColor: '#0044aa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 100, // Ensure button has minimum width for spinner
    alignItems: 'center',
  },
  createBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001158',
    marginBottom: 15,
    textAlign: 'center',
  },
  label: {
    marginBottom: 4,
    fontWeight: 'bold',
    color: '#001158',
    fontSize: 16,
  },
  input: {
    width: '100%',
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden', // Ensures border radius applies to picker
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
    height: 50, // Standard height for Picker
  },
  pickerItem: { // For iOS only, affects font size
    fontSize: 16,
  },
  coverPicButton: {
    backgroundColor: '#b255f5',
    height: 150, // Fixed height for cover image area
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden', // Clip image to border radius
  },
  coverPicPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 12,
  },
  coverPicText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  coverPicIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 5,
  },

  // Question Card Styles
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001158',
  },
  removeQuestionButton: {
    padding: 5,
  },
  questionImageButton: {
    backgroundColor: '#e0f7fa',
    height: 120,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#b2ebf2',
  },
  questionImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 8,
  },
  questionImageText: {
    color: '#00796b',
    fontWeight: 'bold',
    fontSize: 14,
  },
  questionImageIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    padding: 3,
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#001158',
    minWidth: 20, // Ensure consistent spacing for A., B., C.
  },
  optionInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeOptionButton: {
    marginLeft: 10,
    padding: 5,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8eaf6',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#c5cae9',
  },
  addOptionButtonText: {
    marginLeft: 8,
    color: '#000E5A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  correctAnswerLabel: {
    marginTop: 20,
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745', // Green color
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  addQuestionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  // Navigation Bar Styles (Copied from previous screens)
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    color: '#000d63',
    fontWeight: '500',
  },
});