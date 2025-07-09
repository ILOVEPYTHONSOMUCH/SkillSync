import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const API_BASE = 'http://192.168.222.1:6000';
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState({ username: '', totalScore: 0, avatar: null, grade: null });
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const me = await res.json();
          setUser({ username: me.username, totalScore: me.totalScore, avatar: me.avatar, grade: me.grade });
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const fileUrlFrom = relPath => {
    if (!relPath) return null;
    const encoded = encodeURIComponent(relPath.replace(/\\/g, '/'));
    return `${API_BASE}/api/file?path=${encoded}`;
  };

  const loadPosts = useCallback(async () => {
    if (user.grade == null) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE}/api/search/posts?grade=${user.grade}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // If the response is not OK, but it's a 404 (Not Found), it might mean no posts
        // For other errors, still throw an error
        if (res.status === 404) {
          setPosts([]); // Explicitly set posts to empty if 404, indicating no posts found
          return;
        }
        throw new Error('Failed to load posts');
      }
      const rawPosts = await res.json();
      const enrichedPosts = await Promise.all(
        rawPosts.map(async (post) => {
          try {
            const userRes = await fetch(`${API_BASE}/api/user/${post.user}`);
            const userInfo = await userRes.json();
            return {
              ...post,
              authorUsername: userInfo.username,
              authorAvatar: userInfo.avatar,
            };
          } catch (e) {
            return {
              ...post,
              authorUsername: 'Unknown',
              authorAvatar: null,
            };
          }
        })
      );
      setPosts(enrichedPosts);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Cannot load posts');
      setPosts([]); // Ensure posts are cleared on error to avoid stale data
    }
  }, [user.grade]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const filtered = posts.filter(post =>
    (post.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={100}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            {user.avatar ? (
              <Image source={{ uri: fileUrlFrom(user.avatar) }} style={styles.profileImg} />
            ) : (
              <Image source={require('../assets/Sign-in.png')} style={styles.profileImg} />
            )}
          </TouchableOpacity>
          <View style={styles.headerTextGroup}>
            <Text style={styles.feedTitle}>Your Feed</Text>
            <Text style={styles.points}>
              {user.username} · {user.totalScore} pts · Grade {user.grade}
            </Text>
          </View>
          <Image source={require('../assets/SkillSyncLogo.png')} style={styles.logo} />
        </View>

        <View style={styles.searchBar}>
          <TextInput
            style={styles.input}
            placeholder="Search Posts 🔍"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView style={styles.feedContainer} contentContainerStyle={{ paddingBottom: 20 }}>
          {filtered.length === 0 ? (
            <View style={styles.noPostsContainer}>
              <Text style={styles.noPostsText}>
                It looks like there are no posts here yet.
                {"\n"}Be the first to create one!
              </Text>
              <TouchableOpacity
                style={styles.createPostButton}
                onPress={() => navigation.navigate('Post')}
              >
                <Text style={styles.createPostButtonText}>Create New Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map(post => (
              <View key={post._id} style={styles.feedCard}>
                <View style={styles.feedHeader}>
                  {post.authorAvatar ? (
                    <Image source={{ uri: fileUrlFrom(post.authorAvatar) }} style={styles.feedProfile} />
                  ) : (
                    <Image source={require('../assets/Sign-in.png')} style={styles.feedProfile} />
                  )}
                  <Text style={styles.feedAuthor}>{post.authorUsername}</Text>
                </View>
                <Text style={styles.feedContent}>{post.description}</Text>
                {post.image && (
                  <Image
                    source={{ uri: fileUrlFrom(post.image) }}
                    style={styles.feedImage}
                    resizeMode="cover"
                  />
                )}
                <TouchableOpacity
                  style={styles.commentBox}
                  onPress={() => navigation.navigate('CommentAdd', { postId: post._id })}
                >
                  <Image source={require('../assets/image.png')} style={styles.imageIcon} />
                  <Text style={styles.commentPlaceholder}>Write a comment...</Text>
                  <Text style={styles.commentSubmit}>Post</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, marginTop: 20 },
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
  imageIcon: { width: 24, height: 24, marginRight: 8 },
  commentPlaceholder: { flex: 1, color: '#888' },
  commentSubmit: { color: '#000066', fontWeight: 'bold' },
  noPostsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50, // Adjust as needed to position it well
  },
  noPostsText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  createPostButton: {
    backgroundColor: '#000066',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  createPostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
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
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 24, height: 24, marginBottom: 2 },
  navText: { fontSize: 11, color: '#000d63', fontWeight: '500' },
});