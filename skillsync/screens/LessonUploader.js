import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = 'http://10.56.138.58:6000';

export default function LessonUploader({ navigation }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Physics');

  const [videoAsset, setVideoAsset] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Quiz state management
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctOption: null
  });

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          setLoadingUser(false);
          return;
        }
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const me = await res.json();
          setUser(me);
        } else {
          Alert.alert('Error', 'Failed to load user info');
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Error loading user info');
      }
      setLoadingUser(false);
    })();
  }, []);

  // Pick video file from library
  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Permission to access media library is required!');
      return;
    }
    
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    // Handle both old and new Expo versions
    const isCancelled = pickerResult.canceled || pickerResult.cancelled;
    if (isCancelled) return;

    // Extract asset from response
    const asset = pickerResult.assets?.[0] || pickerResult;
    if (asset.uri) {
      setVideoAsset({
        uri: asset.uri,
        type: asset.mimeType || `video/${asset.uri.split('.').pop()}`,
      });
    }
  };

  // Upload video + info to backend
  const handleUploadPress = async () => {
    if (!videoAsset) {
      Alert.alert('No video', 'Please select a video to upload.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a title.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing description', 'Please enter a description.');
      return;
    }
    if (!user?.grade || isNaN(user.grade)) {
      Alert.alert('Missing grade', 'User grade is required to upload a lesson.');
      return;
    }

    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Not logged in', 'Please login first.');
        setUploading(false);
        return;
      }

      const formData = new FormData();

      // Get filename from URI
      const filename = videoAsset.uri.split('/').pop();
      
      // Append video file
      formData.append('video', {
        uri: videoAsset.uri,
        name: filename,
        type: videoAsset.type || 'video/mp4',
      });

      formData.append('title', title);
      formData.append('description', description);
      formData.append('subject', subject);
      formData.append('grade', user.grade.toString());

      // DO NOT set Content-Type header manually
      const res = await fetch(`${API_BASE}/api/lesson/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        Alert.alert('Success', 'Video uploaded successfully!');
        setVideoAsset(null);
        setTitle('');
        setDescription('');
        setQuizQuestions([]);
      } else {
        const err = await res.text();
        Alert.alert('Upload failed', err || 'Unknown error');
      }
    } catch (e) {
      console.error('Upload error:', e);
      Alert.alert('Error', 'Failed to upload video.');
    }
    setUploading(false);
  };

  // Quiz functions
  const toggleQuizForm = () => {
    setShowQuizForm(!showQuizForm);
  };

  const handleQuestionChange = (text) => {
    setCurrentQuestion({
      ...currentQuestion,
      question: text
    });
  };

  const handleOptionChange = (text, index) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = text;
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions
    });
  };

  const markCorrectOption = (index) => {
    setCurrentQuestion({
      ...currentQuestion,
      correctOption: index
    });
  };

  const addQuestionToQuiz = () => {
    // Basic validation
    if (!currentQuestion.question.trim()) {
      Alert.alert('Missing Question', 'Please enter a question');
      return;
    }
    
    const filledOptions = currentQuestion.options.filter(opt => opt.trim() !== '');
    if (filledOptions.length < 2) {
      Alert.alert('Not Enough Options', 'Please provide at least 2 options');
      return;
    }
    
    if (currentQuestion.correctOption === null) {
      Alert.alert('Missing Correct Answer', 'Please mark the correct answer');
      return;
    }
    
    setQuizQuestions([...quizQuestions, currentQuestion]);
    
    // Reset current question
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correctOption: null
    });
  };

  const removeQuestion = (index) => {
    const newQuestions = [...quizQuestions];
    newQuestions.splice(index, 1);
    setQuizQuestions(newQuestions);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        {loadingUser ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : user ? (
          <>
            <Image
              source={
                user.avatar
                  ? { uri: `${API_BASE}/api/file?path=${encodeURIComponent(user.avatar.replace(/\\/g, '/'))}` }
                  : require('../assets/Sign-in.png')
              }
              style={styles.profileImage}
            />
            <Text style={styles.profileName}>{user.username}</Text>
          </>
        ) : (
          <Text style={{ color: 'white' }}>Not logged in</Text>
        )}
      </View>

      <View style={styles.uploadTitleWrapper}>
        <Text style={styles.uploadTitle}>Upload Videos</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPress} disabled={uploading}>
          <Text style={styles.uploadButtonText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.subjectRow}>
          <Text style={styles.label}>Subject:</Text>
          <TouchableOpacity style={styles.chooseSubjectButton} onPress={() => Alert.alert('Choose Subject', 'Subject selection UI here')}>
            <Text style={styles.chooseSubjectText}>{subject}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="Enter title here..."
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Enter description here..."
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.dragBox} onPress={pickVideo}>
          <Image source={require('../assets/camera.png')} style={styles.cameraIcon} />
          {videoAsset ? (
            <Text style={styles.dragBoxText}>Selected Video ✅</Text>
          ) : (
            <Text style={styles.dragBoxText}>Tap here to select video files</Text>
          )}
        </TouchableOpacity>

        {/* Quiz Section */}
        <View style={{ width: '100%', alignItems: 'center', marginTop: 20 }}>
          <TouchableOpacity
            style={styles.addQuizButton}
            onPress={toggleQuizForm}
          >
            <Text style={styles.addQuizButtonText}>
              {showQuizForm ? 'Hide Quiz' : 'Add Quiz'}
            </Text>
          </TouchableOpacity>
          
          {showQuizForm && (
            <View style={styles.quizFormContainer}>
              <Text style={styles.quizSectionTitle}>Create Quiz</Text>
              
              <Text style={styles.quizLabel}>Question:</Text>
              <TextInput
                style={styles.quizInput}
                placeholder="Enter your question..."
                placeholderTextColor="#888"
                value={currentQuestion.question}
                onChangeText={handleQuestionChange}
              />
              
              <Text style={styles.quizLabel}>Options:</Text>
              {[0, 1, 2, 3].map((index) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    style={styles.optionInput}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#888"
                    value={currentQuestion.options[index]}
                    onChangeText={(text) => handleOptionChange(text, index)}
                  />
                  <TouchableOpacity
                    style={[
                      styles.correctButton,
                      currentQuestion.correctOption === index && styles.correctButtonActive
                    ]}
                    onPress={() => markCorrectOption(index)}
                  >
                    <Text style={styles.correctButtonText}>
                      {currentQuestion.correctOption === index ? '✓ Correct' : 'Mark Correct'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity
                style={styles.addQuestionButton}
                onPress={addQuestionToQuiz}
              >
                <Text style={styles.addQuestionButtonText}>Add Question</Text>
              </TouchableOpacity>
              
              {/* Added Questions List */}
              {quizQuestions.length > 0 && (
                <View style={styles.addedQuestionsContainer}>
                  <Text style={styles.addedQuestionsTitle}>Quiz Questions:</Text>
                  {quizQuestions.map((q, index) => (
                    <View key={index} style={styles.questionItem}>
                      <Text style={styles.questionText}>
                        {index + 1}. {q.question}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeQuestion(index)}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topSection: {
    backgroundColor: '#00125a',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  uploadTitleWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  uploadTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00125a',
  },
  uploadButton: {
    backgroundColor: '#003c96',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 80,
    alignItems: 'stretch',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#00125a',
    marginRight: 8,
  },
  chooseSubjectButton: {
    backgroundColor: '#ff5e00',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  chooseSubjectText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  titleInput: {
    borderColor: '#00125a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#00125a',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    borderColor: '#00125a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#00125a',
    marginBottom: 32,
  },
  dragBox: {
    marginVertical: 32,
    padding: 24,
    borderWidth: 2,
    borderColor: '#000',
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
  },
  cameraIcon: {
    width: 40,
    height: 40,
    marginBottom: 12,
  },
  dragBoxText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00125a',
    textAlign: 'center',
  },
  addQuizButton: {
    backgroundColor: '#774aff',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  addQuizButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // New styles for quiz section
  quizFormContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  quizSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00125a',
    marginBottom: 16,
    textAlign: 'center',
  },
  quizLabel: {
    fontWeight: 'bold',
    color: '#00125a',
    marginBottom: 8,
  },
  quizInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionInput: {
    flex: 1,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  correctButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
  },
  correctButtonActive: {
    backgroundColor: '#28a745',
  },
  correctButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  addQuestionButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addQuestionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addedQuestionsContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 15,
  },
  addedQuestionsTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#00125a',
    marginBottom: 10,
  },
  questionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});