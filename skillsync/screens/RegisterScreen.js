// RegisterScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../components/NavbarAndTheme";

const BASE_URL = API_BASE_URL + '/auth';

export default function RegisterScreen({ navigation }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [imageUri, setImageUri] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [grade, setGrade]       = useState(7);

  // Request permission
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Media library access is needed to choose a profile image.');
        }
      }
    })();
  }, []);

  // Launch image library
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      // New API: if user didn't cancel, result.canceled === false
      if (!result.canceled && result.assets?.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error('ImagePicker Error:', e);
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  // Handle register
  const handleCreate = async () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
    ]).start();

    // Validation
    if (!username || !email || !password || !confirm) {
      return Alert.alert('Error', 'Please fill all fields.');
    }
    if (password !== confirm) {
      return Alert.alert('Error', 'Passwords do not match.');
    }

    // Build FormData
    const form = new FormData();
    form.append('username', username);
    form.append('email', email);
    form.append('password', password);
    form.append('grade', grade.toString());
    if (imageUri) {
      // The field name must match multer.single('avatar')
      form.append('avatar', {
        uri: imageUri,
        name: 'avatar.jpg',
        type: 'image/jpeg'
      });
    }

    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        // **Do not set Content-Type manually**: let fetch add the correct boundary header
        body: form
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || 'Registration failed');
      }

      // Save token and navigate
      await AsyncStorage.setItem('userToken', json.token);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.body}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header} />

        {/* Avatar picker */}
        <TouchableOpacity onPress={pickImage} style={styles.profileSection}>
          <Image
            source={imageUri ? { uri: imageUri } : require('../assets/Sign-in.png')}
            style={styles.profileImage}
          />
          <Text style={styles.addProfileText}>Tap to add Profile Image</Text>
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
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        {/* Grade slider */}
        <View style={styles.sliderGroup}>
          <Text style={styles.label}>Grade: {grade}</Text>
          <Slider
            style={styles.slider}
            minimumValue={7}
            maximumValue={12}
            step={1}
            value={grade}
            onValueChange={setGrade}
            minimumTrackTintColor="#000066"
            maximumTrackTintColor="#ccc"
            thumbTintColor="#000066"
          />
        </View>

        {/* Create Account */}
        <TouchableOpacity onPress={handleCreate}>
          <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.buttonText}>Create Account</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Footer logo */}
        <Image
          source={require('../assets/SkillSyncLogo.png')}
          style={styles.footerLogo}
          resizeMode="contain"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: '#fff' },
  header: { height: 40, backgroundColor: '#000D59', width: '100%' },
  container: { padding: 20, alignItems: 'center' },
  profileSection: { alignItems: 'center', marginVertical: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ccc' },
  addProfileText: { marginTop: 5, fontSize: 14, color: '#666' },
  inputGroup: { width: '80%', maxWidth: 300, marginBottom: 15 },
  label: { fontSize: 16, marginBottom: 5 },
  input: { backgroundColor: '#B7C2C1', borderRadius: 12, padding: 10, fontSize: 16 },
  sliderGroup: { width: '80%', marginVertical: 20 },
  slider: { width: '100%', height: 40 },
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
  buttonText: { fontSize: 18, fontWeight: '600', color: '#000' },
  footerLogo: { width: 50, height: 50, position: 'absolute', right: 10, bottom: 10 },
});
