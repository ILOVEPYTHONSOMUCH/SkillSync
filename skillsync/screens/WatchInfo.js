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
import { API_BASE_URL } from "../components/NavbarAndTheme";
const API_BASE  = API_BASE_URL;

export default function WatchInfo() {
    const route = useRoute();
    const { contentId, contentType = 'lesson' } = route.params || {};

    const navigation = useNavigation();

    const videoRef = useRef(null);
    const scrollViewRef = useRef(null);
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState({});

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentError, setCommentError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    const [likesCount, setLikesCount] = useState(0);
    const [dislikesCount, setDislikesCount] = useState(0);
    const [userLikeStatus, setUserLikeStatus] = useState(null);
    const [isLikingDisliking, setIsLikingDisliking] = useState(false);
    
    const { width } = Dimensions.get('window');

    const getFileUrl = useCallback((path) =>
        path ? `${API_BASE}/file?path=${encodeURIComponent(path.replace(/\\/g, '/'))}` : null,
        []
    );

    const fetchUserDetails = useCallback(async (userId, token) => {
        try {
            const userRes = await fetch(`${API_BASE}/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!userRes.ok) {
                const userErrorData = await userRes.json();
                console.warn(`Could not fetch user details for ID ${userId}:`, userErrorData.message);
                return null;
            }
            return await userRes.json();
        } catch (userFetchErr) {
            console.error(`Error fetching user details for ID ${userId}:`, userFetchErr);
            return null;
        }
    }, []);

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
                apiUrl = `${API_BASE}/lesson/${contentId}`;
            } else if (contentType === 'post') {
                apiUrl = `${API_BASE}/posts/${contentId}`;
            } else {
                throw new Error('Invalid content type specified. Must be "lesson" or "post".');
            }

            const res = await fetch(apiUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorData = await res.json();
                if (res.status === 404) {
                    throw new Error(`The ${contentType} was not found or has been removed.`);
                }
                throw new Error(errorData.message || `Failed to fetch ${contentType} details.`);
            }

            let data = await res.json();
            if (data.user && typeof data.user === 'string') {
                const userDetails = await fetchUserDetails(data.user, token);
                if (userDetails) {
                    data = { ...data, user: userDetails };
                }
            }

            setContent(data);
            setLikesCount(data.likesCount || 0);
            setDislikesCount(data.dislikesCount || 0);
            setUserLikeStatus(data.userLikeStatus || null);

        } catch (err) {
            console.error(`Error fetching ${contentType}:`, err);
            setError(err.message);
            Alert.alert('Error', err.message || `Could not load ${contentType} details. Please try again.`);
        } finally {
            setLoading(false);
        }
    }, [contentId, contentType, navigation, fetchUserDetails]);

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

            const res = await fetch(`${API_BASE}/comments/content/${contentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to fetch comments.');
            }

            const data = await res.json();
            setComments(data);

        } catch (err) {
            console.error("Error fetching comments:", err);
            setCommentError(err.message || 'Could not load comments.');
        } finally {
            setCommentLoading(false);
        }
    }, [contentId]);

    const fetchCurrentUser = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;
            
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                console.warn('Failed to fetch current user:', errorData.message);
                return;
            }
            
            const userData = await res.json();
            setCurrentUser(userData);
        } catch (err) {
            console.error('Error fetching current user:', err);
        }
    }, []);

    const handleLike = useCallback(async () => {
        if (!contentId || isLikingDisliking) return;
        setIsLikingDisliking(true);

        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Authentication Required', 'Please log in to like content.');
                return;
            }

            let likeApiUrl;
            if (contentType === 'lesson') {
                likeApiUrl = `${API_BASE}/lesson/${contentId}/like`;
            } else if (contentType === 'post') {
                likeApiUrl = `${API_BASE}/posts/${contentId}/like`;
            } else {
                throw new Error('Invalid content type for liking.');
            }

            const previousUserLikeStatus = userLikeStatus;
            const previousLikesCount = likesCount;
            const previousDislikesCount = dislikesCount;

            let newLikesCount = likesCount;
            let newDislikesCount = dislikesCount;
            let newUserLikeStatus;

            if (userLikeStatus === 'liked') {
                newLikesCount--;
                newUserLikeStatus = null;
            } else {
                newLikesCount++;
                if (userLikeStatus === 'disliked') {
                    newDislikesCount--;
                }
                newUserLikeStatus = 'liked';
            }

            setLikesCount(newLikesCount);
            setDislikesCount(newDislikesCount);
            setUserLikeStatus(newUserLikeStatus);

            const res = await fetch(likeApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({})
            });

            if (!res.ok) {
                const errorData = await res.json();
                setLikesCount(previousLikesCount);
                setDislikesCount(previousDislikesCount);
                setUserLikeStatus(previousUserLikeStatus);
                throw new Error(errorData.message || 'Failed to like content.');
            }

            const data = await res.json();
            setLikesCount(data.likesCount);
            setDislikesCount(data.dislikesCount);
            setUserLikeStatus(data.userLikeStatus);

        } catch (err) {
            console.error("Error liking content:", err);
            Alert.alert('Error', err.message || 'Failed to like content. Please try again.');
        } finally {
            setIsLikingDisliking(false);
        }
    }, [contentId, contentType, likesCount, dislikesCount, userLikeStatus, isLikingDisliking]);

    const handleDislike = useCallback(async () => {
        if (!contentId || isLikingDisliking) return;
        setIsLikingDisliking(true);

        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Authentication Required', 'Please log in to dislike content.');
                return;
            }

            let dislikeApiUrl;
            if (contentType === 'lesson') {
                dislikeApiUrl = `${API_BASE}/lesson/${contentId}/dislike`;
            } else if (contentType === 'post') {
                dislikeApiUrl = `${API_BASE}/posts/${contentId}/dislike`;
            } else {
                throw new Error('Invalid content type for disliking.');
            }

            const previousUserLikeStatus = userLikeStatus;
            const previousLikesCount = likesCount;
            const previousDislikesCount = dislikesCount;

            let newLikesCount = likesCount;
            let newDislikesCount = dislikesCount;
            let newUserLikeStatus;

            if (userLikeStatus === 'disliked') {
                newDislikesCount--;
                newUserLikeStatus = null;
            } else {
                newDislikesCount++;
                if (userLikeStatus === 'liked') {
                    newLikesCount--;
                }
                newUserLikeStatus = 'disliked';
            }

            setLikesCount(newLikesCount);
            setDislikesCount(newDislikesCount);
            setUserLikeStatus(newUserLikeStatus);

            const res = await fetch(dislikeApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({})
            });

            if (!res.ok) {
                const errorData = await res.json();
                setLikesCount(previousLikesCount);
                setDislikesCount(previousDislikesCount);
                setUserLikeStatus(previousUserLikeStatus);
                throw new Error(errorData.message || 'Failed to dislike content.');
            }

            const data = await res.json();
            setLikesCount(data.likesCount);
            setDislikesCount(data.dislikesCount);
            setUserLikeStatus(data.userLikeStatus);

        } catch (err) {
            console.error("Error disliking content:", err);
            Alert.alert('Error', err.message || 'Failed to dislike content. Please try again.');
        } finally {
            setIsLikingDisliking(false);
        }
    }, [contentId, contentType, likesCount, dislikesCount, userLikeStatus, isLikingDisliking]);

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

            const res = await fetch(`${API_BASE}/comments/content/${contentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    text: newComment.trim(),
                    contentType: contentType === 'lesson' ? 'Lesson' : 'Post'
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to post comment.');
            }

            const newCommentData = await res.json();
            setComments(prev => [...prev, newCommentData]);
            setNewComment('');

            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

        } catch (err) {
            console.error("Error posting comment:", err);
            Alert.alert('Error', err.message || 'Failed to post comment. Please try again.');
        } finally {
            setCommentLoading(false);
        }
    }, [contentId, newComment, contentType]);

    const handleDeleteComment = useCallback(async (commentId) => {
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            if (!token) {
                                Alert.alert('Authentication Required', 'Please log in to delete comments.');
                                return;
                            }

                            const res = await fetch(`${API_BASE}/comments/${commentId}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}` }
                            });

                            if (!res.ok) {
                                const errorData = await res.json();
                                throw new Error(errorData.message || 'Failed to delete comment.');
                            }

                            setComments(prev => prev.filter(c => c._id !== commentId));
                        } catch (err) {
                            console.error("Error deleting comment:", err);
                            Alert.alert('Error', err.message || 'Failed to delete comment. Please try again.');
                        }
                    }
                }
            ]
        );
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchContentDetails();
            fetchComments();
            fetchCurrentUser();
            return () => {
                if (videoRef.current) {
                    videoRef.current.pauseAsync();
                }
            };
        }, [fetchContentDetails, fetchComments, fetchCurrentUser])
    );

    const formatContentDate = (dateString) => {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        try {
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) {
            console.error("Error formatting content date:", dateString, e);
            return dateString;
        }
    };

    const formatCommentDate = (dateString) => {
        if (!dateString) return '';
        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        try {
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) {
            console.error("Error formatting comment date:", dateString, e);
            return dateString;
        }
    };

   const RelatedQuizzesSection = () => {
    const [quizzesData, setQuizzesData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchQuizzes = async () => {
            if (contentType !== 'lesson' || !content?.relatedQuizzes || content.relatedQuizzes.length === 0) {
                return;
            }

            setLoading(true);
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (!token) return;

                const fetchedQuizzes = [];
                for (const quizId of content.relatedQuizzes) {
                    const res = await fetch(`${API_BASE}/search/quizzes?keyword=${quizId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.length > 0) fetchedQuizzes.push(data[0]);
                    }
                }
                setQuizzesData(fetchedQuizzes);
            } catch (error) {
                console.log("Error fetching quizzes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, [content?.relatedQuizzes]);

    if (contentType !== 'lesson' || !content?.relatedQuizzes || content.relatedQuizzes.length === 0) {
        return null;
    }

    return (
        <View style={styles.relatedQuizzesSection}>
            <View style={styles.sectionHeader}>
                <Feather name="book" size={20} color="#000c52" />
                <Text style={styles.sectionTitle}>Related Quizzes</Text>
            </View>
            
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#000c52" />
                </View>
            ) : (
                quizzesData.map(quiz => (
                    <TouchableOpacity 
                        key={quiz._id}
                        style={styles.quizItem}
                        onPress={() => navigation.navigate('DoQuiz', { quizId: quiz.quizId })}
                    >
                        <View style={styles.quizHeader}>
                            <Feather name="file-text" size={16} color="#000c52" />
                            <Text style={styles.quizTitle}>{quiz.title}</Text>
                        </View>
                        
                        <View style={styles.quizMeta}>
                            <View style={styles.metaItem}>
                                <Feather name="book-open" size={14} color="#666" />
                                <Text style={styles.metaText}>{quiz.subject}</Text>
                            </View>
                            
                            <View style={styles.metaItem}>
                                <Feather name="award" size={14} color="#666" />
                                <Text style={styles.metaText}>Grade {quiz.grade}</Text>
                            </View>
                            
                            <View style={styles.metaItem}>
                                <Feather name="list" size={14} color="#666" />
                                <Text style={styles.metaText}>{quiz.questions?.length || 0} Questions</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );
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
                    {content.video ? (
                        <Video
                            ref={videoRef}
                            style={styles.videoPlayer}
                            source={{ uri: getFileUrl(content.video) }}
                            useNativeControls
                            resizeMode="contain"
                            isLooping={false}
                            onPlaybackStatusUpdate={setStatus}
                        />
                    ) : content.image ? (
                        <Image
                            source={{ uri: getFileUrl(content.image) }}
                            style={styles.imageDisplay}
                            resizeMode="contain"
                        />
                    ) : (
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

                    {/* Related Quizzes Section */}
                    <RelatedQuizzesSection />

                    {content.referenceLink && (
                        <TouchableOpacity onPress={() => Linking.openURL(content.referenceLink)} style={styles.referenceLinkButton}>
                            <AntDesign name="link" size={16} color="#000c52" />
                            <Text style={styles.referenceLinkText}>View Reference Link</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Interactive Section: Likes, Dislikes, Comments */}
                <View style={styles.interactiveSection}>
                    <TouchableOpacity
                        style={styles.interactiveButton}
                        onPress={handleLike}
                        disabled={isLikingDisliking}
                    >
                        <AntDesign
                            name={userLikeStatus === 'liked' ? 'like1' : 'like2'}
                            size={24}
                            color={userLikeStatus === 'liked' ? '#000c52' : '#888'}
                        />
                        <Text style={styles.interactiveText}>{likesCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.interactiveButton}
                        onPress={handleDislike}
                        disabled={isLikingDisliking}
                    >
                        <AntDesign
                            name={userLikeStatus === 'disliked' ? 'dislike1' : 'dislike2'}
                            size={24}
                            color={userLikeStatus === 'disliked' ? '#000c52' : '#888'}
                        />
                        <Text style={styles.interactiveText}>{dislikesCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.interactiveButton}
                        onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    >
                        <Feather name="message-square" size={24} color="#000c52" />
                        <Text style={styles.interactiveText}>{comments.length}</Text>
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
                                        <Text style={styles.commentUsername}>
                                            {comment.user?.username || 'Anonymous'}
                                        </Text>
                                        <Text style={styles.commentDate}>
                                            {formatCommentDate(comment.createdAt)}
                                        </Text>
                                    </View>
                                    <Text style={styles.commentText}>{comment.text}</Text>
                                    {comment.user && currentUser && comment.user._id === currentUser._id && (
                                        <TouchableOpacity 
                                            style={styles.deleteCommentButton}
                                            onPress={() => handleDeleteComment(comment._id)}
                                        >
                                            <Feather name="trash-2" size={16} color="#ff4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Comment Input Section */}
            <View style={styles.commentInputContainer}>
                <TextInput
                    style={styles.commentInput}
                    placeholder="Write a comment..."
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
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Feather name="send" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    topBar: {
        height: Platform.OS === 'ios' ? 40 : 0,
        backgroundColor: '#000c52',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 15,
        paddingTop:15
    },
    logo: {
        width: 120,
        height: 30,
        resizeMode: 'contain',
    },
    scrollViewContent: {
        paddingBottom: 80,
    },
    mediaContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
    },
    videoPlayer: {
        width: '100%',
        height: '100%',
    },
    imageDisplay: {
        width: '100%',
        height: '100%',
    },
    placeholderMedia: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    placeholderMediaText: {
        marginTop: 10,
        color: '#999',
    },
    infoSection: {
        padding: 15,
    },
    contentTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#000',
    },
    uploaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    uploaderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    uploaderDetails: {
        flex: 1,
    },
    uploaderName: {
        fontWeight: 'bold',
        color: '#000',
    },
    uploadDate: {
        color: '#888',
        fontSize: 12,
    },
    subjectBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
    },
    subjectBadgeText: {
        color: '#fff',
        fontSize: 12,
    },
    contentDescription: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        marginBottom: 15,
    },
    relatedQuizzesSection: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
    },
    relatedQuizzesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#000',
    },
    quizItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    quizTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
        color: '#000',
    },
    quizMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    quizSubject: {
        fontSize: 14,
        color: '#666',
    },
    quizGrade: {
        fontSize: 14,
        color: '#666',
    },
    referenceLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    referenceLinkText: {
        color: '#000c52',
        marginLeft: 5,
        textDecorationLine: 'underline',
    },
    interactiveSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    interactiveButton: {
        alignItems: 'center',
    },
    interactiveText: {
        marginTop: 5,
        color: '#000',
    },
    commentsSection: {
        padding: 15,
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#000',
    },
    commentItem: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    commentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    commentAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#000c52',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    commentUsername: {
        fontWeight: 'bold',
        color: '#000',
    },
    commentDate: {
        color: '#888',
        fontSize: 12,
    },
    commentText: {
        color: '#333',
    },
    deleteCommentButton: {
        alignSelf: 'flex-end',
        marginTop: 5,
    },
    commentErrorText: {
        color: 'red',
        marginVertical: 20,
        textAlign: 'center',
    },
    noCommentsText: {
        color: '#888',
        textAlign: 'center',
        marginVertical: 20,
    },
    commentInputContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    commentInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        marginRight: 10,
    },
    postCommentButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#000c52',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#000c52',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#000c52',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#fff',
    },relatedQuizzesSection: {
    marginTop: 20,
    paddingHorizontal: 15,
},
sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
},
sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#000',
},
loadingContainer: {
    paddingVertical: 10,
},
quizItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
},
quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
},
quizTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
    color: '#000',
},
quizMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
},
metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
},
metaText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
}
});