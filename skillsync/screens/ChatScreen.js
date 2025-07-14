import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { AntDesign, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const API_BASE = "http://192.168.41.31:6000"; 

const getFileUrl = (filePath) => {
    if (!filePath) return null;
    const relativePath = filePath.split('uploads\\')[1] || filePath.split('uploads/')[1];
    if (!relativePath) {
        return filePath.startsWith('http') || filePath.startsWith('file://') ? filePath : null;
    }
    return `${API_BASE}/api/file?path=${encodeURIComponent(relativePath)}`;
};

const DEFAULT_AVATAR = require('../assets/Sign-in.png');

const Colors = {
    backgroundLight: '#F2F2F2',
    headerBackground: '#FFFFFF',
    topBarDark: '#000c52',
    primaryText: '#000000',
    secondaryText: '#666666',
    myMessageBubble: '#8A2BE2',
    otherMessageBubble: '#E0E0E0',
    messageTextWhite: '#FFFFFF',
    messageTextDark: '#333333',
    inputBackground: '#F0F0F0',
    borderColor: '#CCCCCC',
    navIconText: '#000d63',
    activeNavIconText: '#17296a',
    greenButton: '#7ED321',
};

export default function ChatScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { chatId: initialChatId, otherUser: otherUserFromRoute, otherParticipantId } = route.params || {};
    
    // Enhanced normalization with validation
    const initialOtherUser = useMemo(() => {
        if (!otherUserFromRoute) return null;
        
        const normalizedUser = {
            ...otherUserFromRoute,
            _id: otherUserFromRoute._id || otherUserFromRoute.id || null,
            username: otherUserFromRoute.username || 'Unknown User',
            avatar: otherUserFromRoute.avatar || null
        };
        
        // Only return if we have a valid ID
        return normalizedUser._id ? normalizedUser : null;
    }, [otherUserFromRoute]);

    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentChatId, setCurrentChatId] = useState(initialChatId || null);
    const [otherParticipantInfo, setOtherParticipantInfo] = useState(initialOtherUser);
    
    const scrollViewRef = useRef();
    const currentUserIdRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Add this useEffect to handle invalid participant info
    useEffect(() => {
        if (otherParticipantInfo && !otherParticipantInfo._id) {
            console.error('Invalid participant info detected:', otherParticipantInfo);
            Alert.alert(
                'Invalid User Data', 
                'Cannot load chat participant information',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    }, [otherParticipantInfo, navigation]);

    const getToken = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Authentication Error', 'No token found. Please log in again.', 
                    [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
                return null;
            }
            return token;
        } catch (e) {
            console.error("getToken: Failed to get token from AsyncStorage:", e);
            Alert.alert('Error', 'Failed to retrieve authentication token.');
            return null;
        }
    }, [navigation]);

    const fetchCurrentUser = useCallback(async () => {
        try {
            const token = await getToken();
            if (!token) return null;

            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch current user: ${response.status} ${errorText}`);
            }

            const userData = await response.json();
            currentUserIdRef.current = userData._id;
            setCurrentUser({
                ...userData,
                avatar: getFileUrl(userData.avatar)
            });
            return userData;
        } catch (err) {
            console.error('fetchCurrentUser: Error:', err);
            Alert.alert('Error', 'Failed to load user data. Please try again.');
            return null;
        }
    }, [getToken]);

    const fetchOtherParticipantProfile = useCallback(async (userId) => {
        try {
            const token = await getToken();
            if (!token) return null;

            const response = await fetch(`${API_BASE}/api/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch user profile: ${response.status} ${errorText}`);
            }

            const userData = await response.json();
            
            // Validate and normalize the response
            if (!userData._id) {
                throw new Error('Invalid user data received from server');
            }
            
            return {
                _id: userData._id.toString(),
                username: userData.username || 'Unknown User',
                avatar: userData.avatar || null
            };
        } catch (err) {
            console.error('fetchOtherParticipantProfile: Error:', err);
            Alert.alert('Error', 'Failed to load participant details.');
            return null;
        }
    }, [getToken]);

    const findOrCreateConversation = useCallback(async (participantId) => {
        try {
            const token = await getToken();
            if (!token) return null;

            const payload = { participantId };
            const response = await fetch(`${API_BASE}/api/chat/conversation`, {
                method: 'POST',
                headers: { /* ... */ },
                body: JSON.stringify({ participantId })
              });
          
              // Add response logging:
              console.log("Conversation API status:", response.status);
              const data = await response.json();
              console.log("Conversation API response:", data);
              
              return data.chatId;
            } catch (err) {
              console.error('API Error:', err);
              throw err;
            }
          }, [getToken]);

    const formatTime = useCallback((dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
    }, []);

    const formatMessagesForState = useCallback((messagesArray) => {
        if (!currentUserIdRef.current || !messagesArray) return [];
        return messagesArray.map(msg => ({
            id: msg._id,
            sender: msg.sender._id === currentUserIdRef.current ? 'me' : 'other',
            text: msg.text || '',
            time: formatTime(msg.createdAt),
            avatar: msg.sender._id === currentUserIdRef.current ? null : (getFileUrl(msg.sender.avatar) || DEFAULT_AVATAR),
            media: getFileUrl(msg.media),
            type: msg.media ? 'file' : 'text',
            fileName: msg.media ? msg.media.split('/').pop().split('?')[0] : null,
            fileSize: 'Unknown size'
        }));
    }, [formatTime]);

    const fetchConversation = useCallback(async (chatId) => {
        try {
            const token = await getToken();
            if (!token || !chatId) return;

            const response = await fetch(`${API_BASE}/api/chat/conversations/${chatId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 403) {
                    Alert.alert('Blocked', errorData.msg || 'You cannot view this conversation.');
                    navigation.goBack();
                    return;
                }
                throw new Error(errorData.msg || 'Failed to fetch conversation');
            }

            const data = await response.json();
            setMessages(formatMessagesForState(data.messages));

            if (data.participants && currentUserIdRef.current) {
                const other = data.participants.find(p => p._id.toString() !== currentUserIdRef.current.toString());
                if (other) {
                    setOtherParticipantInfo(prev => {
                        const newInfo = {
                            _id: other._id.toString(),
                            username: other.username || 'Unknown User',
                            avatar: other.avatar
                        };
                        // Prevent unnecessary updates
                        return JSON.stringify(prev) === JSON.stringify(newInfo) ? prev : newInfo;
                    });
                }
            }
        } catch (err) {
            console.error('fetchConversation: Error:', err);
            Alert.alert('Error', err.message || 'Failed to load conversation.');
        }
    }, [getToken, formatMessagesForState, navigation]);

    const handleSendMessage = useCallback(async () => {
        if (!messageInput.trim() || isSending) return;
        if (!otherParticipantInfo?._id) {
            console.error("No other participant ID found:", otherParticipantInfo);
            Alert.alert('Error', 'Cannot send message: Recipient not identified.');
            return;
        }

        const originalMessageInput = messageInput;
        setMessageInput('');

        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const newMessage = {
            id: tempId,
            sender: 'me',
            text: originalMessageInput,
            time: formatTime(new Date()),
            avatar: null,
            type: 'text',
        };
        setMessages(prev => [...prev, newMessage]);

        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);

        try {
            setIsSending(true);
            const token = await getToken();
            if (!token) return;

            let finalChatId = currentChatId;
            
            if (!finalChatId) {
                const newChatId = await findOrCreateConversation(otherParticipantInfo._id);
                if (!newChatId) throw new Error("Could not create conversation");
                setCurrentChatId(newChatId);
                finalChatId = newChatId;
            }

            const payload = { to: otherParticipantInfo._id, message: originalMessageInput };
            const response = await fetch(`${API_BASE}/api/chat/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || `Failed to send message. Status: ${response.status}`);
            }

            const responseData = await response.json();
            if (responseData.chat && responseData.chat.messages) {
                setMessages(formatMessagesForState(responseData.chat.messages));
            } else {
                await fetchConversation(finalChatId);
            }

        } catch (err) {
            console.error('handleSendMessage: Caught error during send:', err);
            Alert.alert('Error', err.message || 'Failed to send message.');
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setMessageInput(originalMessageInput);
        } finally {
            setIsSending(false);
        }
    }, [
        messageInput, 
        isSending, 
        otherParticipantInfo, 
        currentChatId, 
        getToken, 
        findOrCreateConversation, 
        fetchConversation, 
        formatTime,
        formatMessagesForState
    ]);

    const handleAttachMedia = useCallback(() => {
        Alert.alert('Coming Soon', 'File attachment feature will be added in a future update');
    }, []);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadChatData = async () => {
                try {
                    setIsLoading(true);
                    const user = await fetchCurrentUser();
                    if (!user || !isActive) {
                        setIsLoading(false);
                        return;
                    }

                    let participantInfo = initialOtherUser;
                    if (!participantInfo && otherParticipantId) {
                        participantInfo = await fetchOtherParticipantProfile(otherParticipantId);
                        if (isActive && participantInfo) {
                            setOtherParticipantInfo(prev => {
                                const newInfo = participantInfo;
                                return JSON.stringify(prev) === JSON.stringify(newInfo) ? prev : newInfo;
                            });
                        }
                    }

                    let resolvedChatId = initialChatId;
                    if (!resolvedChatId && participantInfo?._id) {
                        resolvedChatId = await findOrCreateConversation(participantInfo._id);
                        if (isActive) {
                            setCurrentChatId(prev => prev === resolvedChatId ? prev : resolvedChatId);
                        }
                    }

                    if (resolvedChatId) {
                        await fetchConversation(resolvedChatId);
                    } else {
                        console.warn("No chat ID resolved, cannot load conversation");
                    }
                } catch (err) {
                    console.error('useFocusEffect: Error loading chat:', err);
                    if (isActive) {
                        Alert.alert('Error', 'Failed to load chat');
                    }
                } finally {
                    if (isActive) setIsLoading(false);
                }
            };

            loadChatData();

            return () => { isActive = false };
        }, [
            initialChatId, 
            otherParticipantId, 
            fetchCurrentUser, 
            fetchOtherParticipantProfile, 
            findOrCreateConversation, 
            fetchConversation,
            initialOtherUser
        ])
    );

    useEffect(() => {
        if (messages.length > 0) {
            const timer = setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [messages]);

    const renderMessage = useCallback((message) => {
        const isMyMessage = message.sender === 'me';
        const messageBubbleStyle = isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble;
        const messageTextStyle = isMyMessage ? styles.myMessageText : styles.otherMessageText;
        const messageContainerStyle = isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer;
        const avatarSource = message.avatar ? { uri: message.avatar } : DEFAULT_AVATAR;

        return (
            <View key={message.id} style={messageContainerStyle}>
                {!isMyMessage && (
                    <Image
                        source={avatarSource}
                        style={styles.messageAvatar}
                    />
                )}
                <View style={styles.messageContent}>
                    <View style={[styles.messageBubble, messageBubbleStyle]}>
                        {message.type === 'file' ? (
                            <View style={styles.fileMessageContent}>
                                <Feather name="file-text" size={24} color={isMyMessage ? Colors.messageTextWhite : Colors.messageTextDark} />
                                <View style={styles.fileDetails}>
                                    <Text style={[styles.fileNameText, messageTextStyle]}>{message.fileName}</Text>
                                    <Text style={[styles.fileSizeText, messageTextStyle]}>{message.fileSize}</Text>
                                </View>
                            </View>
                        ) : (
                            <Text style={messageTextStyle}>{message.text}</Text>
                        )}
                    </View>
                    <Text style={styles.messageTime}>{message.time}</Text>
                </View>
            </View>
        );
    }, []);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={Colors.topBarDark} />
                <Text style={styles.loadingText}>Loading chat...</Text>
            </SafeAreaView>
        );
    }

    if (!otherParticipantInfo || !otherParticipantInfo._id) {
        return (
            <SafeAreaView style={[styles.container, styles.loadingContainer]}>
                <Text style={styles.loadingText}>Could not load participant information</Text>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.goBackButton}
                >
                    <Text style={styles.goBackText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <AntDesign name="arrowleft" size={24} color={Colors.primaryText} />
                </TouchableOpacity>
                <Image
                    source={otherParticipantInfo.avatar ? { uri: getFileUrl(otherParticipantInfo.avatar) } : DEFAULT_AVATAR}
                    style={styles.headerAvatar}
                />
                <View style={styles.headerInfo}>
                    <Text style={styles.headerUsername}>{otherParticipantInfo.username}</Text>
                    <Text style={styles.headerStatus}>ออนไลน์</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {messages.length > 0 ? (
                    messages.map(renderMessage)
                ) : (
                    <View style={styles.noMessagesContainer}>
                        <Text style={styles.noMessagesText}>เริ่มต้นการสนทนา</Text>
                    </View>
                )}
            </ScrollView>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                style={styles.inputAreaContainer}
            >
                <TouchableOpacity onPress={handleAttachMedia} style={styles.cameraButton}>
                    <Feather name="camera" size={24} color={Colors.secondaryText} />
                </TouchableOpacity>
                <TextInput
                    style={styles.messageInput}
                    placeholder="ส่งข้อความ...."
                    placeholderTextColor={Colors.secondaryText}
                    value={messageInput}
                    onChangeText={setMessageInput}
                    multiline
                    onSubmitEditing={handleSendMessage}
                    returnKeyType="send"
                    editable={!isSending}
                />
                {isSending ? (
                    <ActivityIndicator size="small" color={Colors.secondaryText} style={styles.sendButton} />
                ) : (
                    <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                        <Feather name="send" size={20} color={Colors.secondaryText} />
                    </TouchableOpacity>
                )}
            </KeyboardAvoidingView>

            <View style={styles.navBar}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Quiz')}>
                    <Image source={require('../assets/quiz.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>QUIZ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Lesson')}>
                    <Image source={require('../assets/lesson.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>LESSON</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Post')}>
                    <AntDesign name="pluscircle" size={40} color={Colors.greenButton} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
                    <Image source={require('../assets/home.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>HOME</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ChatFeed')}>
                    <Image source={require('../assets/chatfeed.png')} style={styles.navIcon} />
                    <Text style={styles.navText}>CHAT</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: Colors.secondaryText,
    },
    topBar: {
        height: 24,
        backgroundColor: Colors.topBarDark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: Colors.headerBackground,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderColor,
    },
    backButton: {
        padding: 5,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginLeft: 10,
    },
    headerInfo: {
        marginLeft: 10,
    },
    headerUsername: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primaryText,
    },
    headerStatus: {
        fontSize: 12,
        color: Colors.secondaryText,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContentContainer: {
        paddingVertical: 10,
    },
    noMessagesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noMessagesText: {
        fontSize: 16,
        color: Colors.secondaryText,
    },
    myMessageContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
        paddingRight: 10,
    },
    otherMessageContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 10,
        paddingLeft: 10,
    },
    messageAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
    },
    messageContent: {
        maxWidth: '70%',
    },
    messageBubble: {
        borderRadius: 18,
        padding: 12,
    },
    myMessageBubble: {
        backgroundColor: Colors.myMessageBubble,
        borderBottomRightRadius: 2,
    },
    otherMessageBubble: {
        backgroundColor: Colors.otherMessageBubble,
        borderBottomLeftRadius: 2,
    },
    myMessageText: {
        color: Colors.messageTextWhite,
    },
    otherMessageText: {
        color: Colors.messageTextDark,
    },
    messageTime: {
        fontSize: 10,
        color: Colors.secondaryText,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    fileMessageContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fileDetails: {
        marginLeft: 8,
    },
    fileNameText: {
        fontWeight: 'bold',
    },
    fileSizeText: {
        fontSize: 12,
    },
    inputAreaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: Colors.headerBackground,
        borderTopWidth: 1,
        borderTopColor: Colors.borderColor,
    },
    cameraButton: {
        padding: 8,
    },
    messageInput: {
        flex: 1,
        backgroundColor: Colors.inputBackground,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        maxHeight: 100,
        marginHorizontal: 8,
    },
    sendButton: {
        padding: 8,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: Colors.headerBackground,
        borderTopWidth: 1,
        borderTopColor: Colors.borderColor,
    },
    navItem: {
        alignItems: 'center',
    },
    navIcon: {
        width: 24,
        height: 24,
        marginBottom: 4,
    },
    navText: {
        fontSize: 10,
        color: Colors.navIconText,
    },
    goBackButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: Colors.topBarDark,
        borderRadius: 5
    },
    goBackText: {
        color: 'white'
    }
});