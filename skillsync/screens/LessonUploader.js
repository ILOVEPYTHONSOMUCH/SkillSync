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
import { Picker } from '@react-native-picker/picker';

// IMPORTANT: In a real application, you should move this API_BASE URL
// into an environment variable (e.g., using 'react-native-config' or 'dotenv')
// rather than hardcoding it directly in your code.
const API_BASE = 'http://192.168.41.31:6000';

export default function LessonUploader({ navigation }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Physics'); // Default subject
  const subjects = ['Math', 'Physics', 'Chemistry', 'Biology', 'Social', 'History', 'Music']; // List of subjects for dropdown

  const [videoAsset, setVideoAsset] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Quiz state management: Now handles multiple quiz IDs as a string
  const [quizIdsInput, setQuizIdsInput] = useState(''); // State for the string of quiz IDs (e.g., "QZ001, QZ002")

  // Effect hook to load user information when the component mounts.
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

  // Function to pick a video file from the device's media library
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

    const isCancelled = pickerResult.canceled || pickerResult.cancelled;
    if (isCancelled) return;

    const asset = pickerResult.assets?.[0] || pickerResult;
    if (asset.uri) {
      setVideoAsset({
        uri: asset.uri,
        type: asset.mimeType || `video/${asset.uri.split('.').pop()}`, // Fallback type if mimeType is missing
      });
    }
  };

  // Function to handle the upload of video and lesson data
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
        type: videoAsset.type || 'video/mp4', // Fallback type
      });

      formData.append('title', title);
      formData.append('description', description);
      formData.append('subject', subject); // Use the selected subject from the Picker
      formData.append('grade', user.grade.toString());

      // Parse and append multiple quiz IDs
      // This splits the input string by comma or space, filters out empty strings,
      // and converts them to a JSON string array.
      const parsedQuizIds = quizIdsInput
        .split(/[, ]+/) // Split by comma or one or more spaces
        .filter(id => id.trim() !== ''); // Filter out empty strings

      if (parsedQuizIds.length > 0) {
        // Backend should expect 'quiz_ids' as a JSON string array
        formData.append('quiz_ids', JSON.stringify(parsedQuizIds));
      }

      const res = await fetch(`${API_BASE}/api/lesson/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // 'Content-Type': 'multipart/form-data', // This header is set automatically by FormData
        },
        body: formData,
      });

      if (res.ok) {
        Alert.alert('Success', 'Video uploaded successfully!');
        // Reset all states after successful upload
        setVideoAsset(null);
        setTitle('');
        setDescription('');
        setQuizIdsInput(''); // Reset quiz IDs input field
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

  return (
    <View style={styles.container}>
      {/* Top Section: User Profile Info */}
      <View style={styles.topSection}>
        {loadingUser ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : user ? (
          <>
            <Image
              source={
                user.avatar
                  ? { uri: `${API_BASE}/api/file?path=${encodeURIComponent(user.avatar.replace(/\\/g, '/'))}` }
                  : require('../assets/Sign-in.png') // Fallback image
              }
              style={styles.profileImage}
            />
            <Text style={styles.profileName}>{user.username}</Text>
          </>
        ) : (
          <Text style={{ color: 'white' }}>Not logged in</Text>
        )}
      </View>

      {/* Header with Upload Button */}
      <View style={styles.uploadTitleWrapper}>
        <Text style={styles.uploadTitle}>Upload Lesson Video</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPress} disabled={uploading}>
          <Text style={styles.uploadButtonText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content: Scrollable Area for Inputs */}
      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Subject Dropdown */}
        <View style={styles.subjectRow}>
          <Text style={styles.label}>Subject:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={subject}
              onValueChange={(itemValue) => setSubject(itemValue)}
              style={styles.picker}
            >
              {subjects.map((s) => (
                <Picker.Item key={s} label={s} value={s} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Title Input */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="Enter lesson title here..."
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />

        {/* Description Input */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Enter lesson description here..."
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        {/* Video Picker Area */}
        <TouchableOpacity style={styles.dragBox} onPress={pickVideo}>
          <Image source={require('../assets/camera.png')} style={styles.cameraIcon} />
          {videoAsset ? (
            <Text style={styles.dragBoxText}>Selected Video ✅</Text>
          ) : (
            <Text style={styles.dragBoxText}>Tap here to select video file</Text>
          )}
        </TouchableOpacity>

        {/* Quiz IDs Input Field (for multiple IDs) */}
        <View style={styles.quizIdsInputContainer}>
          <Text style={styles.quizIdsLabel}>Related Quiz IDs (Optional, separate with commas or spaces):</Text>
          <TextInput
            style={styles.quizIdsInput}
            placeholder="e.g., QZ001, QZ002, QZ003"
            placeholderTextColor="#888"
            value={quizIdsInput}
            onChangeText={setQuizIdsInput}
            autoCapitalize="none"
            autoCorrect={false}
            multiline // Allow multiple lines for better input experience
          />
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
    paddingBottom: 80, // Ensure enough space at the bottom for scrolling
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
  pickerContainer: {
    flex: 1,
    borderColor: '#00125a',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#00125a',
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
  // Styles for multiple Quiz IDs Input
  quizIdsInputContainer: { // Changed name to reflect multiple IDs
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  quizIdsLabel: { // Changed name to reflect multiple IDs
    fontWeight: 'bold',
    color: '#00125a',
    marginBottom: 8,
  },
  quizIdsInput: { // Changed name to reflect multiple IDs
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 60, // Give it more space for multiple lines
    textAlignVertical: 'top', // Align text to the top for multiline input
  },
});