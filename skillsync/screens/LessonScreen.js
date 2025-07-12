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
    ActivityIndicator,
    Modal,
    FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { AntDesign, Feather } from '@expo/vector-icons';

const API_BASE = 'http://192.168.41.31:6000';
const { width, height } = Dimensions.get('window');
const formatTimeSince = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
        return `${Math.floor(diffInSeconds / 31536000)}y ago`;
    } catch (e) {
        console.error("Error formatting time since:", dateString, e);
        return '';
    }
};
// Predefined subjects
const subjects = [
  'Math',
  'Physics',
  'Chemistry',
  'Biology',
  'Social',
  'History',
  'Music',
  'Art',
  'English'
];

export default function LessonScreen() {
    const [lessons, setLessons] = useState([]);
    const [search, setSearch] = useState('');
    const [userGrade, setUserGrade] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [lessonEngagement, setLessonEngagement] = useState({});
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState([]);

    const navigation = useNavigation();
    const route = useRoute();

    const fetchLessonsAndUser = useCallback(async () => {
        setLoadingUser(true);
        setLoadingLessons(true);
        let fetchedGrade = null;
        let token = null;

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

        if (fetchedGrade != null) {
            try {
                const res = await fetch(
                    `${API_BASE}/api/search/lessons?grade=${fetchedGrade}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const data = await res.json();
                
                if (Array.isArray(data)) {
                    const sortedLessons = [...data].sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return dateB - dateA;
                    });
                    
                    setLessons(sortedLessons);

                    const initialEngagement = {};
                    sortedLessons.forEach(lesson => {
                        initialEngagement[lesson._id] = {
                            isLiked: lesson.isLiked || false,
                            isDisliked: lesson.isDisliked || false,
                            likesCount: lesson.likesCount || 0,
                            dislikesCount: lesson.dislikesCount || 0,
                            viewsCount: lesson.viewsCount || 0,
                            commentsCount: lesson.commentsCount || 0
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
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchLessonsAndUser();

            if (route.params?.updatedLesson) {
                setLessons(prevLessons => 
                    prevLessons.map(lesson => 
                        lesson._id === route.params.updatedLesson._id 
                            ? route.params.updatedLesson 
                            : lesson
                    )
                );
                
                setLessonEngagement(prev => ({
                    ...prev,
                    [route.params.updatedLesson._id]: {
                        ...prev[route.params.updatedLesson._id],
                        ...route.params.updatedEngagement
                    }
                }));
                
                navigation.setParams({ updatedLesson: undefined, updatedEngagement: undefined });
            }
        }, [fetchLessonsAndUser, route.params, navigation])
    );

    const handleLikeDislike = async (lessonId, actionType) => {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
            Alert.alert('Authentication Required', 'Please log in to interact.');
            return;
        }

        try {
            const endpoint = `${API_BASE}/api/lesson/${lessonId}/${actionType}`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Failed to ${actionType} lesson.`);
            }

            const data = await res.json();
            
            setLessons(prevLessons => 
                prevLessons.map(lesson => 
                    lesson._id === lessonId ? {
                        ...lesson,
                        isLiked: data.isLiked,
                        isDisliked: data.isDisliked,
                        likesCount: data.likesCount,
                        dislikesCount: data.dislikesCount
                    } : lesson
                )
            );

            setLessonEngagement(prev => ({
                ...prev,
                [lessonId]: {
                    ...prev[lessonId],
                    isLiked: data.isLiked,
                    isDisliked: data.isDisliked,
                    likesCount: data.likesCount,
                    dislikesCount: data.dislikesCount
                }
            }));

        } catch (e) {
            console.error(`Error during ${actionType} action:`, e);
            Alert.alert('Error', e.message || `Could not ${actionType} lesson. Please try again.`);
        }
    };

    const filtered = lessons.filter(lesson => {
        // Search filter
        const matchesSearch = `${lesson.title || ''} ${lesson.subject || ''} ${lesson.user?.username || ''}`
            .toLowerCase()
            .includes(search.toLowerCase());
        
        // Subject filter
        const matchesSubjects = selectedSubjects.length === 0 || 
            (lesson.subject && selectedSubjects.includes(lesson.subject));
        
        return matchesSearch && matchesSubjects;
    });

    const toggleSubject = (subject) => {
        setSelectedSubjects(prev => 
            prev.includes(subject) 
                ? prev.filter(s => s !== subject) 
                : [...prev, subject]
        );
    };

    const renderSubjectItem = ({ item }) => (
        <TouchableOpacity 
            style={[
                styles.subjectFilterButton,
                selectedSubjects.includes(item) && styles.selectedSubject,
            ]}
            onPress={() => toggleSubject(item)}
        >
            <Text style={[
                styles.subjectFilterText,
                selectedSubjects.includes(item) && styles.selectedSubjectText
            ]}>
                {item}
            </Text>
        </TouchableOpacity>
    );

    const getFileUrl = (path) =>
        path
            ? `${API_BASE}/api/file?path=${encodeURIComponent(path.replace(/\\/g, '/'))}`
            : null;

    const handleLessonPress = (lesson) => {
        if (lesson && lesson._id) {
            navigation.navigate('WatchInfo', { 
                contentId: lesson._id, 
                contentType: 'lesson',
                initialLesson: lesson,
                initialEngagement: {
                    ...lessonEngagement[lesson._id],
                    commentsCount: lesson.commentsCount || 0
                }
            });
        } else {
            console.warn("Attempted to navigate without a valid lesson ID:", lesson);
            Alert.alert(
                "Navigation Error",
                "Cannot open lesson: The lesson ID is missing. Please try again later or contact support if the issue persists."
            );
        }
    };

    const handleQuizPress = (quizId) => {
        navigation.navigate('QuizInfo', { quizId });
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

    const formatTimeSince = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
            if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
            return `${Math.floor(diffInSeconds / 31536000)}y ago`;
        } catch (e) {
            console.error("Error formatting time since:", dateString, e);
            return '';
        }
    };

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
        searchContainer: { 
            padding: 10, 
            backgroundColor: 'white',
            flexDirection: 'row',
            alignItems: 'center'
        },
        searchBox: {
            flex: 1,
            backgroundColor: '#fff',
            borderColor: 'lightgray',
            borderWidth: 2,
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 8,
            fontSize: 16
        },
        filterButton: {
            marginLeft: 10,
            padding: 8,
            borderRadius: 20,
            backgroundColor: '#f1f1f1'
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
        modalContainer: {
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
        },
        modalContent: {
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            maxHeight: height * 0.7,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: 'bold',
        },
        subjectList: {
            paddingBottom: 20,
        },
        subjectFilterButton: {
            padding: 12,
            borderRadius: 8,
            backgroundColor: '#f1f1f1',
            marginBottom: 10,
            alignItems: 'center',
        },
        selectedSubject: {
            backgroundColor: '#000c52',
        },
        subjectFilterText: {
            fontSize: 16,
        },
        selectedSubjectText: {
            color: 'white',
        },
        modalFooter: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
        },
        clearButton: {
            flex: 1,
            padding: 15,
            backgroundColor: '#f1f1f1',
            borderRadius: 10,
            alignItems: 'center',
            marginRight: 10,
        },
        applyButton: {
            flex: 1,
            padding: 15,
            backgroundColor: '#000c52',
            borderRadius: 10,
            alignItems: 'center',
        },
        clearButtonText: {
            color: '#000',
            fontWeight: 'bold',
        },
        applyButtonText: {
            color: '#fff',
            fontWeight: 'bold',
        },
        relatedQuizzesContainer: {
            marginTop: 10,
            borderTopWidth: 1,
            borderTopColor: '#eee',
            paddingTop: 10,
        },
        relatedQuizzesTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 8,
            color: '#333',
        },
        quizItem: {
            backgroundColor: '#f8f9fa',
            padding: 10,
            borderRadius: 8,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#ddd',
        },
        quizTitle: {
            fontSize: 14,
            fontWeight: '500',
            color: '#333',
        },
        quizSubject: {
            fontSize: 12,
            color: '#666',
            marginTop: 4,
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
    
                {/* SEARCH AND FILTER */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchBox}
                        placeholder="Search Lessons by title, subject, or uploader..."
                        placeholderTextColor="#888"
                        value={search}
                        onChangeText={setSearch}
                    />
                    <TouchableOpacity 
                        style={styles.filterButton}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <Feather name="filter" size={20} color="#000c52" />
                    </TouchableOpacity>
                </View>
    
                {/* FILTER MODAL */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={filterModalVisible}
                    onRequestClose={() => setFilterModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filter by Subject</Text>
                                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                    <Feather name="x" size={24} color="#000" />
                                </TouchableOpacity>
                            </View>
                            
                            <FlatList
                                data={subjects}
                                renderItem={renderSubjectItem}
                                keyExtractor={(item) => item}
                                contentContainerStyle={styles.subjectList}
                            />
                            
                            <View style={styles.modalFooter}>
                                <TouchableOpacity 
                                    style={styles.clearButton}
                                    onPress={() => setSelectedSubjects([])}
                                >
                                    <Text style={styles.clearButtonText}>Clear All</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.applyButton}
                                    onPress={() => setFilterModalVisible(false)}
                                >
                                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
    
                {/* LESSON CARDS */}
                {loadingUser || loadingLessons ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#000c52" />
                        <Text style={styles.loadingText}>Loading {loadingUser ? 'user data' : 'lessons'}...</Text>
                    </View>
                ) : filtered.length === 0 && search === '' && selectedSubjects.length === 0 && userGrade != null ? (
                    <View style={styles.emptyLessonsContainer}>
                        <Text style={styles.emptyLessonsText}>No lessons found for your grade.</Text>
                        <Text style={styles.emptyLessonsSubText}>
                            Try uploading a lesson or adjusting your search.
                        </Text>
                    </View>
                ) : filtered.length === 0 && (search !== '' || selectedSubjects.length > 0) ? (
                    <View style={styles.emptyLessonsContainer}>
                        <Text style={styles.emptyLessonsText}>No lessons match your criteria.</Text>
                        <Text style={styles.emptyLessonsSubText}>
                            Try a different search or filter.
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
                            const engagement = lessonEngagement[lesson._id] || { 
                                isLiked: false, 
                                isDisliked: false, 
                                likesCount: 0, 
                                dislikesCount: 0,
                                viewsCount: 0,
                                commentsCount: lesson.commentsCount || 0
                            };
    
                            // Get related quizzes directly from the lesson object
                            const quizzesForLesson = lesson.relatedQuizzes || [];
    
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
                                           <Text style={styles.timeText}>• {formatTimeSince(lesson.createdAt)}</Text>
                                            <Text style={styles.timeText}>• {formatTimeSince(lesson.createdAt)}</Text>
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
    
                                        {/* Related Quizzes Section */}
                                        {quizzesForLesson.length > 0 && (
                                            <View style={styles.relatedQuizzesContainer}>
                                                <Text style={styles.relatedQuizzesTitle}>Related Quizzes ({quizzesForLesson.length})</Text>
                                                {quizzesForLesson.map(quiz => (
                                                    <TouchableOpacity 
                                                        key={quiz._id}
                                                        style={styles.quizItem}
                                                        onPress={() => handleQuizPress(quiz._id)}
                                                    >
                                                        <Text style={styles.quizTitle}>{quiz.title}</Text>
                                                        {quiz.subject && (
                                                            <Text style={styles.quizSubject}>Subject: {quiz.subject}</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
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