import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';

export default function WelcomeScreen({ navigation }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const renderFancyButton = (label, onPress) => (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>{label}</Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );

  return (
    <View style={styles.body}>
      <View style={styles.app}>
        <Animated.View
          style={[
            styles.logoWrapper,
            { transform: [{ translateY: floatAnim }] },
          ]}
        >
          <Image
            source={require('../assets/SkillSyncLogo.png')}
            style={styles.logo}
            resizeMode="cover" // cover สำหรับพอดีในวงกลม ไม่ยืด
          />
        </Animated.View>

        {renderFancyButton('Register', () => navigation.navigate('Register'))}
        {renderFancyButton('Login', () => navigation.navigate('Login'))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: '#edffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  app: {
    width: '100%',
    maxWidth: 1500,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#edffff',
    borderTopWidth: 50,
    borderBottomWidth: 50,
    borderTopColor: '#000c55',
    borderBottomColor: '#000c55',
  },
  logoWrapper: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#a0e7f8',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 7
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain'
  },
  button: {
    width: 240,
    borderRadius: 30,
    marginVertical: 12,
    backgroundColor: '#c0f0ff',
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonInner: {
    borderRadius: 28,
    paddingVertical: 14,
    backgroundColor: '#a0e7f8',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#003344',
    letterSpacing: 0.5,
  },
});
