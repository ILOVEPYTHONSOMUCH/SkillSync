// RegisterScreen.js

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  TouchableOpacity,
  Platform,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.41.31:6000/api/auth';

export default function RegisterScreen({ navigation }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Profile image
  const [imageFile, setImageFile] = useState(null);
  const [imageUri, setImageUri]   = useState(null);

  // Form fields
  const [username, setUsername]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [grade, setGrade]             = useState('');

  const handlePickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission required', 'We need access to your photos.');
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (!result.cancelled) {
      setImageUri(result.uri);
      setImageFile(result);
    }
  };

  const handleCreate = async () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
    ]).start();

    // Validate
    if (!username || !email || !password || !confirmPassword || !grade) {
      return Alert.alert('Error', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
    }
    if (password !== confirmPassword) {
      return Alert.alert('Error', 'รหัสผ่านไม่ตรงกัน');
    }

    // Build FormData
    const form = new FormData();
    form.append('username', username);
    form.append('email', email);
    form.append('password', password);
    form.append('grade', grade);
    if (imageFile) {
      form.append('avatar', {
        uri: imageFile.uri,
        name: 'avatar.jpg',
        type: 'image/jpeg'
      });
    }

    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        body: form
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || 'Registration failed');
      }

      // Save token and navigate
      await AsyncStorage.setItem('userToken', json.token);
      console.log('Token saved:', json.token);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });

    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.body}>
      <View style={styles.header} />
      <View style={styles.container}>
        <TouchableOpacity style={styles.profileSection} onPress={handlePickImage}>
          <Image
            source={imageUri ? { uri: imageUri } : require('../assets/Sign-in.png')}
            style={styles.profileImage}
          />
          <Text style={styles.addProfileText}>Tap to add your Profile</Text>
        </TouchableOpacity>

        {/* Username */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirm}
            secureTextEntry
          />
        </View>

        {/* Grade */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Grade</Text>
          <TextInput
            style={styles.input}
            value={grade}
            onChangeText={setGrade}
          />
        </View>

        <Pressable onPress={handleCreate}>
          <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.buttonText}>Create Account</Text>
          </Animated.View>
        </Pressable>
      </View>

      <Image
        source={require('../assets/SkillSyncLogo.png')}
        style={styles.footerLogo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },
  header: { width: '100%', height: 40, backgroundColor: '#000D59' },
  container: { flex: 1, width: '100%', padding: 20, alignItems: 'center' },
  profileSection: { alignItems: 'center', marginVertical: 20 },
  profileImage: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#ccc',
  },
  addProfileText: { marginTop: 5, fontSize: 14 },
  inputGroup: { width: '80%', maxWidth: 300, marginBottom: 15 },
  label: { fontSize: 16, marginBottom: 5 },
  input: {
    backgroundColor: '#B7C2C1', borderRadius: 12, padding: 10, fontSize: 16,
  },
  button: {
    backgroundColor: '#A6E7F6',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  buttonText: { fontSize: 18, fontWeight: '600' },
  footerLogo: {
    width: 50, height: 50, position: 'absolute', right: 10, bottom: 10,
  },
});
