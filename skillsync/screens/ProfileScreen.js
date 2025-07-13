import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Image,
  TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  Dimensions, Platform, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';

const API_BASE = 'http://192.168.41.31:6000';
const { width } = Dimensions.get('window');
const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'Social', 'History'];

// Tag component for multi-select
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

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState({
    username: '', email: '', grade: 7,
    strengths: [], weaknesses: [],
    avatar: null, password: '', confirm: '',
    note: '' // Added back the note field
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [postCount, setPostCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fileUrlFrom = relPath => {
    if (!relPath) return null;
    const p = relPath.replace(/\\/g, '/');
    return `${API_BASE}/api/file?path=${encodeURIComponent(p)}`;
  };

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return navigation.replace('Login');
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Failed to parse error' }));
          throw new Error(errorData.message || 'Failed to load user profile. Please try again.');
        }
        const user = await res.json();
        setProfile({
          username: user.username,
          email: user.email,
          grade: Number(user.grade) || 7,
          strengths: user.skills?.strengths || [],
          weaknesses: user.skills?.weaknesses || [],
          avatar: user.avatar,
          password: '',
          confirm: '',
          note: user.note || '' // Added back the note field
        });
        setPostCount(user.totalPosts || 0);
        setPoints(user.totalScore || 0);
      } catch (e) {
        Alert.alert('Error', e.message || 'Failed to load profile. Check your network.');
        console.error("Profile load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission required', 'Need photo library access to pick an avatar.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) {
      const uri = result.uri || result.assets?.[0]?.uri;
      if (!uri) return;
      const name = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(name);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      setAvatarFile({ uri, name, type });
    }
  };

  const toggleSubject = (listName, subj) => {
    setProfile(p => {
      const arr = p[listName];
      return {
        ...p,
        [listName]: arr.includes(subj)
          ? arr.filter(s => s !== subj)
          : [...arr, subj]
      };
    });
  };

  const onSave = async () => {
    if (profile.password && profile.password !== profile.confirm) {
      return Alert.alert('Input Error', 'Passwords do not match.');
    }

    setIsSaving(true);
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      setIsSaving(false);
      return Alert.alert('Authentication Required', 'You are not logged in. Please log in again.');
    }

    const form = new FormData();
    form.append('username', profile.username);
    form.append('grade', String(profile.grade));
    form.append('note', profile.note); // Added back note to form data
    form.append('skills', JSON.stringify({
      strengths: profile.strengths,
      weaknesses: profile.weaknesses
    }));
    if (profile.password) form.append('password', profile.password);
    if (avatarFile) {
      form.append('avatar', {
        uri: avatarFile.uri,
        name: avatarFile.name,
        type: avatarFile.type
      });
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Profile update failed.';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const updated = await res.json();
      Alert.alert('Success', 'Profile updated successfully!');
      setProfile(p => ({
        ...p,
        password: '', confirm: '', avatar: updated.avatar,
        note: updated.note || '' // Update note from response
      }));
      setAvatarFile(null);
    } catch (e) {
      console.error("Profile save error:", e);
      if (e.message && e.message.includes('Network request failed') || e.message.includes('Failed to fetch')) {
        Alert.alert(
          'Network Error',
          'Could not connect to the server. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', e.message || 'An unexpected error occurred during save.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000066" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Image source={require('../assets/SkillSyncLogo.png')} style={styles.logo} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrapper}>
            <Image
              source={
                avatarFile
                  ? { uri: avatarFile.uri }
                  : profile.avatar
                    ? { uri: fileUrlFrom(profile.avatar) }
                    : require('../assets/Sign-in.png')
              }
              style={styles.profilePic}
            />
            <View style={styles.plus}><Text style={styles.plusText}>+</Text></View>
          </TouchableOpacity>
          <View style={styles.overlay}>
            <Text style={styles.name}>{profile.username}</Text>
            <View style={styles.postPoint}>
              <Text>{postCount} Posts</Text>
              <Text>{points} Points</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.accountBtn}>
            <Text style={styles.btnText}>Your Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <LabelledInput label="Name"
          value={profile.username}
          onChange={v => setProfile(p => ({ ...p, username: v }))}
        />
        <LabelledInput label="Account Name"
          value={profile.email}
          editable={false}
        />
        <LabelledInput label="Password"
          secure={!showPass}
          icon={showPass ? '🙈' : '👁️'}
          onIconPress={() => setShowPass(f => !f)}
          value={profile.password}
          onChange={v => setProfile(p => ({ ...p, password: v }))}
        />
        <LabelledInput label="Confirm Password"
          secure={!showConfirm}
          icon={showConfirm ? '🙈' : '👁️'}
          onIconPress={() => setShowConfirm(f => !f)}
          value={profile.confirm}
          onChange={v => setProfile(p => ({ ...p, confirm: v }))}
        />

        {/* About Me Textarea - Restored */}
        <View style={{ marginBottom: 15 }}>
          <Text style={styles.label}>About Me</Text>
          <TextInput
            style={styles.textarea}
            value={profile.note}
            onChangeText={v => setProfile(p => ({ ...p, note: v }))}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Tell us about yourself..."
          />
        </View>

        {/* Multi-select teach subjects */}
        <Text style={styles.label}>I'm good on subjects:</Text>
        <FlatList
          data={SUBJECTS}
          keyExtractor={item => item}
          horizontal
          contentContainerStyle={styles.tagList}
          renderItem={({ item }) => (
            <Tag
              label={item}
              selected={profile.strengths.includes(item)}
              onPress={() => toggleSubject('strengths', item)}
            />
          )}
        />

        {/* Multi-select learn subjects */}
        <Text style={styles.label}>I'm not good on subjects:</Text>
        <FlatList
          data={SUBJECTS}
          keyExtractor={item => item}
          horizontal
          contentContainerStyle={styles.tagList}
          renderItem={({ item }) => (
            <Tag
              label={item}
              selected={profile.weaknesses.includes(item)}
              onPress={() => toggleSubject('weaknesses', item)}
            />
          )}
        />

        {/* Grade slider */}
        <Text style={styles.label}>Grade: {profile.grade}</Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={7} maximumValue={12} step={1}
          value={profile.grade}
          onValueChange={v => setProfile(p => ({ ...p, grade: v }))}
        />
      </ScrollView>

      {/* Footer Nav */}
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

const LabelledInput = ({ label, value, onChange, secure, icon, onIconPress, editable = true }) => (
  <View style={{ marginBottom: 15 }}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputGroup}>
      <TextInput
        style={styles.input}
        value={value}
        secureTextEntry={secure}
        onChangeText={onChange}
        editable={editable}
      />
      {icon && (
        <TouchableOpacity onPress={onIconPress}>
          <Text style={{ fontSize: 20, padding: 4 }}>{icon}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { backgroundColor: '#000066', height: 50, alignItems: 'center' },
  logo: { height: 30, resizeMode: 'contain' },
  body: { padding: 20, paddingBottom: 80 },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarWrapper: { position: 'relative' },
  profilePic: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#000' },
  plus: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#fff', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  plusText: { fontWeight: 'bold', fontSize: 14 },
  overlay: { marginLeft: 20 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  postPoint: { flexDirection: 'row', justifyContent: 'space-between', width: width * 0.4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 },
  accountBtn: { backgroundColor: '#0052cc', padding: 10, borderRadius: 8, width: '48%', alignItems: 'center' },
  saveBtn: { backgroundColor: '#7ED321', padding: 10, borderRadius: 8, width: '48%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#000066' },
  label: { fontSize: 16, color: '#003399', fontWeight: 'bold', marginBottom: 6 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#000' },
  input: { flex: 1, fontSize: 16, paddingVertical: 6 },
  // Textarea styles - Restored
  textarea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top'
  },
  tagList: { paddingVertical: 8 },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#003399', marginRight: 8 },
  tagSelected: { backgroundColor: '#003399' },
  tagText: { fontSize: 14, color: '#003399' },
  tagTextSelected: { color: '#fff' },
  navBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 80 : 60, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#ccc', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  navItem: { alignItems: 'center' },
  navIcon: { width: 24, height: 24, marginBottom: 4 },
  navText: { fontSize: 11, color: '#000d63', fontWeight: '500' }
});