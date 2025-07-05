import React, { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function RegisterScreen() {
  const scaleAnim = new Animated.Value(1);
  const [imageUri, setImageUri] = useState(require('../assets/signin.jpg'));
  const [imageFile, setImageFile] = useState(null); // 👈 ส่ง API ได้

  const handlePickImage = async () => {
    // ขอ permission ถ้ายังไม่ได้
    if (Platform.OS !== 'web') {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required!');
        return;
      }
    }

    // เปิด picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.cancelled) {
      setImageUri({ uri: result.uri });
      setImageFile(result); // 👈 เก็บไว้สำหรับ API
    }
    else if(result.canceled){
      setImageFile(require('../assets/signin.jpg'));
    }
  };

  const handleCreate = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // คุณสามารถใช้ imageFile.uri ส่งเข้า API ได้ที่นี่
      alert('Account Created!\nImage URI:\n' + (imageFile?.uri || 'none'));
    });
  };

  return (
    <View style={styles.body}>
      <View style={styles.header} />
      <View style={styles.container}>
        <TouchableOpacity style={styles.profileSection} onPress={handlePickImage}>
          <Image source={imageUri} style={styles.profileImage} />
          <Text style={styles.addProfileText}>Tap to add your Profile</Text>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} secureTextEntry />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput style={styles.input} secureTextEntry />
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
  body: { flex: 1, backgroundColor: '#fff' },
  header: { width: '100%', height: 40, backgroundColor: '#000D59' },
  container: { padding: 20, alignItems: 'center' },
  profileSection: { alignItems: 'center', marginVertical: 20 },
  profileImage: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#ccc',
  },
  addProfileText: { marginTop: 5, fontSize: 14 },
  inputGroup: { width: '100%', maxWidth: 300, marginBottom: 15 },
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
