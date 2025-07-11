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
import { AntDesign, Feather } from '@expo/vector-icons';

const API_BASE = 'http://192.168.41.31:6000'; // RESTORED: Your original backend IP

export default function LessonScreen() {
    const [lessons, setLessons] = useState([]);
    const [search, setSearch] = useState('');
    const [userGrade, setUserGrade] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [lessonEngagement, setLessonEngagement] = useState({});

    const navigation = useNavigation();

    const fetchLessonsAndUser = useCallback(async () => {
        setLoadingUser(true);
        setLoadingLessons(true);
        let fetchedGrade = null;
        let token = null;

        // 1. Fetch User Profile to get grade and token
        try {
            token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Authentication Required', 'Please log in to view lessons.');
                setLoadingUser(false);
                setLoadingLessons(false);
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
            Alert.alert('Error', 'Cannot load user info. Please check your network connection or try again later.');
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
                // RESTORED: Original lesson fetching path, no search query here
                const res = await fetch(
                    `${API_BASE}/api/search/lessons?grade=${fetchedGrade}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                const data = await res.json();
                if (Array.isArray(data)) {
                    const sortedLessons = [...data].sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return dateB - dateA;
                    });
                    setLessons(sortedLessons);

                    // Initialize lessonEngagement based on fetched lessons
                    const initialEngagement = {};
                    sortedLessons.forEach(lesson => {
                        initialEngagement[lesson._id] = {
                            isLiked: lesson.isLiked || false,
                            isDisliked: lesson.isDisliked || false,
                            likesCount: lesson.likesCount || 0,
                            dislikesCount: lesson.dislikesCount || 0,
                            commentsCount: lesson.commentsCount || 0,
                            viewsCount: lesson.viewsCount || 0
                        };
                    });
                    setLessonEngagement(initialEngagement);

                } else {
                    console.warn('Expected lessons array, got:', data);
                    setLessons([]);
                    setLessonEngagement({});
                }
            } catch (e) {
                console.error("Error fetching lessons:", e);
                Alert.alert('Error', 'Cannot load lessons. Please try again later.');
                setLessons([]);
                setLessonEngagement({});
            } finally {
                setLoadingLessons(false);
            }
        } else {
            setLoadingLessons(false);
            setLessons([]);
            setLessonEngagement({});
        }
    }, []); // fetchLessonsAndUser no longer depends on 'search' directly, as search is now local

    useFocusEffect(
        useCallback(() => {
            fetchLessonsAndUser();
        }, [fetchLessonsAndUser])
    );

    // REMOVED: The useEffect for debouncing search, as search is now handled locally by 'filtered'

    const handleLikeDislike = async (lessonId, actionType) => {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
            Alert.alert('Authentication Required', 'Please log in to interact.');
            return;
        }

        const currentEngagement = lessonEngagement[lessonId] || { isLiked: false, isDisliked: false, likesCount: 0, dislikesCount: 0 };
        let { isLiked, isDisliked, likesCount, dislikesCount } = currentEngagement;

        let optimisticUpdate = {};
        if (actionType === 'like') {
            if (isLiked) {
                isLiked = false;
                likesCount = Math.max(0, likesCount - 1);
            } else {
                isLiked = true;
                likesCount += 1;
                if (isDisliked) {
                    isDisliked = false;
                    dislikesCount = Math.max(0, dislikesCount - 1);
                }
            }
        } else if (actionType === 'dislike') {
            if (isDisliked) {
                isDisliked = false;
                dislikesCount = Math.max(0, dislikesCount - 1);
            } else {
                isDisliked = true;
                dislikesCount += 1;
                if (isLiked) {
                    isLiked = false;
                    likesCount = Math.max(0, likesCount - 1);
                }
            }
        }

        setLessonEngagement(prevEngagement => ({
            ...prevEngagement,
            [lessonId]: { ...prevEngagement[lessonId], isLiked, isDisliked, likesCount, dislikesCount }
        }));

        const endpoint = `${API_BASE}/api/lesson/${lessonId}/${actionType}`;
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                Alert.alert('Error', errorData.message || `Failed to ${actionType} lesson.`);
                setLessonEngagement(prevEngagement => ({
                    ...prevEngagement,
                    [lessonId]: currentEngagement
                }));
            } else {
                const responseData = await res.json();
                setLessonEngagement(prevEngagement => ({
                    ...prevEngagement,
                    [lessonId]: {
                        ...prevEngagement[lessonId],
                        likesCount: responseData.likesCount,
                        dislikesCount: responseData.dislikesCount,
                        isLiked: responseData.isLiked,
                        isDisliked: responseData.isDisliked,
                    }
                }));
            }
        } catch (e) {
            console.error(`Error during ${actionType} action:`, e);
            Alert.alert('Network Error', `Could not ${actionType} lesson. Please check your connection.`);
            setLessonEngagement(prevEngagement => ({
                ...prevEngagement,
                [lessonId]: currentEngagement
            }));
        }
    };

    // RESTORED: The 'filtered' variable definition for local search
    const filtered = lessons.filter(item => {
        const text = `${item.title || ''} ${item.subject || ''} ${item.user?.username || ''}`.toLowerCase();
        return text.includes(search.toLowerCase());
    });

    const getFileUrl = (path) =>
        path
            ? `${API_BASE}/api/file?path=${encodeURIComponent(path.replace(/\\/g, '/'))}`
            : null;

    const handleLessonPress = (lesson) => {
        if (lesson && lesson._id) {
            console.log("Navigating to WatchInfo with contentId:", lesson._id);
            navigation.navigate('WatchInfo', { contentId: lesson._id, contentType: 'lesson' });
        } else {
            console.warn("Attempted to navigate without a valid lesson ID:", lesson);
            Alert.alert(
                "Navigation Error",
                "Cannot open lesson: The lesson ID is missing. Please try again later or contact support if the issue persists."
            );
        }
    };

    const formatLessonDate = (dateString) => {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        try {
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString;
        }
    };

    const { width } = Dimensions.get('window');
    const cardContentWidth = width * 0.9;
    const thumbnailHeight = cardContentWidth * (9 / 16);

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
        LessonTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#000',
            marginRight: 10
        },
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
            height: thumbnailHeight,
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 10,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#eee',
        },
        cardThumbnail: {
            width: '100%',
            height: '100%',
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
        infoRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
            flexWrap: 'wrap',
        },
        uploaderAvatar: {
            width: 30,
            height: 30,
            borderRadius: 15,
            marginRight: 8,
            borderWidth: 1,
            borderColor: '#ddd'
        },
        author: { fontWeight: 'bold', fontSize: 16, marginRight: 8 },
        lessonDate: {
            fontSize: 13,
            color: '#777',
            marginRight: 8,
        },
        badge: {
            marginLeft: 'auto',
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 2,
            alignSelf: 'flex-start',
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
            backgroundColor: '#7ED321',
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
        },
        createQuizButtonText: {
            color: 'white',
            fontSize: 20,
            fontWeight: 'bold',
            lineHeight: 22,
        },
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
                            onPress={() => navigation.navigate('Upload')}
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
                ) : filtered.length === 0 && search === '' && userGrade != null ? (
                    <View style={styles.emptyLessonsContainer}>
                        <Text style={styles.emptyLessonsText}>No lessons found for your grade.</Text>
                        <Text style={styles.emptyLessonsSubText}>
                            Try uploading a lesson or adjusting your search.
                        </Text>
                    </View>
                ) : filtered.length === 0 && search !== '' ? (
                    <View style={styles.emptyLessonsContainer}>
                        <Text style={styles.emptyLessonsText}>No lessons match your search criteria.</Text>
                        <Text style={styles.emptyLessonsSubText}>
                            Try a different keyword.
                        </Text>
                    </View>
                ) : filtered.length === 0 && userGrade == null ? (
                     <View style={styles.emptyLessonsContainer}>
                        <Text style={styles.emptyLessonsText}>Please log in to view lessons tailored to your grade.</Text>
                        <Text style={styles.emptyLessonsSubText}>
                            Your grade determines the lessons displayed here.
                        </Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.cardContainer}>
                        {filtered.map(lesson => {
                            const engagement = lessonEngagement[lesson._id] || { isLiked: false, isDisliked: false, likesCount: 0, dislikesCount: 0, commentsCount: 0, viewsCount: 0 };

                            return (
                                <View key={lesson._id} style={styles.card}>
                                    {/* Thumbnail Preview Area */}
                                    <TouchableOpacity
                                        onPress={() => handleLessonPress(lesson)}
                                        activeOpacity={0.8}
                                        style={styles.thumbnailContainer}
                                    >
                                        {lesson.thumbnailPath ? (
                                            <Image
                                                source={{ uri: getFileUrl(lesson.thumbnailPath) }}
                                                style={styles.cardThumbnail}
                                                resizeMode="cover"
                                            />
                                        ) : lesson.imagePath ? (
                                            <Image
                                                source={{ uri: getFileUrl(lesson.imagePath) }}
                                                style={styles.cardThumbnail}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={styles.placeholderThumbnail}>
                                                <AntDesign name="videocamera" size={48} color="#999" />
                                                <Text style={styles.placeholderText}>No preview available</Text>
                                            </View>
                                        )}

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
                                            {/* Display Lesson Date */}
                                            {lesson.createdAt && (
                                                <Text style={styles.lessonDate}>
                                                    {formatLessonDate(lesson.createdAt)}
                                                </Text>
                                            )}
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
                                                <Text style={styles.statText}>{engagement.viewsCount}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.statItem}
                                                onPress={() => handleLikeDislike(lesson._id, 'like')}
                                            >
                                                <AntDesign
                                                    name="like2"
                                                    size={16}
                                                    color={engagement.isLiked ? '#007bff' : '#666'}
                                                />
                                                <Text style={styles.statText}>{engagement.likesCount}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.statItem}
                                                onPress={() => handleLikeDislike(lesson._id, 'dislike')}
                                            >
                                                <AntDesign
                                                    name="dislike2"
                                                    size={16}
                                                    color={engagement.isDisliked ? '#dc3545' : '#666'}
                                                />
                                                <Text style={styles.statText}>{engagement.dislikesCount}</Text>
                                            </TouchableOpacity>
                                            <View style={styles.statItem}>
                                                <Feather name="message-square" size={16} color="#666" />
                                                <Text style={styles.statText}>{engagement.commentsCount}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
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