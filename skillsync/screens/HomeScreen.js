import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Image,
  TouchableOpacity, Alert, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const API_BASE = 'http://192.168.41.31:6000';
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [posts, setPosts]                 = useState([]);
  const [search, setSearch]               = useState('');
  const [comments, setComments]           = useState({});
  const [commentImages, setCommentImages] = useState({});
  const [user, setUser]                   = useState({
    username: '', totalScore: 0, avatar: null, grade: null,
  });
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const me = await res.json();
          setUser({
            username:   me.username,
            totalScore: me.totalScore,
            avatar:     me.avatar,
            grade:      me.grade,
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (user.grade == null) return;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(
          `${API_BASE}/api/search/posts?grade=${user.grade}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await res.json();
        Array.isArray(data) ? setPosts(data) : console.warn(data);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Cannot load posts');
      }
    })();
  }, [user.grade]);

  const handleCommentChange = (postId, text) =>
    setComments(prev => ({ ...prev, [postId]: text }));

  const pickCommentImage = async postId => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission required', 'We need access to your photos.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.cancelled) {
      const uri      = result.uri;
      const filename = uri.split('/').pop();
      const match    = /\.(\w+)$/.exec(filename);
      const type     = match ? `image/${match[1]}` : 'image';
      setCommentImages(prev => ({
        ...prev,
        [postId]: { uri, name: filename, type }
      }));
    }
  };

  const submitComment = async postId => {
    const text = (comments[postId] || '').trim();
    if (!text && !commentImages[postId]) {
      return Alert.alert('Empty', 'Write text or attach an image.');
    }
    const token = await AsyncStorage.getItem('userToken');
    const form  = new FormData();
    form.append('msg', text);
    if (commentImages[postId]) {
      form.append('image', commentImages[postId]);
    }
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        body: form
      });
      if (!res.ok) throw new Error(await res.text());
      setComments(prev => ({ ...prev, [postId]: '' }));
      setCommentImages(prev => ({ ...prev, [postId]: null }));
      Alert.alert('Success', 'Comment posted');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Cannot post comment');
    }
  };

  const fileUrlFrom = relPath => {
    if (!relPath) return null;
    const encoded = encodeURIComponent(relPath.replace(/\\/g, '/'));
    return `${API_BASE}/api/file?path=${encoded}`;
  };

  const filtered = posts.filter(post =>
    (post.content || post.description || '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={100}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            {user.avatar
              ? <Image source={{ uri: fileUrlFrom(user.avatar) }} style={styles.profileImg} />
              : <Image source={require('../assets/Sign-in.png')} style={styles.profileImg} />
            }
          </TouchableOpacity>
          <View style={styles.headerTextGroup}>
            <Text style={styles.feedTitle}>Your Feed</Text>
            <Text style={styles.points}>
              {user.username} · {user.totalScore} pts · Grade {user.grade}
            </Text>
          </View>
          <Image source={require('../assets/SkillSyncLogo.png')} style={styles.logo} />
        </View>

        {/* SEARCH */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.input}
            placeholder="Searching Posts 🔍"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* POSTS */}
        <ScrollView style={styles.feedContainer} contentContainerStyle={{ paddingBottom: 20 }}>
          {filtered.map(post => (
            <View key={post._id} style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <Image source={require('../assets/Sign-in.png')} style={styles.feedProfile} />
                <Text style={styles.feedAuthor}>{post.author || 'Unknown'}</Text>
              </View>
              <Text style={styles.feedContent}>
                {post.content || post.description || ''}
              </Text>
              {post.imagePath && (
                <Image
                  source={{ uri: fileUrlFrom(post.imagePath) }}
                  style={styles.feedImage}
                />
              )}
              {/* COMMENT BOX */}
              <View style={styles.commentBox}>
                <TouchableOpacity onPress={() => pickCommentImage(post._id)} style={styles.imageButton}>
                  <Image source={require('../assets/image.png')} style={styles.imageIcon} />
                </TouchableOpacity>
                {commentImages[post._id] && (
                  <Image source={{ uri: commentImages[post._id].uri }} style={styles.thumbnail} />
                )}
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  placeholderTextColor="#888"
                  multiline
                  value={comments[post._id] || ''}
                  onChangeText={t => handleCommentChange(post._id, t)}
                />
                <TouchableOpacity style={styles.commentButton} onPress={() => submitComment(post._id)}>
                  <Text style={styles.commentButtonText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FOOTER NAV */}
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
  container: { flex: 1, backgroundColor: '#edffff', position: 'relative' },
  content: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 15, marginTop: 20
  },
  profileImg: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#000066' },
  headerTextGroup: { flex: 1, marginLeft: 10 },
  feedTitle: { fontSize: 22, fontWeight: 'bold', color: '#17296a' },
  points: { fontSize: 14, color: '#c00', marginTop: 4 },
  logo: { width: 40, height: 40 },
  searchBar: { marginHorizontal: 20, marginBottom: 10 },
  input: { backgroundColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 16 },
  feedContainer: { paddingHorizontal: 20 },
  feedCard: { backgroundColor: '#f1f1f1', borderRadius: 12, padding: 16, marginBottom: 16 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  feedProfile: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  feedAuthor: { fontWeight: 'bold', fontSize: 16 },
  feedContent: { fontSize: 14, marginVertical: 8 },
  feedImage: { height: 160, width: width - 72, borderRadius: 8, marginTop: 10 },
  commentBox: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  imageButton: { padding: 6, marginRight: 8 },
  imageIcon: { width: 24, height: 24 },
  thumbnail: { width: 40, height: 40, borderRadius: 8, marginRight: 8 },
  commentInput: {
    flex: 1, backgroundColor: '#fff', borderColor: '#ccc',
    borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14,
    minHeight: 40, textAlignVertical: 'top'
  },
  commentButton: {
    backgroundColor: '#000066', paddingVertical: 10,
    paddingHorizontal: 16, borderRadius: 8, marginLeft: 8
  },
  commentButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  navBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', backgroundColor: '#fff', height: 60,
    borderTopColor: '#ccc', borderTopWidth: 1,
    position: 'absolute', bottom: 0, left: 0, right: 0,
    zIndex: 10, elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0
  },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 24, height: 24, marginBottom: 2 },
  navText: { fontSize: 11, color: '#000d63', fontWeight: '500' },
});
