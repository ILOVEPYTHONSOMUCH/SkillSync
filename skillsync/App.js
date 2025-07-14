// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import LessonScreen from './screens/LessonScreen';
import CreatePost from './screens/CreatePost';
import LessonUploader from './screens/LessonUploader';
import QuizScreen from './screens/QuizScreen';
import ChatFeed from './screens/ChatFeed';
import CreateQuiz from './screens/CreateQuiz';
import DoQuiz from './screens/DoQuiz';
import QuizResults from './screens/QuizResults';
import UserInfoScreen from './screens/UserInfoScreen';
import WatchInfo from './screens/WatchInfo';
import ChatScreen from './screens/ChatScreen';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Lesson" component={LessonScreen} />
        <Stack.Screen name="Post" component={CreatePost} />
        <Stack.Screen name="Upload" component={LessonUploader} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="ChatFeed" component={ChatFeed} />
        <Stack.Screen name="CreateQuiz" component={CreateQuiz} />
        <Stack.Screen name="DoQuiz" component={DoQuiz} />
        <Stack.Screen name="QuizResults" component={QuizResults} />
        <Stack.Screen name="UserInfoScreen" component={UserInfoScreen} />
        <Stack.Screen name="WatchInfo" component={WatchInfo} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
