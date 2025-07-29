// LoginScreen.js

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  Image,
  Animated,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../components/NavbarAndTheme";
const BASE_URL = API_BASE_URL + '/auth';

export default function LoginScreen({ navigation }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [identifier, setIdentifier] = useState(''); // username or email
  const [password, setPassword]     = useState('');

  const handlePress = async () => {
    // button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
    ]).start(async () => {
      // validate inputs
      if (!identifier || !password) {
        return Alert.alert('Error', 'กรุณากรอก Username/Email และ Password');
      }

      try {
        // call login API
        const res = await fetch(`${BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Login failed');
        }

        // save token
        await AsyncStorage.setItem('userToken', json.token);
        console.log('Token saved:', json.token);

        // navigate to Home (reset stack so user cannot go back)
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } catch (err) {
        console.error(err);
        Alert.alert('Login Error', err.message);
      }
    });
  };

  return (
    <View style={styles.body}>
      <View style={styles.header} />
      <View style={styles.container}>
        <Image style={styles.avatar} source={require('../assets/Sign-in.png')} />
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username or Email</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableWithoutFeedback onPress={handlePress}>
          <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.buttonText}>Sign In</Text>
          </Animated.View>
        </TouchableWithoutFeedback>
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
  body: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height: 50,
    backgroundColor: '#000066',
  },
  container: {
    marginTop: 60,
    width: '100%',
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#d9d9d9',
    marginBottom: 30,
  },
  inputGroup: {
    width: '80%',
    maxWidth: 300,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#adbab7',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#9befff',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 2, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerLogo: {
    width: 40,
    height: 40,
    position: 'absolute',
    right: 10,
    bottom: 10,
  },
});
