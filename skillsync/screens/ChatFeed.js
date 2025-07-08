import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Get window width for responsive styling if needed, though not directly used in this specific style for width calculations
const { width } = Dimensions.get('window');

// Assume these images are in your project's 'assets/' folder.
// Make sure these paths are correct relative to your ChatFeed.js file.
const images = {
  logo: require('../assets/SkillSyncLogo.png'),
  searchIcon: require('../assets/search.png'), // Ensure you have this search icon in your assets
  profilePlaceholder: require('../assets/Sign-in.png'), // Default profile image for users
  // Navigation icons - these should be consistent across all your navigation components
  homeIcon: require('../assets/home.png'),
  quizIcon: require('../assets/quiz.png'),
  lessonIcon: require('../assets/lesson.png'),
  postIcon: require('../assets/post.png'),
  chatfeedIcon: require('../assets/chatfeed.png'),
  profileIcon: require('../assets/Sign-in.png'), // Using the Sign-in image for the profile nav icon
};

export default function ChatFeed() {
  const navigation = useNavigation(); // Initialize the navigation hook
  const [searchText, setSearchText] = useState(''); // State for the search input

  // Dummy data for chat items. In a real application, you would fetch this from an API.
  const chatItems = [
    { id: '1', name: 'Thorfun N.', lastMessage: 'อย่าลืมทำแบบฝึกหัดนะ', time: '15m', avatar: images.profilePlaceholder },
    { id: '2', name: 'Punyawee S.', lastMessage: 'มีโพสต์ที่สอนเรื่องสมดุลมั้ย ส่งมาให้หน่อย', time: '3m', avatar: images.profilePlaceholder },
    { id: '3', name: 'napgains', lastMessage: 'ได้สิ เดี๋ยวพรุ่งนี้ไปติวภาษาอังกฤษกัน', time: '1h', avatar: images.profilePlaceholder },
    { id: '4', name: 'hs_smuththa', lastMessage: 'มีสรุปอังกฤษมั้ย', time: '35m', avatar: images.profilePlaceholder },
  ];

  // Dummy data for status bar. This section is commented out in the JSX below
  // due to the complexity of perfectly replicating its original HTML styling in React Native.
  const statusItems = [
    { id: 's1', name: 'Friend 1', avatar: images.profilePlaceholder },
    { id: 's2', name: 'Friend 2', avatar: images.profilePlaceholder },
    { id: 's3', name: 'Friend 3', avatar: images.profilePlaceholder },
    { id: 's4', name: 'Friend 4', avatar: images.profilePlaceholder },
    { id: 's5', name: 'Friend 5', avatar: images.profilePlaceholder },
  ];

  // Handler for when a chat item is pressed
  const handleChatItemPress = (chatId) => {
    Alert.alert('Opening Chat', `You clicked on chat ID: ${chatId}`);
    // In a real app, you would typically navigate to a dedicated chat screen here:
    // navigation.navigate('ChatScreen', { chatId: chatId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appContainer}>
        {/* Header Spacer: This acts as a top padding/background to match the web version's body background. */}
        <View style={styles.headerSpacer}></View>

        {/* Header Content: Displays the user's name and the app logo. */}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Cheerawit Keerati</Text>
          <Image source={images.logo} style={styles.headerLogo} />
        </View>

        {/* Search Container: Holds the search input field. */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Image source={images.searchIcon} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Searching Friends"
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/*
          Status Bar Container (Horizontal ScrollView):
          This section is commented out because replicating its exact HTML styling (especially the absolute-positioned avatars
          within a horizontally scrolling view) is complex in React Native and can lead to layout inconsistencies or clipping.
          If you need this feature, uncomment it and adjust its styles carefully.
        */}
        {/*
        <View style={styles.statusBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusBar}>
            {statusItems.map(status => (
              <View key={status.id} style={styles.status}>
                <Text>{status.name}</Text>
                <Image source={status.avatar} style={styles.statusAvatar} />
              </View>
            ))}
          </ScrollView>
        </View>
        */}

        {/* Chats Section: Displays a scrollable list of chat items. */}
        <ScrollView style={styles.chatsContainer} contentContainerStyle={styles.chatsContent}>
          <Text style={styles.chatsHeader}>Chats</Text>
          {chatItems.map(chat => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatItem}
              onPress={() => handleChatItemPress(chat.id)}
            >
              <Image source={chat.avatar} style={styles.chatItemAvatar} />
              <View style={styles.chatInfo}>
                <Text style={styles.chatInfoName}>{chat.name}</Text>
                <Text style={styles.chatInfoLastMessage}>{chat.lastMessage} : {chat.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bottom Navigation Bar: Consistent navigation across your app. */}
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
    backgroundColor: '#000d63', // Matches the original HTML body background
  },
  appContainer: {
    flex: 1,
    backgroundColor: 'white',
    flexDirection: 'column',
  },
  headerSpacer: {
    height: 60,
    backgroundColor: '#000d63',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain', // Ensures the whole logo is visible
  },
  searchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 15,
  },
  searchBox: {
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    width: '90%', // Occupies 90% of parent width
  },
  searchIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  searchInput: {
    flexGrow: 1, // Allows input to take up remaining space
    fontSize: 14,
    paddingLeft: 10,
    color: '#000', // Ensures text is visible
  },
  // Styles for the Status Bar section (currently commented out in JSX)
  statusBarContainer: {
    paddingBottom: 40,
  },
  statusBar: {
    paddingHorizontal: 10,
    gap: 15, // Requires React Native 0.71+ for gap property
  },
  status: {
    backgroundColor: '#f2f2f2',
    padding: 10,
    borderRadius: 20,
    minWidth: 140,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10, // Added space for potential absolute avatar
  },
  statusAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5, // Half of width/height for a circle
    position: 'absolute',
    bottom: -25, // Adjust as needed
    left: '50%',
    marginLeft: -22.5, // Negative half of width/height to truly center with left: '50%'
    borderWidth: 2,
    borderColor: 'white',
  },
  // End of Status Bar styles

  chatsContainer: {
    flex: 1, // Allows the chat list to scroll and fill available space
    paddingHorizontal: 15,
    // Add padding to the bottom to ensure content isn't hidden by the fixed navigation bar
    paddingBottom: Platform.OS === 'ios' ? 90 : 70, // Adjust for iOS notch vs Android
  },
  chatsContent: {
    // Optional: Add padding to content within the scroll view if needed
  },
  chatsHeader: {
    color: '#000d63',
    fontSize: 20,
    marginBottom: 15,
    fontWeight: 'bold',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Requires React Native 0.71+
    padding: 10,
    borderRadius: 10,
    marginBottom: 10, // Margin between chat items
    // Add shadow properties for a subtle lift effect if desired
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.1,
    // shadowRadius: 2,
    // elevation: 2, // For Android shadow
  },
  chatItemAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25, // For a circular avatar
  },
  chatInfo: {
    flexDirection: 'column',
    flex: 1, // Allows chat info to take remaining space horizontally
  },
  chatInfoName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
  },
  chatInfoLastMessage: {
    fontSize: 14,
    color: '#555', // Muted color for the last message
  },

  // Bottom Navigation Bar styles - copied directly from HomeScreen.js for consistency
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    height: 60,
    borderTopColor: '#ccc',
    borderTopWidth: 1,
    position: 'absolute', // Fixed position at the bottom
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0, // Adds padding for iPhone's safe area
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // Distributes space evenly among items
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