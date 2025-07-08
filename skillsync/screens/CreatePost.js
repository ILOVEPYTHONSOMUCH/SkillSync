// CreatePost.js
import React, { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Image, ScrollView, Alert, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.56.138.58:6000';

const subjects = [
  'Physics','Chemistry','Biology',
  'Math','English','History',
  'Geography','Computer','Art'
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

const CreatePost = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [learnSubjects, setLearnSubjects] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [grade, setGrade] = useState(7);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch user');
        const user = await res.json();
        setAvatar(user.avatar);
      } catch (err) {
        console.error(err);
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageFile(result.assets[0]);
    }
  };

  const handlePost = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation', 'Title and description are required.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('teachSubjects', JSON.stringify(teachSubjects));
      formData.append('learnSubjects', JSON.stringify(learnSubjects));
      formData.append('grade', grade.toString());

      if (imageFile) {
        formData.append('image', {
          uri: imageFile.uri,
          name: 'upload.jpg',
          type: 'image/jpeg',
        });
      }

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Server error');
      }

      Alert.alert('Success', 'Post created!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.editor}>
        <View style={styles.userRow}>
          <Image
            source={
              avatar
                ? { uri: `${API_BASE}/api/file?path=${encodeURIComponent(avatar.replace(/\\/g, '/'))}` }
                : require('../assets/Sign-in.png')
            }
            style={styles.avatar}
          />
        </View>

        <Text style={styles.label}>Title:</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.inputLine}
          placeholder="Enter title"
        />

        <Text style={styles.label}>Description:</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.inputLine, styles.description]}
          placeholder="Write a description..."
          multiline
        />

        <TouchableOpacity onPress={pickImage} style={styles.imageBtn}>
          <Text style={styles.imageBtnText}>📸 Add Image</Text>
        </TouchableOpacity>
        {imageFile && (
          <Image source={{ uri: imageFile.uri }} style={styles.previewImage} />
        )}

        <Text style={styles.label}>I’m good on subjects:</Text>
        <FlatList
          data={subjects}
          keyExtractor={item => item}
          horizontal
          contentContainerStyle={styles.tagList}
          renderItem={({ item }) => (
            <Tag
              label={item}
              selected={teachSubjects.includes(item)}
              onPress={() => toggleTeach(item)}
            />
          )}
        />

        <Text style={styles.label}>I’m not good on subjects:</Text>
        <FlatList
          data={subjects}
          keyExtractor={item => item}
          horizontal
          contentContainerStyle={styles.tagList}
          renderItem={({ item }) => (
            <Tag
              label={item}
              selected={learnSubjects.includes(item)}
              onPress={() => toggleLearn(item)}
            />
          )}
        />

        <Text style={styles.label}>Grade: {grade}</Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={7}
          maximumValue={12}
          step={1}
          value={grade}
          onValueChange={setGrade}
        />

        <View style={styles.bottomButtons}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.actionBtn, styles.cancelBtn]}
          >
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePost}
            style={[styles.actionBtn, styles.postBtn]}
          >
            <Text style={styles.actionBtnText}>Post</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footerNav}>
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
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  editor: { padding: 16, paddingBottom: 80 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', marginRight: 10 },
  label: { fontWeight: 'bold', fontSize: 16, marginTop: 12 },
  inputLine: { borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 8, fontSize: 16 },
  description: { minHeight: 80, textAlignVertical: 'top' },
  imageBtn: { marginTop: 16, backgroundColor: '#eee', padding: 10, borderRadius: 8, alignItems: 'center' },
  imageBtnText: { color: '#333', fontSize: 16 },
  previewImage: { width: '100%', height: 200, marginTop: 10, borderRadius: 8 },
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
  bottomButtons: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, marginBottom: 20
  },
  actionBtn: {
    flex: 1, marginHorizontal: 8, paddingVertical: 12,
    borderRadius: 6, alignItems: 'center'
  },
  cancelBtn: { backgroundColor: '#d32f2f' },
  postBtn: { backgroundColor: '#1565c0' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footerNav: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10,
    borderTopWidth: 1, borderColor: '#ddd', backgroundColor: '#fff'
  },
  navItem: { alignItems: 'center' },
  navIcon: { width: 24, height: 24, marginBottom: 4 },
  navText: { fontSize: 12, color: '#555' },
});

export default CreatePost;
