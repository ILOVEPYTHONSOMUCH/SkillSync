// LessonScreen.js

import React, { useEffect, useState } from 'react';
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
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';

const API_BASE = 'http://10.56.138.58:6000';

export default function LessonScreen() {
  const [lessons, setLessons] = useState([]);
  const [search, setSearch]   = useState('');
  const [userGrade, setUserGrade] = useState(null);
  const navigation = useNavigation();

  // Fetch user profile to get grade
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res   = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const me = await res.json();
          setUserGrade(me.grade);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Fetch lessons by grade once we know userGrade
  useEffect(() => {
    if (userGrade == null) return;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res   = await fetch(
          `${API_BASE}/api/search/lessons?grade=${userGrade}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) setLessons(data);
        else console.warn('Expected lessons array, got:', data);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Cannot load lessons');
      }
    })();
  }, [userGrade]);

  // Filter client‑side by title/subject
  const filtered = lessons.filter(item => {
    const text = `${item.title || ''} ${item.subject || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const fileUrl = path =>
    path
      ? `${API_BASE}/api/file?path=${encodeURIComponent(path.replace(/\\/g,'/'))}`
      : null;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={100}
      >
        {/* TOP BAR */}
        <View style={styles.topBar} />

        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Lessons</Text>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => navigation.navigate('Upload')}
            >
              <AntDesign name="plus" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Image source={require('../assets/SkillSyncLogo.png')} style={styles.logo}/>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBox}
            placeholder="Search Lessons..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* LESSON CARDS */}
        <ScrollView contentContainerStyle={styles.cardContainer}>
          {filtered.map(lesson => (
            <View key={lesson._id} style={styles.card}>
              {lesson.imagePath && (
                <Image
                  source={{ uri: fileUrl(lesson.imagePath) }}
                  style={styles.cardImage}
                />
              )}
              <View style={styles.info}>
                <View style={styles.infoRow}>
                  <Text style={styles.author}>{lesson.user?.username || 'Unknown'}</Text>
                  <View style={[styles.badge, { backgroundColor: '#28a745' }]}>
                    <Text style={styles.badgeText}>{lesson.subject}</Text>
                  </View>
                </View>
                <Text style={styles.titleText}>{lesson.title}</Text>
                <Text style={styles.descText}>{lesson.description}</Text>
              </View>
              {/* Comment box */}
              <View style={styles.commentBox}>
                <TextInput
                  style={styles.textarea}
                  placeholder="Write a comment..."
                  placeholderTextColor="#888"
                  multiline
                />
                <TouchableOpacity style={styles.postButton}>
                  <Text style={styles.postButtonText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FOOTER NAV */}
      <View style={styles.navBar}>
        {[
          { name: 'Home',   icon: require('../assets/home.png'),   screen: 'Home' },
          { name: 'Quiz',   icon: require('../assets/quiz.png'),   screen: 'Quiz' },
          { name: 'Lesson', icon: require('../assets/lesson.png'), screen: 'Lesson' },
          { name: 'Post',   icon: require('../assets/post.png'),   screen: 'Post' },
          { name: 'Chat',   icon: require('../assets/chatfeed.png'), screen: 'ChatFeed' },
          { name: 'Profile',icon: require('../assets/Sign-in.png'), screen: 'Profile' },
        ].map(item => (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Image source={item.icon} style={styles.navIcon}/>
            <Text style={styles.navText}>{item.name.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  content:   { flex: 1 },

  topBar: { backgroundColor: '#000c52', height: 50 },

  headerContainer: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000c52' },
  plusButton: {
    backgroundColor: '#28a745',
    marginLeft: 10,
    padding: 6,
    borderRadius: 20
  },
  logo: { width: 40, height: 40 },

  searchContainer: { padding: 10, backgroundColor: 'white' },
  searchBox: {
    backgroundColor: '#fff',
    borderColor: 'lightgray',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16
  },

  cardContainer: {
    padding: 10,
    alignItems: 'center'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: width * 0.9,
    marginBottom: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  cardImage: { width: '100%', height: 160, borderRadius: 10 },
  info: { marginTop: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  author: { fontWeight: 'bold', fontSize: 16 },
  badge: {
    marginLeft: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  badgeText: { color: 'white', fontSize: 12 },
  titleText: { fontSize: 18, marginVertical: 4 },
  descText: { fontSize: 14, color: '#555' },

  commentBox: { marginTop: 10 },
  textarea: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 40,
    textAlignVertical: 'top',
    fontSize: 14
  },
  postButton: {
    backgroundColor: '#000c52',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-end',
    marginTop: 6
  },
  postButtonText: { color: 'white', fontWeight: 'bold' },

  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingVertical: Platform.OS === 'ios' ? 20 : 10
  },
  navItem: { alignItems: 'center' },
  navIcon: { width: 24, height: 24, marginBottom: 4 },
  navText: { fontSize: 11, color: '#000d63', fontWeight: '500' }
});
