import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Image,
  TouchableOpacity, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';

const API_BASE = 'http://192.168.41.31:6000';

function getFileUrl(diskPath) {
  if (!diskPath) return null;
  const encoded = encodeURIComponent(diskPath.replace(/\\/g, '/'));
  return `${API_BASE}/api/file?path=${encoded}`;
}

const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'Social', 'History'];

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState({
    username: '', email: '', grade: 7,
    strengths: '', weaknesses: '',
    avatar: null, password: '', confirm: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [postCount, setPostCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return navigation.replace('Login');
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = await res.json();
        setProfile({
          ...profile,
          username: user.username,
          email: user.email,
          grade: Number(user.grade || 7),
          strengths: (user.skills?.strengths || [])[0] || '',
          weaknesses: (user.skills?.weaknesses || [])[0] || '',
          avatar: user.avatar
        });
        setPostCount(user.totalPosts || 0);
        setPoints(user.totalScore || 0);
      } catch (e) {
        Alert.alert('Error', 'Failed to load profile');
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });
    if (!result.cancelled) {
      setAvatarFile(result);
      setProfile({ ...profile, avatar: result.uri });
    }
  };

  const onSave = async () => {
    if (profile.password && profile.password !== profile.confirm) {
      return Alert.alert('Error', 'Passwords do not match');
    }
    const token = await AsyncStorage.getItem('userToken');
    const form = new FormData();
    form.append('username', profile.username);
    form.append('grade', profile.grade);
    form.append('skills.strengths', profile.strengths);
    form.append('skills.weaknesses', profile.weaknesses);
    if (profile.password) form.append('password', profile.password);
    if (avatarFile) {
      form.append('avatar', {
        uri: avatarFile.uri,
        name: 'avatar.jpg',
        type: 'image/jpeg'
      });
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        body: form
      });
      if (!res.ok) {
        const text = await res.text();
        return Alert.alert('Error', text);
      }
      Alert.alert('Success', 'Profile updated');
      setProfile({ ...profile, password: '', confirm: '' });
    } catch (e) {
      Alert.alert('Error', 'Save failed');
      console.error(e);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#000066" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <Image source={require('../assets/SkillSyncLogo.png')} style={s.logo} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.profileSection}>
          <TouchableOpacity onPress={pickAvatar} style={s.avatarWrapper}>
            <Image
              source={
                profile.avatar
                  ? { uri: getFileUrl(profile.avatar) }
                  : require('../assets/Sign-in.png')
              }
              style={s.profilePic}
            />
            <View style={s.plus}><Text style={s.plusText}>+</Text></View>
          </TouchableOpacity>

          <View style={s.overlay}>
            <Text style={s.name}>{profile.username}</Text>
            <View style={s.postPoint}>
              <Text>{postCount} Posts</Text>
              <Text>{points} Points</Text>
            </View>
          </View>
        </View>

        <View style={s.actionRow}>
          <TouchableOpacity style={s.accountBtn}><Text style={s.btnText}>Your Account</Text></TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={onSave}><Text style={s.btnText}>Save</Text></TouchableOpacity>
        </View>

        <LabelledInput label="Name" value={profile.username} onChange={v => setProfile({ ...profile, username: v })} />
        <LabelledInput label="Account Name" value={profile.email} editable={false} />

        <LabelledInput
          label="Password" value={profile.password} onChange={v => setProfile({ ...profile, password: v })}
          secure={!showPass}
          icon={showPass ? '🙈' : '👁️'} onIconPress={() => setShowPass(!showPass)}
        />
        <LabelledInput
          label="Confirm Password" value={profile.confirm} onChange={v => setProfile({ ...profile, confirm: v })}
          secure={!showConfirm}
          icon={showConfirm ? '🙈' : '👁️'} onIconPress={() => setShowConfirm(!showConfirm)}
        />

        <Text style={s.label}>I'm good on subject:</Text>
        <Picker
          selectedValue={profile.strengths}
          onValueChange={v => setProfile({ ...profile, strengths: v })}
          style={s.picker}
        >
          {SUBJECTS.map(sub => <Picker.Item label={sub} value={sub} key={sub} />)}
        </Picker>

        <Text style={s.label}>I'm not good on subject:</Text>
        <Picker
          selectedValue={profile.weaknesses}
          onValueChange={v => setProfile({ ...profile, weaknesses: v })}
          style={s.picker}
        >
          {SUBJECTS.map(sub => <Picker.Item label={sub} value={sub} key={sub} />)}
        </Picker>

        <Text style={s.label}>Grade: {profile.grade}</Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={7}
          maximumValue={12}
          step={1}
          value={Number(profile.grade)}
          minimumTrackTintColor="#000066"
          maximumTrackTintColor="#ccc"
          onValueChange={v => setProfile({ ...profile, grade: v })}
        />
      </ScrollView>
    </View>
  );
}

const LabelledInput = ({ label, value, onChange, secure, icon, onIconPress, editable = true }) => (
  <View style={{ marginBottom: 15 }}>
    <Text style={s.label}>{label}</Text>
    <View style={s.inputGroup}>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    backgroundColor: '#000066',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: {
    height: 30,
    resizeMode: 'contain'
  },
  body: { padding: 20 },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarWrapper: { position: 'relative' },
  profilePic: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#000' },
  plus: {
    position: 'absolute', bottom: -5, right: -5,
    backgroundColor: '#fff', width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000'
  },
  plusText: { fontWeight: 'bold', fontSize: 14 },
  overlay: { marginLeft: 20 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  postPoint: { flexDirection: 'row', gap: 20 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 },
  accountBtn: {
    backgroundColor: '#0052cc', padding: 10, borderRadius: 8, width: '48%',
    alignItems: 'center'
  },
  saveBtn: {
    backgroundColor: '#7ED321', padding: 10, borderRadius: 8, width: '48%',
    alignItems: 'center'
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  label: { fontSize: 16, color: '#003399', fontWeight: 'bold', marginBottom: 6 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: '#000'
  },
  input: {
    flex: 1, fontSize: 16, paddingVertical: 6
  },
  picker: {
    backgroundColor: '#f9f9f9',
    marginBottom: 20
  }
});
