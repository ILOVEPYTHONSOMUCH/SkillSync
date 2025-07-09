import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    Image,
    TouchableOpacity,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AntDesign, Feather } from '@expo/vector-icons'; // Added Feather for eye icon

const API_BASE = 'http://192.168.222.1:6000'; // Make sure this is your correct backend IP

export default function LessonScreen() {
    const [lessons, setLessons] = useState([]);
    const [search, setSearch] = useState('');
    const [userGrade, setUserGrade] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const navigation = useNavigation();

    const fetchLessonsAndUser = useCallback(async () => {
        setLoadingUser(true);
        setLoadingLessons(true);
        let fetchedGrade = null;

        // 1. Fetch User Profile to get grade
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Authentication Required', 'Please log in to view lessons.');
                setLoadingUser(false);
                setLoadingLessons(false);
                setUserGrade(null);
                setLessons([]);
                return;
            }
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const me = await res.json();
                fetchedGrade = me.grade;
                setUserGrade(fetchedGrade);
            } else {
                const errorData = await res.json();
                Alert.alert('Error', errorData.message || 'Failed to load user info.');
                setLoadingUser(false);
                setLoadingLessons(false);
                setUserGrade(null);
                setLessons([]);
                return;
            }
        } catch (e) {
            console.error("Error fetching user info:", e);
            Alert.alert('Error', 'Cannot load user info. Please check your network connection.');
            setLoadingUser(false);
            setLoadingLessons(false);
            setUserGrade(null);
            setLessons([]);
            return;
        } finally {
            setLoadingUser(false);
        }

        // 2. Fetch Lessons using the fetched grade
        if (fetchedGrade != null) {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (!token) {
                    Alert.alert('Authentication Required', 'Please log in to view lessons.');
                    setLoadingLessons(false);
                    setLessons([]);
                    return;
                }
                // Using the /api/search/:type route now
                const res = await fetch(
                    `${API_BASE}/api/search/lessons?grade=${fetchedGrade}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Sort lessons: newest first (assuming _id or a 'createdAt' field is chronological)
                    const sortedLessons = [...data].sort((a, b) => b._id.localeCompare(a._id));
                    setLessons(sortedLessons);
                } else {
                    console.warn('Expected lessons array, got:', data);
                    setLessons([]);
                }
            } catch (e) {
                console.error("Error fetching lessons:", e);
                Alert.alert('Error', 'Cannot load lessons. Please try again later.');
                setLessons([]);
            } finally {
                setLoadingLessons(false);
            }
        } else {
            setLoadingLessons(false);
            setLessons([]);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchLessonsAndUser();
        }, [fetchLessonsAndUser])
    );

    const filtered = lessons.filter(item => {
        const text = `${item.title || ''} ${item.subject || ''} ${item.user?.username || ''}`.toLowerCase();
        return text.includes(search.toLowerCase());
    });

    const getFileUrl = (path) =>
        path
            ? `${API_BASE}/api/file?path=${encodeURIComponent(path.replace(/\\/g, '/'))}`
            : null;

    const handleLessonPress = (lesson) => {
        navigation.navigate('WatchScreen', { lessonData: lesson });
    };

    const { width } = Dimensions.get('window');
    // Calculate thumbnail height. If you want a fixed 16:9 aspect ratio for the *thumbnail image*
    // inside a container that's 90% of screen width, the calculation is correct.
    // However, if the "rectangle" you refer to is the thumbnailContainer, and you want the *image* to
    // fit inside it perfectly, you need to set the resizeMode on the Image component.
    // The current setup ensures the `thumbnailContainer` is always 16:9.
    // To ensure the image *fits within* this frame, `resizeMode="cover"` is the correct approach as you have it.
    // If you want the *entire image to be visible* within the frame, possibly with letterboxing, then `resizeMode="contain"` would be used.
    // Since you said "fit in the old frame no need for adjust because it looks terrible",
    // `cover` is generally preferred for thumbnails to avoid empty space, cropping the image if necessary.

    // Let's ensure the thumbnailHeight is correctly calculated based on the `card` width.
    // The `card` width is `width * 0.9`. The `thumbnailContainer` width is '100%' of the card width.
    // So, `thumbnailContainer` width = `width * 0.9`.
    // For a 16:9 aspect ratio (common for videos), height = width * (9 / 16).
    const cardContentWidth = width * 0.9; // This is the width of the card's content area
    const thumbnailHeight = cardContentWidth * (9 / 16); // Calculate height for a 16:9 aspect ratio

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: '#f2f2f2' },
        content: { flex: 1 },
        topBar: { backgroundColor: '#000c52', height: 50 },
        headerContainer: {
            backgroundColor: 'white',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 15,
            borderBottomWidth: 1,
            borderBottomColor: '#ddd'
        },
        titleRow: {
            flexDirection: 'row',
            alignItems: 'center'
        },
        title: { fontSize: 28, fontWeight: 'bold', color: '#000c52' },
        plusButton: {
            backgroundColor: '#7ED321',
            marginLeft: 10,
            padding: 6,
            borderRadius: 20
        },
        logo: { width: 40, height: 40 },
        searchContainer: { padding: 10, backgroundColor: 'white' },
        searchBox: {
            backgroundColor: '#fff',
            borderColor: 'lightgray',
            borderWidth: 2,
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 8,
            fontSize: 16
        },
        cardContainer: {
            padding: 10,
            alignItems: 'center'
        },
        card: {
            backgroundColor: 'white',
            borderRadius: 15,
            width: width * 0.9,
            marginBottom: 15,
            padding: 10,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
        },
        thumbnailContainer: {
            width: '100%',
            height: thumbnailHeight, // <--- Using the dynamically calculated 16:9 height
            borderRadius: 10,
            overflow: 'hidden', // This is crucial for images to respect the border radius
            marginBottom: 10,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#eee',
        },
        cardThumbnail: {
            width: '100%',
            height: '100%',
            // resizeMode is handled directly as a prop on the Image component below
        },
        placeholderThumbnail: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f0f0f0',
        },
        placeholderText: {
            marginTop: 8,
            color: '#666',
            fontSize: 14,
        },
        playOverlay: {
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            ...StyleSheet.absoluteFillObject,
            borderRadius: 10,
        },
        info: { marginTop: 8 },
        infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
        uploaderAvatar: {
            width: 30,
            height: 30,
            borderRadius: 15,
            marginRight: 8,
            borderWidth: 1,
            borderColor: '#ddd'
        },
        author: { fontWeight: 'bold', fontSize: 16, marginRight: 8 },
        badge: {
            marginLeft: 'auto',
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 2
        },
        badgeText: { color: 'white', fontSize: 12 },
        titleText: { fontSize: 18, marginVertical: 4, fontWeight: 'bold', color: '#333' },
        descText: { fontSize: 14, color: '#555' },

        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            marginTop: 10,
            borderTopWidth: 1,
            borderTopColor: '#eee',
            paddingTop: 8,
        },
        statItem: {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 5,
        },
        statText: {
            marginLeft: 5,
            fontSize: 13,
            color: '#666',
        },

        navBar: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#ccc',
            paddingVertical: Platform.OS === 'ios' ? 20 : 10
        },
        navItem: { alignItems: 'center' },
        navIcon: { width: 24, height: 24, marginBottom: 4 },
        navText: { fontSize: 11, color: '#000d63', fontWeight: '500' },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 200,
        },
        loadingText: {
            marginTop: 10,
            fontSize: 16,
            color: '#000c52',
        },
        emptyLessonsContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        emptyLessonsText: {
            fontSize: 18,
            color: '#555',
            textAlign: 'center',
            marginBottom: 10,
        },
        emptyLessonsSubText: {
            fontSize: 14,
            color: '#777',
            textAlign: 'center',
        },
        createQuizButton: {
      backgroundColor: '#7ED321', // Green color
    width: 30,
    height: 30,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },createQuizButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },LessonTitle: {
     fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 10
  }
    });

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.select({ ios: 'padding', android: 'height' })}
                keyboardVerticalOffset={Platform.select({ ios: 0, android: -200 })}
            >
                {/* TOP BAR */}
                <View style={styles.topBar} />

                {/* HEADER */}
                <View style={styles.headerContainer}>
                    <View style={styles.titleRow}>
                      <Text style={styles.LessonTitle}>Lessons</Text>
                                    <TouchableOpacity
                                      style={styles.createQuizButton}
                                      onPress={() => navigation.navigate('Upload')} // Navigate to QuizCreate.js
                                    >
                                      <Text style={styles.createQuizButtonText}>+</Text>
                                    </TouchableOpacity>
                    </View>
                    <Image source={require('../assets/SkillSyncLogo.png')} style={styles.logo} />
                </View>

                {/* SEARCH */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchBox}
                        placeholder="Search Lessons by title, subject, or uploader..."
                        placeholderTextColor="#888"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* LESSON CARDS */}
                {loadingUser || loadingLessons ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#000c52" />
                        <Text style={styles.loadingText}>Loading {loadingUser ? 'user data' : 'lessons'}...</Text>
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={styles.emptyLessonsContainer}>
                        <Text style={styles.emptyLessonsText}>No lessons found for your grade or search criteria.</Text>
                        {userGrade == null && (
                            <Text style={styles.emptyLessonsSubText}>
                                Please ensure your profile grade is set correctly or you are logged in.
                            </Text>
                        )}
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.cardContainer}>
                        {filtered.map(lesson => (
                            <View key={lesson._id} style={styles.card}>
                                {/* Thumbnail Preview Area (using thumbnailPath if available) */}
                                <TouchableOpacity
                                    onPress={() => handleLessonPress(lesson)}
                                    activeOpacity={0.8}
                                    style={styles.thumbnailContainer}
                                >
                                    {/* Prioritize thumbnailPath (from backend generation) */}
                                    {lesson.thumbnailPath ? (
                                        <Image
                                            source={{ uri: getFileUrl(lesson.thumbnailPath) }}
                                            style={styles.cardThumbnail}
                                            resizeMode="contain" // This is key: 'cover' makes the image fill the space, potentially cropping
                                        />
                                    ) : lesson.imagePath ? ( // Fallback to imagePath if no dedicated thumbnail
                                        <Image
                                            source={{ uri: getFileUrl(lesson.imagePath) }}
                                            style={styles.cardThumbnail}
                                            resizeMode="contain" // Also 'cover' for the fallback image
                                        />
                                    ) : (
                                        // Generic placeholder if no thumbnail or imagePath
                                        <View style={styles.placeholderThumbnail}>
                                            <AntDesign name="videocamera" size={48} color="#999" />
                                            <Text style={styles.placeholderText}>No preview available</Text>
                                        </View>
                                    )}

                                    {/* Play icon overlay on thumbnail if there's a video */}
                                    {lesson.video && (
                                        <View style={styles.playOverlay}>
                                            <AntDesign name="playcircleo" size={60} color="white" />
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.info}>
                                    <View style={styles.infoRow}>
                                        {/* Display uploader's avatar */}
                                        {lesson.user?.avatar && (
                                            <Image
                                                source={{ uri: getFileUrl(lesson.user.avatar) }}
                                                style={styles.uploaderAvatar}
                                            />
                                        )}
                                        <Text style={styles.author}>{lesson.user?.username || 'Unknown'}</Text>
                                        <View style={[styles.badge, { backgroundColor: '#28a745' }]}>
                                            <Text style={styles.badgeText}>{lesson.subject}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.titleText}>{lesson.title}</Text>
                                    <Text style={styles.descText}>{lesson.description}</Text>

                                    {/* Views, Likes, Dislikes, Comments Row */}
                                    <View style={styles.statsRow}>
                                        <View style={styles.statItem}>
                                            <Feather name="eye" size={16} color="#666" />
                                            {/* Using lesson.viewsCount from API, defaulting to 0 */}
                                            <Text style={styles.statText}>{lesson.viewsCount || 0}</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <AntDesign name="like2" size={16} color="#666" />
                                            {/* Using lesson.likesCount from API, defaulting to 0 */}
                                            <Text style={styles.statText}>{lesson.likesCount || 0}</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <AntDesign name="dislike2" size={16} color="#666" />
                                            {/* Using lesson.dislikesCount from API, defaulting to 0 */}
                                            <Text style={styles.statText}>{lesson.dislikesCount || 0}</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Feather name="message-square" size={16} color="#666" />
                                            {/* Using lesson.CommentCount from API, defaulting to 0 */}
                                            <Text style={styles.statText}>{lesson.CommentCount || 0}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </KeyboardAvoidingView>

            {/* FOOTER NAV */}
            <View style={styles.navBar}>
                {[
                    { name: 'Home', icon: require('../assets/home.png'), screen: 'Home' },
                    { name: 'Quiz', icon: require('../assets/quiz.png'), screen: 'Quiz' },
                    { name: 'Lesson', icon: require('../assets/lesson.png'), screen: 'Lesson' },
                    { name: 'Post', icon: require('../assets/post.png'), screen: 'Post' },
                    { name: 'Chat', icon: require('../assets/chatfeed.png'), screen: 'ChatFeed' },
                    { name: 'Profile', icon: require('../assets/Sign-in.png'), screen: 'Profile' },
                ].map(item => (
                    <TouchableOpacity
                        key={item.name}
                        style={styles.navItem}
                        onPress={() => navigation.navigate(item.screen)}
                    >
                        <Image source={item.icon} style={styles.navIcon} />
                        <Text style={styles.navText}>{item.name.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}