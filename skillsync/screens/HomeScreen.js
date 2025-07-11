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
    // Linking // Removed as it's not used in this component's current logic
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AntDesign, Feather } from '@expo/vector-icons';

const API_BASE = 'http://192.168.41.31:6000';
const { width } = Dimensions.get('window');

export default function PostScreen() {
    const [posts, setPosts] = useState([]);
    const [search, setSearch] = useState('');
    const [user, setUser] = useState({ username: '', totalScore: 0, avatar: null, grade: null, _id: null });
    const navigation = useNavigation();

    useEffect(() => {
        (async () => {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const me = await res.json();
                    setUser({
                        username: me.username,
                        totalScore: me.totalScore,
                        avatar: me.avatar,
                        grade: me.grade,
                        _id: me._id,
                    });
                }
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    const fileUrlFrom = useCallback(relPath => {
        if (!relPath) return null;
        const encoded = encodeURIComponent(relPath.replace(/\\/g, '/'));
        return `${API_BASE}/api/file?path=${encoded}`;
    }, []);

    const loadPosts = useCallback(async () => {
        if (user.grade == null) return;
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${API_BASE}/api/search/posts?type=posts&grade=${user.grade}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                if (res.status === 404) {
                    setPosts([]);
                    return;
                }
                throw new Error('Failed to load posts');
            }
            const rawPosts = await res.json();
            const enrichedPosts = await Promise.all(
                rawPosts.map(async (post) => {
                    let authorUsername = 'Unknown';
                    let authorAvatar = null;
                    try {
                        const userRes = await fetch(`${API_BASE}/api/users/${post.user}`);
                        const userInfo = await userRes.json();
                        authorUsername = userInfo.username;
                        authorAvatar = userInfo.avatar;
                    } catch (e) {
                        console.error("Error fetching author info for post:", post._id, e);
                    }

                    const isLikedByUser = post.likes ? post.likes.includes(user._id) : false;
                    const isDislikedByUser = post.dislikes ? post.dislikes.includes(user._id) : false;

                    return {
                        ...post,
                        authorUsername: authorUsername,
                        authorAvatar: authorAvatar,
                        likesCount: post.likes ? post.likes.length : 0,
                        dislikesCount: post.dislikes ? post.dislikes.length : 0,
                        isLikedByUser: isLikedByUser,
                        isDislikedByUser: isDislikedByUser,
                        viewsCount: post.viewsCount || 0,
                        commentCount: post.commentCount || 0,
                        teachSubjects: post.teachSubjects || [],
                        learnSubjects: post.learnSubjects || [],
                    };
                })
            );

            const sortedPosts = enrichedPosts.sort((a, b) => {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            setPosts(sortedPosts);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Cannot load posts');
            setPosts([]);
        }
    }, [user.grade, user._id]);

    useFocusEffect(
        useCallback(() => {
            loadPosts();
        }, [loadPosts])
    );

    const handleLikeDislike = useCallback(async (postId, action) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Authentication Error', 'Please log in to like/dislike posts.');
                return;
            }

            const res = await fetch(`${API_BASE}/api/posts/${postId}/${action}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (res.ok) {
                const data = await res.json();
                setPosts(prevPosts =>
                    prevPosts.map(post =>
                        post._id === postId
                            ? {
                                ...post,
                                likesCount: data.likesCount,
                                dislikesCount: data.dislikesCount,
                                isLikedByUser: data.isLikedByUser,
                                isDislikedByUser: data.isDislikedByUser,
                            }
                            : post
                    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                );
            } else {
                const errorData = await res.json();
                Alert.alert('Error', errorData.message || `Failed to ${action} post.`);
            }
        } catch (e) {
            console.error(`Error handling ${action}:`, e);
            Alert.alert('Network Error', `Could not connect to the server to ${action} post.`);
        }
    }, []);

    // MODIFIED: Function to handle post press, increment view count, and navigate
    const handlePostPress = useCallback(async (postId) => {
        try {
            // Increment view count (fire and forget for UI responsiveness)
            fetch(`${API_BASE}/api/posts/${postId}/view`, {
                method: 'POST',
            }).then(response => {
                if (!response.ok) {
                    console.warn(`Failed to increment view for post ${postId}`);
                }
            }).catch(e => {
                console.error("Error sending view increment request:", e);
            });

            // Optimistically update the viewsCount in the local state immediately
            setPosts(prevPosts =>
                prevPosts.map(post =>
                    post._id === postId
                        ? { ...post, viewsCount: (post.viewsCount || 0) + 1 }
                        : post
                )
            );
        } catch (e) {
            console.error("Error during view increment logic:", e);
            // Even if view increment fails, proceed with navigation
        } finally {
            // Navigate to WatchInfo.js with the post ID and type
            // Ensure 'WatchInfo' matches the name in your navigation stack
            navigation.navigate('WatchInfo', { contentId: postId, contentType: 'post' });
        }
    }, [navigation]);

    // handleVideoPress now simply calls handlePostPress as it's the same navigation logic
    const handleVideoPress = useCallback((postId) => {
        handlePostPress(postId);
    }, [handlePostPress]);

    const formatPostDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const filtered = posts.filter(post =>
        (post.description || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.select({ ios: 'padding', android: 'height' })}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} // Adjust offset for Android if needed
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                        {user.avatar ? (
                            <Image source={{ uri: fileUrlFrom(user.avatar) }} style={styles.profileImg} />
                        ) : (
                            <Image source={require('../assets/Sign-in.png')} style={styles.profileImg} />
                        )}
                    </TouchableOpacity>
                    <View style={styles.headerTextGroup}>
                        <Text style={styles.feedTitle}>Your Feed</Text>
                        <Text style={styles.points}>
                            {user.username} · {user.totalScore} pts · Grade {user.grade}
                        </Text>
                    </View>
                    <Image source={require('../assets/SkillSyncLogo.png')} style={styles.logo} />
                </View>

                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Search Posts 🔍"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <ScrollView style={styles.feedContainer} contentContainerStyle={{ paddingBottom: 20 }}>
                    {filtered.length === 0 ? (
                        <View style={styles.noPostsContainer}>
                            <Text style={styles.noPostsText}>
                                It looks like there are no posts here yet.
                                {"\n"}Be the first to create one!
                            </Text>
                            <TouchableOpacity
                                style={styles.createPostButton}
                                onPress={() => navigation.navigate('Upload')}
                            >
                                <Text style={styles.createPostButtonText}>Create New Post</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        filtered.map(post => (
                            <TouchableOpacity
                                key={post._id}
                                style={styles.feedCard}
                                onPress={() => handlePostPress(post._id)} // Increment views & navigate when card is pressed
                            >
                                <View style={styles.feedHeader}>
                                    {post.authorAvatar ? (
                                        <Image source={{ uri: fileUrlFrom(post.authorAvatar) }} style={styles.feedProfile} />
                                    ) : (
                                        <Image source={require('../assets/Sign-in.png')} style={styles.feedProfile} />
                                    )}
                                    <View>
                                        <Text style={styles.feedAuthor}>{post.authorUsername}</Text>
                                        {post.createdAt && (
                                            <Text style={styles.postTime}>{formatPostDate(post.createdAt)}</Text>
                                        )}
                                    </View>
                                </View>
                                <Text style={styles.feedContent}>{post.title}</Text>

                                {/* Display Teach Subjects with icon */}
                                {post.teachSubjects && post.teachSubjects.length > 0 && (
                                    <View style={styles.subjectRow}>
                                        <Feather name="book-open" size={16} color="#4CAF50" style={styles.subjectIcon} />
                                        <Text style={styles.subjectText}>
                                            <Text style={styles.subjectLabel}>Teach: </Text>
                                            {post.teachSubjects.join(', ')}
                                        </Text>
                                    </View>
                                )}

                                {/* Display Learn Subjects with icon */}
                                {post.learnSubjects && post.learnSubjects.length > 0 && (
                                    <View style={styles.subjectRow}>
                                        <Feather name="bulb" size={16} color="#FFC107" style={styles.subjectIcon} />
                                        <Text style={styles.subjectText}>
                                            <Text style={styles.subjectLabel}>Learn: </Text>
                                            {post.learnSubjects.join(', ')}
                                        </Text>
                                    </View>
                                )}

                                {/* Image display */}
                                {post.image && (
                                    <Image
                                        source={{ uri: fileUrlFrom(post.image) }}
                                        style={styles.feedImage}
                                        resizeMode="cover"
                                    />
                                )}

                                {/* Video thumbnail display */}
                                {post.video && (
                                    <TouchableOpacity
                                        style={styles.videoContainer}
                                        onPress={() => handleVideoPress(post._id)} // Pass postId
                                    >
                                        {post.thumbnail ? (
                                            <Image
                                                source={{ uri: fileUrlFrom(post.thumbnail) }}
                                                style={styles.videoThumbnail}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={styles.videoPlaceholder}>
                                                <Ionicons name="videocam" size={40} color="#888" />
                                            </View>
                                        )}
                                        <View style={styles.playButtonOverlay}>
                                            <Ionicons
                                                name="play-circle"
                                                size={60}
                                                color="rgba(255,255,255,0.8)"
                                            />
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {/* NEW: Views, Likes, Dislikes, Comments Row */}
                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Feather name="eye" size={16} color="#666" />
                                        <Text style={styles.statText}>{post.viewsCount || 0}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleLikeDislike(post._id, 'like')}
                                        style={styles.statItem}
                                    >
                                        <AntDesign
                                            name="like2"
                                            size={16}
                                            color={post.isLikedByUser ? 'blue' : '#666'}
                                        />
                                        <Text style={[styles.statText, post.isLikedByUser && styles.activeLikeText]}>
                                            {post.likesCount || 0}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleLikeDislike(post._id, 'dislike')}
                                        style={styles.statItem}
                                    >
                                        <AntDesign
                                            name="dislike2"
                                            size={16}
                                            color={post.isDislikedByUser ? 'red' : '#666'}
                                        />
                                        <Text style={[styles.statText, post.isDislikedByUser && styles.activeDislikeText]}>
                                            {post.dislikesCount || 0}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.statItem} onPress={()=>{Alert.alert('Info', 'Click the Post to comment !')}}>
                                        <Feather name="message-square" size={16} color="#666" />
                                        <Text style={styles.statText}>{post.commentCount || 0}</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.navBar}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
                    <Image source={require('../assets/home.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>HOME</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Quiz')}>
                    <Image source={require('../assets/quiz.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>QUIZ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Lesson')}>
                    <Image source={require('../assets/lesson.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>LESSON</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Post')}>
                    <Image source={require('../assets/post.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>POST</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ChatFeed')}>
                    <Image source={require('../assets/chatfeed.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>CHAT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
                    <Image source={require('../assets/Sign-in.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>PROFILE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#edffff', position: 'relative' },
    content: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        marginTop: 20
    },
    profileImg: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#000066'
    },
    headerTextGroup: {
        flex: 1,
        marginLeft: 10
    },
    feedTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#17296a'
    },
    points: {
        fontSize: 14,
        color: '#c00',
        marginTop: 4
    },
    logo: {
        width: 40,
        height: 40
    },
    searchBar: {
        marginHorizontal: 20,
        marginBottom: 10
    },
    input: {
        backgroundColor: '#ddd',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 16
    },
    feedContainer: {
        paddingHorizontal: 20
    },
    feedCard: {
        backgroundColor: '#f1f1f1',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
    },
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    feedProfile: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10
    },
    feedAuthor: {
        fontWeight: 'bold',
        fontSize: 16
    },
    postTime: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    feedContent: {
        fontSize: 15,
        marginVertical: 8,
        fontWeight: 600
    },
    subjectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    subjectIcon: {
        marginRight: 6,
    },
    subjectText: {
        fontSize: 13,
        color: '#333',
        flexShrink: 1,
    },
    subjectLabel: {
        fontWeight: 'bold',
    },
    feedImage: {
        height: 160,
        width: width - 72,
        borderRadius: 8,
        marginTop: 10
    },
    videoContainer: {
        position: 'relative',
        height: 200,
        width: width - 72,
        borderRadius: 8,
        marginTop: 10,
        backgroundColor: '#000',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    videoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButtonOverlay: {
        position: 'absolute',
        zIndex: 1,
    },
    commentBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12
    },
    imageIcon: {
        width: 24,
        height: 24,
        marginRight: 8
    },
    commentPlaceholder: {
        flex: 1,
        color: '#888'
    },
    commentSubmit: {
        color: '#000066',
        fontWeight: 'bold'
    },
    noPostsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50,
    },
    noPostsText: {
        fontSize: 18,
        color: '#555',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
    },
    createPostButton: {
        backgroundColor: '#000066',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    createPostButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
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
        justifyContent: 'center'
    },
    navIcon: {
        width: 24,
        height: 24,
        marginBottom: 2
    },
    navText: {
        fontSize: 11,
        color: '#000d63',
        fontWeight: '500'
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
    },
    statText: {
        fontSize: 14,
        color: '#555',
        marginLeft: 5,
    },
    activeLikeText: {
        color: 'blue',
        fontWeight: 'bold',
    },
    activeDislikeText: {
        color: 'red',
        fontWeight: 'bold',
    }
});