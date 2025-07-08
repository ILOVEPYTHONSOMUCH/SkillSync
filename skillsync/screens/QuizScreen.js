import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Assume these images are in your project's assets folder
// e.g., create an 'assets' folder at the root of your project
const images = {
  logo: require('../assets/SkillSyncLogo.png'),
  homeIcon: require('../assets/home.png'),
  quizIcon: require('../assets/quiz.png'),
  lessonIcon: require('../assets/lesson.png'),
  postIcon: require('../assets/post.png'),
  chatfeedIcon: require('../assets/chatfeed.png'),
  profileIcon: require('../assets/Sign-in.png'),
};

export default function QuizScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header - Empty in original HTML, but kept for structure if needed */}
        <View style={styles.headerDummy}></View>

        {/* Top Controls Section */}
        <View style={styles.topControls}>
          <View style={styles.leftControls}>
            <Text style={styles.quizTitle}>Quiz</Text>
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Searching Quiz"
                placeholderTextColor="#888"
              />
              <Text style={styles.searchIcon}>🔍</Text>
            </View>
            <TouchableOpacity style={styles.myResultBtn}>
              <Text style={styles.myResultBtnText}>My Quiz Result</Text>
            </TouchableOpacity>
          </View>
          <Image source={images.logo} style={styles.logo} />
        </View>

        {/* Main Content Area - Scrollable */}
        <ScrollView contentContainerStyle={styles.quizContainer}>
          {/* Quiz Card 1 (Red) */}
          <View style={[styles.quizCard, styles.quizCardRed]}>
            <Text style={[styles.quizCardTitle, { color: 'red' }]}>Math</Text>
            <Text style={styles.quizCardText}>Lesson: Trigonometry (Multiple choice Questions) 30 Questions.</Text>
            <Text style={styles.quizCardText}>Time: 1 hr 30 min</Text>
            <Text style={styles.quizCardText}>Points: 30 points</Text>
            <Text style={styles.quizCardText}>Creator: Cheearawit Keerati</Text>
            <TouchableOpacity style={styles.startBtn}>
              <Text style={styles.startBtnText}>Start the Quiz</Text>
            </TouchableOpacity>
          </View>

          {/* Quiz Card 2 (Blue) */}
          <View style={[styles.quizCard, styles.quizCardBlue]}>
            <Text style={[styles.quizCardTitle, { color: '#0066cc' }]}>Physics</Text>
            <Text style={styles.quizCardText}>Lesson: Wave & Simple Harmonic Motions (Multiple Choice Questions) 30 Questions.</Text>
            <Text style={styles.quizCardText}>Time: 1 hr</Text>
            <Text style={styles.quizCardText}>Creator: Thorfun N.</Text>
            <TouchableOpacity style={[styles.startBtn, styles.startBtnBlue]}>
              <Text style={styles.startBtnText}>Start the Quiz</Text>
            </TouchableOpacity>
          </View>

          {/* Quiz Card 3 (Orange) */}
          <View style={[styles.quizCard, styles.quizCardOrange]}>
            <Text style={[styles.quizCardTitle, { color: '#ff6600' }]}>English</Text>
            <Text style={styles.quizCardText}>Lesson: Present Continuous Tense (Written Exam) 15 Questions.</Text>
            <Text style={styles.quizCardText}>Time: 30 min</Text>
            <Text style={styles.quizCardText}>Point: 10 points</Text>
            <Text style={styles.quizCardText}>Creator: Punyawee S.</Text>
            <TouchableOpacity style={styles.startBtn}>
              <Text style={styles.startBtnText}>Start the Quiz</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar - Copied from HomeScreen.js */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
            <Image source={images.homeIcon} style={styles.navIcon} />
            <Text style={styles.navText}>HOME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Quiz')}>
            <Image source={images.quizIcon} style={styles.navIcon} />
            <Text style={styles.navText}>QUIZ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Lesson')}>
            <Image source={images.lessonIcon} style={styles.navIcon} />
            <Text style={styles.navText}>LESSON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Post')}>
            <Image source={images.postIcon} style={styles.navIcon} />
            <Text style={styles.navText}>POST</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ChatFeed')}>
            <Image source={images.chatfeedIcon} style={styles.navIcon} />
            <Text style={styles.navText}>CHAT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
            <Image source={images.profileIcon} style={styles.navIcon} />
            <Text style={styles.navText}>PROFILE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    position: 'relative',
  },
  headerDummy: {
    backgroundColor: '#0b0c5c',
    height: 60,
  },
  topControls: {
    backgroundColor: 'white',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flexWrap: 'wrap',
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderColor: '#ccc',
    borderWidth: 1,
    width: 160,
    color: '#000',
  },
  searchIcon: {
    marginLeft: 5,
    color: 'black',
    fontSize: 16,
  },
  myResultBtn: {
    backgroundColor: '#0b0c5c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  myResultBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  quizContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  quizCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 15,
    marginBottom: 20,
  },
  quizCardRed: {
    borderLeftWidth: 8,
    borderLeftColor: '#9c2c2c',
  },
  quizCardBlue: {
    backgroundColor: '#dff2fd',
    borderLeftWidth: 8,
    borderLeftColor: '#1458a8',
  },
  quizCardOrange: {
    borderLeftWidth: 8,
    borderLeftColor: '#d07b00',
  },
  quizCardTitle: {
    fontSize: 22,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  quizCardText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  startBtn: {
    marginTop: 10,
    backgroundColor: '#8e2e2e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  startBtnBlue: {
    backgroundColor: '#1c59c4',
  },
  startBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Navigation Bar Styles - Copied directly from HomeScreen.js
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    height: 60,
    borderTopColor: '#ccc',
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    width: 24,
    height: 24,
    marginBottom: 2,
    resizeMode: 'contain',
  },
  navText: {
    fontSize: 11,
    color: '#000d63',
    fontWeight: '500',
  },
});