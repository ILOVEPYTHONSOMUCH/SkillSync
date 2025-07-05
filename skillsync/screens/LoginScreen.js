import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  Image,
  Animated,
  Pressable,
} from 'react-native';

export default function LoginScreen() {
  const [pressed, setPressed] = useState(false);
  const scaleAnim = new Animated.Value(1);

  const handlePress = () => {
    setPressed(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      alert('Login clicked! Add your logic here.');
      setPressed(false);
    });
  };

  return (
    <View style={styles.body}>
      <View style={styles.header} />
      <View style={styles.container}>
        <View />
        <Image style={styles.avatar} source={require('../assets/signin.jpg')}></Image>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} secureTextEntry />
        </View>

        <TouchableWithoutFeedback onPress={handlePress}>
          <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.buttonText}>Sign in</Text>
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
