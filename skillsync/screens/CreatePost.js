// CreatePost.js
import React, { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Image, ScrollView, Alert, FlatList, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Navbar } from '../components/NavbarAndTheme.js';
const API_BASE = 'http://192.168.41.31:6000'; // Ensure this matches your backend API URL

const subjects = [
  'Math',
  'Physics',
  'Chemistry',
  'Biology',
  'Social',
  'History',
  'Music',
  'Art',
  'English'
];

const Tag = ({ label, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.tag, selected && styles.tagSelected]}
  >
    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// Modified NavBar Component - only with profile/username on left, taller
const NavBar = ({ userName, avatar, API_BASE }) => (
  <View style={navStyles.navBar}>
    <View style={navStyles.userInfo}>
      <Image
        source={
          avatar
            ? { uri: `${API_BASE}/api/file?path=${encodeURIComponent(avatar.replace(/\\/g, '/'))}` }
            : require('../assets/Sign-in.png') // Default avatar if not set
        }
        style={navStyles.avatar}
      />
      <Text style={navStyles.userName}>{userName}</Text>
    </View>
    {/* "Upload Post" title is now *below* the navbar */}
  </View>
);

const CreatePost = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [learnSubjects, setLearnSubjects] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [userName, setUserName] = useState(''); // State for username
  const [imageFile, setImageFile] = useState(null); // State for selected image
  const [videoFile, setVideoFile] = useState(null); // State for selected video
  const [grade, setGrade] = useState(7);
  const [loading, setLoading] = useState(false); // State for loading indicator

  useEffect(() => {
    (async () => {
      // Request media library permissions when component mounts
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library permissions to upload images/videos.');
      }

      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return; // If no token, user is not authenticated

        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch user data');
        const user = await res.json();
        setAvatar(user.avatar);
        setUserName(user.username); // Set the username
      } catch (err) {
        console.error("Error fetching user avatar/username:", err);
      }
    })();
  }, []);

  const toggleTeach = subj => {
    setTeachSubjects(prev =>
      prev.includes(subj)
        ? prev.filter(s => s !== subj)
        : [...prev, subj]
    );
  };

  const toggleLearn = subj => {
    setLearnSubjects(prev =>
      prev.includes(subj)
        ? prev.filter(s => s !== subj)
        : [...prev, subj]
    );
  };

  // Unified function to pick either image or video
  const pickMedia = async (mediaType) => {
    let result;
    if (mediaType === 'image') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true, // Allows cropping for images
      });
    } else if (mediaType === 'video') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
        allowsEditing: true, // Allows trimming for videos
      });
    }

    if (!result.canceled) {
      if (mediaType === 'image') {
        setImageFile(result.assets[0]);
        setVideoFile(null); // Clear video if image is selected
      } else if (mediaType === 'video') {
        setVideoFile(result.assets[0]);
        setImageFile(null); // Clear image if video is selected
      }
    }
  };

  const handlePost = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation Error', 'Title and description are required.');
      return;
    }
    if (teachSubjects.length === 0 && learnSubjects.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one subject you are good at or need to learn.');
      return;
    }
    if (!imageFile && !videoFile) {
        Alert.alert('Validation Error', 'Please upload either an image or a video for your post.');
        return;
    }

    setLoading(true); // Start loading indicator

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Authentication Error', 'You must be logged in to create a post.');
        return;
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      // Stringify arrays to send them as JSON strings, backend needs to parse them
      formData.append('teachSubjects', JSON.stringify(teachSubjects));
      formData.append('learnSubjects', JSON.stringify(learnSubjects));
      formData.append('grade', grade.toString());

      if (imageFile) {
        // Extract filename and type correctly for multipart form data
        const filename = imageFile.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`; // Default to jpeg

        formData.append('image', {
          uri: imageFile.uri,
          name: filename,
          type: type,
        });
      } else if (videoFile) {
        // Extract filename and type correctly for multipart form data
        const filename = videoFile.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `video/${match[1]}` : `video/mp4`; // Default to mp4

        formData.append('video', {
          uri: videoFile.uri,
          name: filename,
          type: type,
        });
      }

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // 'Content-Type': 'multipart/form-data' is usually set automatically by fetch when FormData is used
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text(); // Get raw text to debug server errors
        let errorMessage = 'Server error occurred while creating post.';
        try {
            const errorData = JSON.parse(errorText); // Try to parse as JSON
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
            errorMessage = errorText || errorMessage; // Use raw text if not JSON
        }
        throw new Error(errorMessage);
      }

      Alert.alert('Success', 'Post created successfully!');
      // Reset form fields after successful post
      setTitle('');
      setDescription('');
      setTeachSubjects([]);
      setLearnSubjects([]);
      setImageFile(null);
      setVideoFile(null);
      setGrade(7);
      
      navigation.goBack(); // Navigate back to the previous screen
    } catch (e) {
      console.error("Post creation error:", e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  return (
    <View style={styles.container}>
      {/* New NavBar at the top */}
      <NavBar userName={userName} avatar={avatar} API_BASE={API_BASE} />

      <ScrollView contentContainerStyle={styles.editor}>
        {/* "Upload Post" title below the top navbar */}
        <Text style={styles.uploadPostTitle}>Upload Post</Text>

        {/* Title Input */}
        <Text style={styles.label}>Title:</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.inputLine}
          placeholder="Enter title"
          placeholderTextColor="#999" // Subtle placeholder color
        />

        {/* Description Input */}
        <Text style={styles.label}>Description:</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.inputLine, styles.description]}
          placeholder="Write a description..."
          placeholderTextColor="#999" // Subtle placeholder color
          multiline
        />

        {/* Media Upload Section */}
        <View style={styles.mediaContainer}>
            <Text style={styles.label}>Add Media:</Text>
            <View style={styles.mediaButtonsRow}>
                <TouchableOpacity onPress={() => pickMedia('image')} style={styles.mediaBtn}>
                    <Text style={styles.mediaBtnText}>📸 Add Image</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => pickMedia('video')} style={styles.mediaBtn}>
                    <Text style={styles.mediaBtnText}>🎬 Add Video</Text>
                </TouchableOpacity>
            </View>
            {imageFile && (
                <View style={styles.mediaPreview}>
                    <Text style={styles.mediaPreviewLabel}>Image Preview:</Text>
                    <Image source={{ uri: imageFile.uri }} style={styles.previewImage} />
                </View>
            )}
            {videoFile && (
                <View style={styles.mediaPreview}>
                    <Text style={styles.mediaPreviewLabel}>Video Selected:</Text>
                    <Text style={styles.videoFileName}>
                      {videoFile.name ? videoFile.name : videoFile.uri.split('/').pop()}
                    </Text>
                </View>
            )}
        </View>


        {/* "I'm good on subjects" Tags */}
        <Text style={styles.label}>I’m good on subjects:</Text>
        <FlatList
          data={subjects}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagList}
          renderItem={({ item }) => (
            <Tag
              label={item}
              selected={teachSubjects.includes(item)}
              onPress={() => toggleTeach(item)}
            />
          )}
        />

        {/* "I'm not good on subjects" Tags */}
        <Text style={styles.label}>I’m not good on subjects:</Text>
        <FlatList
          data={subjects}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagList}
          renderItem={({ item }) => (
            <Tag
              label={item}
              selected={learnSubjects.includes(item)}
              onPress={() => toggleLearn(item)}
            />
          )}
        />

        {/* Grade Slider */}
        <Text style={styles.label}>Grade: {grade}</Text>
        <Slider
          style={styles.slider}
          minimumValue={7}
          maximumValue={12}
          step={1}
          value={grade}
          onValueChange={setGrade}
          minimumTrackTintColor="#1565c0" // Matches original tag selected color
          maximumTrackTintColor="#ccc"
          thumbTintColor="#1565c0"
        />

        {/* Action Buttons (Cancel and Post) */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.actionBtn, styles.cancelBtn]}
            disabled={loading} // Disable while post is loading
          >
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePost}
            style={[styles.actionBtn, styles.postBtn]}
            disabled={loading} // Disable while post is loading
          >
            {loading ? (
              <ActivityIndicator color="#fff" /> // Show spinner
            ) : (
              <Text style={styles.actionBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Navbar></Navbar>
     
    </View>
  );
};

const navStyles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Align content to the left
    alignItems: 'center',
    backgroundColor: '#000d63', // Blue background for navbar
    paddingHorizontal: 15,
    paddingVertical: 20, // Increased padding for ~15% taller
    paddingTop: 40, // Add padding for status bar on iOS
    width: '100%',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40, // Slightly larger avatar in the top bar
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#ccc',
  },
  userName: {
    color: '#fff',
    fontSize: 18, // Slightly larger font size for username
    fontWeight: 'bold',
  },
  // navTitle style removed from here as it's no longer in NavBar
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  editor: { padding: 16, paddingBottom: 50, paddingTop: 10 }, // Keep paddingTop minimal, as the navbar has its own padding
  uploadPostTitle: { // New style for "Upload Post" title below navbar
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000d63', // Blue color for the title
    textAlign: 'center',
    marginTop: 10, // Space below the navbar
    marginBottom: 20, // Space before the next input
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 }, // Kept for consistency, can be removed if not used elsewhere.
  label: { fontWeight: 'bold', fontSize: 16, marginTop: 12 },
  inputLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 8,
    fontSize: 16,
    color: '#333', // Ensure text color is readable
  },
  description: {
    minHeight: 80,
    textAlignVertical: 'top', // Ensures text starts from the top for multiline
  },
  // New styles for media selection
  mediaContainer: {
    marginTop: 16,
    borderWidth: 1, // Add a border for separation
    borderColor: '#eee', // Light border color
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9f9f9', // Slightly different background for the section
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 10,
  },
  mediaBtn: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#eee', // Original 'imageBtn' background
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row', // To allow icon and text side-by-side
  },
  mediaBtnText: {
    color: '#333',
    fontSize: 16,
    marginLeft: 5, // Space between icon and text
  },
  mediaPreview: {
    marginTop: 10,
    alignItems: 'center',
  },
  mediaPreviewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  previewImage: {
    width: '100%',
    height: 200,
    marginTop: 10,
    borderRadius: 8,
    resizeMode: 'cover', // Ensures image covers the area nicely
    backgroundColor: '#e0e0e0', // Placeholder background for image
  },
  videoFileName: {
    fontSize: 15,
    color: '#333',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 5,
  },
  tagList: { paddingVertical: 8 },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1565c0',
    marginRight: 8,
  },
  tagSelected: {
    backgroundColor: '#1565c0',
  },
  tagText: {
    fontSize: 14,
    color: '#1565c0',
  },
  tagTextSelected: {
    color: '#fff',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 5, // Adjusted to match other input spacing
  },
  bottomButtons: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, marginBottom: 20
  },
  actionBtn: {
    flex: 1, marginHorizontal: 8, paddingVertical: 12,
    borderRadius: 6, alignItems: 'center',
    justifyContent: 'center', // Center content vertically
  },
  cancelBtn: { backgroundColor: '#d32f2f' },
  postBtn: { backgroundColor: '#1565c0' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footerNav: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10,
    borderTopWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
    position: 'absolute', // Ensures footer stays at the bottom
    bottom: 0,
    width: '100%',
    paddingBottom: 20, // To account for safe area on newer phones
  },
  navItem: { alignItems: 'center' },
  navIcon: { width: 24, height: 24, marginBottom: 4 },
  navText: { fontSize: 12, color: '#555' },
});

export default CreatePost;