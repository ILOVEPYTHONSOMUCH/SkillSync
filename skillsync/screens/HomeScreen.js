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
    Modal,
    FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AntDesign, Feather } from '@expo/vector-icons';
import { Navbar } from '../components/NavbarAndTheme.js';

const API_BASE = 'http://192.168.41.31:6000';
const { width, height } = Dimensions.get('window');

export default function PostScreen() {
    const [posts, setPosts] = useState([]);
    const [search, setSearch] = useState('');
    const [user, setUser] = useState({ username: '', totalScore: 0, avatar: null, grade: null, _id: null });
    const navigation = useNavigation();
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [selectedTeachSubjects, setSelectedTeachSubjects] = useState([]);
    const [selectedLearnSubjects, setSelectedLearnSubjects] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);

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
            
            // Extract all unique subjects for filtering
            const subjects = new Set();
            rawPosts.forEach(post => {
                (post.teachSubjects || []).forEach(subject => subjects.add(subject));
                (post.learnSubjects || []).forEach(subject => subjects.add(subject));
            });
            setAllSubjects(Array.from(subjects).sort());

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
                        commentsCount: post.commentsCount || 0,
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

    const handlePostPress = useCallback(async (postId) => {
        try {
            fetch(`${API_BASE}/api/posts/${postId}/view`, {
                method: 'POST',
            }).then(response => {
                if (!response.ok) {
                    console.warn(`Failed to increment view for post ${postId}`);
                    return;
                }
                return response.json();
            }).then(data => {
                if (data) {
                    setPosts(prevPosts =>
                        prevPosts.map(post =>
                            post._id === postId
                                ? { ...post, viewsCount: data.viewsCount }
                                : post
                        )
                    );
                }
            }).catch(e => {
                console.error("Error sending view increment request:", e);
            });
        } catch (e) {
            console.error("Error during view increment logic:", e);
        } finally {
            navigation.navigate('WatchInfo', { 
                contentId: postId, 
                contentType: 'post',
                onCommentAdded: () => {
                    loadPosts();
                }
            });
        }
    }, [navigation, loadPosts]);

    const handleVideoPress = useCallback((postId) => {
        handlePostPress(postId);
    }, [handlePostPress]);

    const formatPostDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const toggleTeachSubject = (subject) => {
        setSelectedTeachSubjects(prev => 
            prev.includes(subject) 
                ? prev.filter(s => s !== subject) 
                : [...prev, subject]
        );
    };

    const toggleLearnSubject = (subject) => {
        setSelectedLearnSubjects(prev => 
            prev.includes(subject) 
                ? prev.filter(s => s !== subject) 
                : [...prev, subject]
        );
    };

    const filtered = posts.filter(post => {
        const matchesSearch = (post.description || '').toLowerCase().includes(search.toLowerCase());
        const matchesTeachSubjects = selectedTeachSubjects.length === 0 || 
            (post.teachSubjects && selectedTeachSubjects.some(subj => post.teachSubjects.includes(subj)));
        const matchesLearnSubjects = selectedLearnSubjects.length === 0 || 
            (post.learnSubjects && selectedLearnSubjects.some(subj => post.learnSubjects.includes(subj)));
        return matchesSearch && matchesTeachSubjects && matchesLearnSubjects;
    });

    const renderSubjectItem = ({ item }) => (
        <View style={styles.subjectFilterContainer}>
            <TouchableOpacity 
                style={[
                    styles.subjectFilterButton,
                    selectedTeachSubjects.includes(item) && styles.selectedTeachSubject,
                ]}
                onPress={() => toggleTeachSubject(item)}
            >
                <Text style={styles.subjectFilterText}>Teach: {item}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[
                    styles.subjectFilterButton,
                    selectedLearnSubjects.includes(item) && styles.selectedLearnSubject,
                ]}
                onPress={() => toggleLearnSubject(item)}
            >
                <Text style={styles.subjectFilterText}>Learn: {item}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.select({ ios: 'padding', android: 'height' })}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
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

                <View style={styles.filterRow}>
                    <TouchableOpacity 
                        style={styles.filterButton}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <Feather name="filter" size={20} color="#000066" />
                        <Text style={styles.filterButtonText}>
                            Filter {selectedTeachSubjects.length + selectedLearnSubjects.length > 0 ? 
                                `(${selectedTeachSubjects.length + selectedLearnSubjects.length})` : ''}
                        </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.searchBar}>
                        <TextInput
                            style={styles.input}
                            placeholder="Search Posts 🔍"
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={filterModalVisible}
                    onRequestClose={() => setFilterModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filter Subjects</Text>
                                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                    <Feather name="x" size={24} color="#000" />
                                </TouchableOpacity>
                            </View>
                            
                            <FlatList
                                data={allSubjects}
                                renderItem={renderSubjectItem}
                                keyExtractor={(item) => item}
                                contentContainerStyle={styles.subjectList}
                            />
                            
                            <View style={styles.modalFooter}>
                                <TouchableOpacity 
                                    style={styles.clearButton}
                                    onPress={() => {
                                        setSelectedTeachSubjects([]);
                                        setSelectedLearnSubjects([]);
                                    }}
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

                <ScrollView style={styles.feedContainer} contentContainerStyle={{ paddingBottom: 20 }}>
                    {filtered.length === 0 ? (
                        <View style={styles.noPostsContainer}>
                            <Text style={styles.noPostsText}>
                                {search || selectedTeachSubjects.length > 0 || selectedLearnSubjects.length > 0 
                                    ? "No posts match your filters" 
                                    : "It looks like there are no posts here yet.\nBe the first to create one!"}
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
                                onPress={() => handlePostPress(post._id)}
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

                                {post.teachSubjects && post.teachSubjects.length > 0 && (
                                    <View style={styles.subjectRow}>
                                        <Feather name="book-open" size={16} color="#4CAF50" style={styles.subjectIcon} />
                                        <Text style={styles.subjectText}>
                                            <Text style={styles.subjectLabel}>Teach: </Text>
                                            {post.teachSubjects.join(', ')}
                                        </Text>
                                    </View>
                                )}

                                {post.learnSubjects && post.learnSubjects.length > 0 && (
                                    <View style={styles.subjectRow}>
                                        <Feather name="bulb" size={16} color="#FFC107" style={styles.subjectIcon} />
                                        <Text style={styles.subjectText}>
                                            <Text style={styles.subjectLabel}>Learn: </Text>
                                            {post.learnSubjects.join(', ')}
                                        </Text>
                                    </View>
                                )}

                                {post.image && (
                                    <Image
                                        source={{ uri: fileUrlFrom(post.image) }}
                                        style={styles.feedImage}
                                        resizeMode="cover"
                                    />
                                )}

                                {post.video && (
                                    <TouchableOpacity
                                        style={styles.videoContainer}
                                        onPress={() => handleVideoPress(post._id)}
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
                                    <View style={styles.statItem}>
                                        <Feather name="message-square" size={16} color="#666" />
                                        <Text style={styles.statText}>{post.commentsCount || 0}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <Navbar></Navbar>
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
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f1f1',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
        marginRight: 10,
    },
    filterButtonText: {
        marginLeft: 5,
        color: '#000066',
        fontWeight: '500',
    },
    searchBar: {
        flex: 1,
    },
    input: {
        backgroundColor: '#ddd',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 16
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
        maxHeight: height * 0.8,
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
    subjectFilterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    subjectFilterButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#f1f1f1',
        marginHorizontal: 5,
        alignItems: 'center',
    },
    selectedTeachSubject: {
        backgroundColor: '#4CAF50',
    },
    selectedLearnSubject: {
        backgroundColor: '#FFC107',
    },
    subjectFilterText: {
        fontSize: 14,
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
        backgroundColor: '#000066',
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