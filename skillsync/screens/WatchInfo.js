import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    Linking,
    TextInput,
    KeyboardAvoidingView
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { AntDesign, Feather } from '@expo/vector-icons';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.41.31:6000'; // Ensure this matches your backend IP

export default function WatchInfo() {
    const route = useRoute();
    const { contentId, contentType = 'lesson' } = route.params || {};

    const navigation = useNavigation();

    const videoRef = useRef(null);
    const scrollViewRef = useRef(null); // Ref for scrolling to comments
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState({}); // For video playback status

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentError, setCommentError] = useState(null);

    const { width } = Dimensions.get('window');
    // Removed direct usage of videoWidth and videoHeight in favor of CSS aspect ratio for Video component

    // Function to fetch content details (lesson or post)
    const fetchContentDetails = useCallback(async () => {
        if (!contentId) {
            setError('Content ID is missing. Cannot fetch details.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Authentication Required', 'Please log in to view content details.');
                setLoading(false);
                navigation.goBack();
                return;
            }

            let apiUrl;
            if (contentType === 'lesson') {
                apiUrl = `${API_BASE}/api/lesson/${contentId}`;
            } else if (contentType === 'post') {
                apiUrl = `${API_BASE}/api/posts/${contentId}`;
            } else {
                throw new Error('Invalid content type specified. Must be "lesson" or "post".');
            }

            const res = await fetch(apiUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Failed to fetch ${contentType} details.`);
            }

            let data = await res.json();

            // Logic to fetch full user info if 'content.user' is just an ID (remains as discussed)
            if (data.user && typeof data.user === 'string') {
                try {
                    const userRes = await fetch(`${API_BASE}/api/users/${data.user}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (!userRes.ok) {
                        const userErrorData = await userRes.json();
                        console.warn(`Could not fetch user details for ID ${data.user}:`, userErrorData.message);
                    } else {
                        const userData = await userRes.json();
                        data = { ...data, user: userData };
                    }
                } catch (userFetchErr) {
                    console.error(`Error fetching user details for ID ${data.user}:`, userFetchErr);
                }
            }

            setContent(data);
        } catch (err) {
            console.error(`Error fetching ${contentType}:`, err);
            setError(err.message);
            Alert.alert('Error', err.message || `Could not load ${contentType} details. Please try again.`);
        } finally {
            setLoading(false);
        }
    }, [contentId, contentType, navigation]);

    // --- Function to fetch comments ---
    const fetchComments = useCallback(async () => {
        if (!contentId) {
            setCommentError('Cannot fetch comments: Content ID is missing.');
            return;
        }
        setCommentLoading(true);
        setCommentError(null);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Authentication Required', 'Please log in to view comments.');
                setCommentLoading(false);
                return;
            }

            const res = await fetch(`${API_BASE}/api/comments/content/${contentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to fetch comments.');
            }

            const data = await res.json();
            // Sort by createdAt in ascending order to show oldest first
            const sortedComments = data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setComments(sortedComments);
        } catch (err) {
            console.error("Error fetching comments:", err);
            setCommentError(err.message || 'Could not load comments.');
        } finally {
            setCommentLoading(false);
        }
    }, [contentId]);

    // --- Function to post a new comment ---
    const handlePostComment = useCallback(async () => {
        if (!newComment.trim()) {
            Alert.alert('Input Required', 'Please type a comment before posting.');
            return;
        }
        if (!contentId) {
            Alert.alert('Error', 'Cannot post comment: Content ID is missing.');
            return;
        }

        setCommentLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Authentication Required', 'Please log in to post comments.');
                setCommentLoading(false);
                return;
            }

            const res = await fetch(`${API_BASE}/api/comments/content/${contentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    text: newComment.trim(),
                    contentType: contentType
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to post comment.');
            }

            const postedComment = await res.json();

            setNewComment('');
            // Add the new comment with a dummy user for display until we refetch all comments
            // For a more robust solution, you'd fetch the current user's details and include them
            // or modify your backend to return the full user object with the new comment.
            // For now, let's just refetch all comments to ensure user data is correct.
            fetchComments(); 

            // Scroll to end after a slight delay to ensure content is rendered
            setTimeout(() => {
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollToEnd({ animated: true });
                }
            }, 100);

        } catch (err) {
            console.error("Error posting comment:", err);
            Alert.alert('Error', err.message || 'Failed to post comment. Please try again.');
        } finally {
            setCommentLoading(false);
        }
    }, [contentId, newComment, contentType, fetchComments]); // Added fetchComments to dependency array

    // --- Function to delete a comment ---
    const handleDeleteComment = useCallback(async (commentId) => {
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    onPress: async () => {
                        setCommentLoading(true);
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            if (!token) {
                                Alert.alert('Authentication Required', 'Please log in to delete comments.');
                                setCommentLoading(false);
                                return;
                            }

                            const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
                                method: 'DELETE',
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            });

                            if (!res.ok) {
                                const errorData = await res.json();
                                throw new Error(errorData.message || 'Failed to delete comment.');
                            }

                            Alert.alert('Success', 'Comment deleted successfully.');
                            setComments(prevComments => prevComments.filter(comment => comment._id !== commentId));

                        } catch (err) {
                            console.error("Error deleting comment:", err);
                            Alert.alert('Error', err.message || 'Failed to delete comment. Please try again.');
                        } finally {
                            setCommentLoading(false);
                        }
                    }
                }
            ]
        );
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchContentDetails();
            fetchComments(); // Fetch comments when screen focuses
            return () => {
                // Pause and unload video when screen blurs to save resources
                if (videoRef.current) {
                    videoRef.current.pauseAsync();
                    videoRef.current.unloadAsync();
                }
            };
        }, [fetchContentDetails, fetchComments])
    );

    const getFileUrl = (path) =>
        path
            ? `${API_BASE}/api/file?path=${encodeURIComponent(path.replace(/\\/g, '/'))}`
            : null;

    const formatContentDate = (dateString) => {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        try {
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString;
        }
    };

    const formatCommentDate = (dateString) => { // New function for comment dates
        if (!dateString) return '';
        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        try {
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) {
            return dateString;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000c52" />
                <Text style={styles.loadingText}>Loading {contentType}...</Text>
            </View>
        );
    }

    if (error || !content) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || `The ${contentType} could not be loaded or was not found.`}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchContentDetails}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    console.log(content);
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -200}
        >
            {/* Top Bar */}
            <View style={styles.topBar} />

            {/* Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <AntDesign name="arrowleft" size={24} color="#000c52" />
                </TouchableOpacity>
                <Image source={require('../assets/SkillSyncLogo.png')} style={styles.logo} />
            </View>

            <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollViewContent}>
                {/* Video Player / Image Display */}
                <View style={styles.mediaContainer}>
                    {content.video ? ( // Check for video first
                        <Video
                            ref={videoRef}
                            style={styles.videoPlayer}
                            source={{ uri: getFileUrl(content.video) }}
                            useNativeControls
                            resizeMode="contain"
                            isLooping={false}
                            onPlaybackStatusUpdate={setStatus}
                        />
                    ) : content.image ? ( // If no video, check for image
                        <Image
                            source={{ uri: getFileUrl(content.image) }}
                            style={styles.imageDisplay}
                            resizeMode="contain"
                        />
                    ) : ( // If neither video nor image, show placeholder
                        <View style={styles.placeholderMedia}>
                            <AntDesign name="filetext1" size={60} color="#999" />
                            <Text style={styles.placeholderMediaText}>No media available</Text>
                        </View>
                    )}
                </View>

                {/* Content Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.contentTitle}>{content.title}</Text>

                    <View style={styles.uploaderRow}>
                        {content.user?.avatar && (
                            <Image
                                source={{ uri: getFileUrl(content.user.avatar) }}
                                style={styles.uploaderAvatar}
                            />
                        )}
                        <View style={styles.uploaderDetails}>
                            <Text style={styles.uploaderName}>{content.user?.username || 'Unknown Uploader'}</Text>
                            {content.createdAt && (
                                <Text style={styles.uploadDate}>{formatContentDate(content.createdAt)}</Text>
                            )}
                        </View>
                        {(contentType === 'lesson' || content.subject) && (
                            <View style={[styles.subjectBadge, { backgroundColor: '#28a745' }]}>
                                <Text style={styles.subjectBadgeText}>{content.subject || 'N/A'}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.contentDescription}>{content.description}</Text>

                    {content.referenceLink && (
                        <TouchableOpacity onPress={() => Linking.openURL(content.referenceLink)} style={styles.referenceLinkButton}>
                            <AntDesign name="link" size={16} color="#000c52" />
                            <Text style={styles.referenceLinkText}>View Reference Link</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Interactive Section: Likes, Dislikes, Comments */}
                <View style={styles.interactiveSection}>
                    <TouchableOpacity style={styles.interactiveButton}>
                        <AntDesign name="like2" size={24} color="#000c52" />
                        <Text style={styles.interactiveText}>{content.likesCount || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.interactiveButton}>
                        <AntDesign name="dislike2" size={24} color="#000c52" />
                        <Text style={styles.interactiveText}>{content.dislikesCount || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.interactiveButton}
                        onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    >
                        <Feather name="message-square" size={24} color="#000c52" />
                        <Text style={styles.interactiveText}>{comments.length || 0}</Text>
                    </TouchableOpacity>
                </View>

                {/* Comments Section */}
                <View style={styles.commentsSection}>
                    <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

                    {commentLoading && comments.length === 0 ? (
                        <ActivityIndicator size="small" color="#000c52" style={{ marginVertical: 20 }} />
                    ) : commentError ? (
                        <Text style={styles.commentErrorText}>Error loading comments: {commentError}</Text>
                    ) : comments.length === 0 ? (
                        <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                    ) : (
                        comments.map(comment => (
                            <View key={comment._id} style={styles.commentItem}>
                                {comment.user?.avatar ? (
                                    <Image
                                        source={{ uri: getFileUrl(comment.user.avatar) }}
                                        style={styles.commentAvatar}
                                    />
                                ) : (
                                    <View style={styles.commentAvatarPlaceholder}>
                                        <Feather name="user" size={20} color="#fff" />
                                    </View>
                                )}
                                <View style={styles.commentContent}>
                                    <View style={styles.commentHeader}>
                                        <Text style={styles.commentUsername}>{comment.user?.username || 'Anonymous'}</Text>
                                        <Text style={styles.commentDate}>{formatCommentDate(comment.createdAt)}</Text>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteComment(comment._id)}
                                            style={styles.deleteCommentButton}
                                        >
                                            <AntDesign name="delete" size={18} color="red" />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.commentText}>{comment.text}</Text>
                                    {/* Display comment media if available */}
                                    {comment.imagePath && (
                                        <Image
                                            source={{ uri: getFileUrl(comment.imagePath) }}
                                            style={styles.commentMediaImage}
                                            resizeMode="contain"
                                        />
                                    )}
                                    {comment.videoPath && (
                                        <Video
                                            source={{ uri: getFileUrl(comment.videoPath) }}
                                            style={styles.commentMediaVideo}
                                            useNativeControls
                                            resizeMode="contain"
                                        />
                                    )}
                                </View>
                            </View>
                        ))
                    )}

                    {/* Comment Input */}
                    <View style={styles.commentInputContainer}>
                        <TextInput
                            style={styles.commentInputField}
                            placeholder="Add a comment..."
                            placeholderTextColor="#888"
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        <TouchableOpacity
                            style={styles.postCommentButton}
                            onPress={handlePostComment}
                            disabled={commentLoading || !newComment.trim()}
                        >
                            {commentLoading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Feather name="send" size={24} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f2f2',
    },
    topBar: {
        backgroundColor: '#000c52',
        height: 50,
        paddingTop: Platform.OS === 'ios' ? 30 : 0,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    backButton: {
        padding: 5,
    },
    logo: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    mediaContainer: {
        width: '100%',
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200, // Ensure a minimum height for the container
    },
    videoPlayer: {
        width: '100%',
        aspectRatio: 16 / 9, // This will make the video player responsive
    },
    imageDisplay: {
        width: '100%',
        height: 250, // You can adjust this height or use aspectRatio if images have consistent aspect
        resizeMode: 'contain',
    },
    placeholderMedia: {
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
    },
    placeholderMediaText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    infoSection: {
        padding: 15,
        backgroundColor: 'white',
        marginHorizontal: 10,
        borderRadius: 10,
        marginTop: 15,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    contentTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    uploaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    uploaderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    uploaderDetails: {
        flex: 1,
    },
    uploaderName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    uploadDate: {
        fontSize: 13,
        color: '#777',
    },
    subjectBadge: {
        backgroundColor: '#28a745',
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginLeft: 'auto',
    },
    subjectBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    contentDescription: {
        fontSize: 15,
        color: '#555',
        lineHeight: 22,
        marginBottom: 15,
    },
    referenceLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0f2f7',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        justifyContent: 'center',
    },
    referenceLinkText: {
        marginLeft: 8,
        fontSize: 15,
        color: '#000c52',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    interactiveSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        marginHorizontal: 10,
        marginTop: 10,
        backgroundColor: 'white',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    interactiveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
    },
    interactiveText: {
        marginLeft: 5,
        fontSize: 16,
        color: '#000c52',
        fontWeight: 'bold',
    },
    commentsSection: {
        padding: 15,
        backgroundColor: 'white',
        marginHorizontal: 10,
        borderRadius: 10,
        marginTop: 15,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    commentErrorText: {
        fontSize: 14,
        color: 'red',
        textAlign: 'center',
        paddingVertical: 10,
    },
    noCommentsText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        paddingVertical: 20,
    },
    commentItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    commentAvatar: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    commentAvatarPlaceholder: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        marginRight: 10,
        backgroundColor: '#000c52',
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    commentUsername: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#333',
    },
    commentDate: {
        fontSize: 12,
        color: '#888',
        marginLeft: 10,
    },
    commentText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 5,
    },
    commentMediaImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 5,
    },
    commentMediaVideo: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 5,
    },
    deleteCommentButton: {
        marginLeft: 'auto',
        padding: 5,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    commentInputField: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        marginRight: 10,
        maxHeight: 100,
        fontSize: 15,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    postCommentButton: {
        backgroundColor: '#000c52',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f2f2f2',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#000c52',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f2f2f2',
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#000c52',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
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
});