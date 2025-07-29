import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
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
  SafeAreaView,
  Linking,
  ActivityIndicator
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from "@react-native-async-storage/async-storage";


import {
  AntDesign,
  Feather,
  MaterialIcons,
} from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
const { width, height } = Dimensions.get("window");

import { API_BASE_URL } from "../components/NavbarAndTheme";

const getFileUrl = (filePath) => {
  if (!filePath) return null;
  return `${API_BASE_URL}/file?path=${encodeURIComponent(filePath)}`;
};
const openFileUrl = (filePath) => {
  if (!filePath) return null;
  return `${API_BASE_URL}/open?path=${encodeURIComponent(filePath)}`;
};
const DEFAULT_AVATAR = require("../assets/Sign-in.png");

const Colors = {
  backgroundLight: "#F2F2F2",
  headerBackground: "#FFFFFF",
  topBarDark: "#000c52",
  primaryText: "#000000",
  secondaryText: "#666666",
  myMessageBubble: "#8A2BE2",
  otherMessageBubble: "#E0E0E0",
  messageTextWhite: "#FFFFFF",
  messageTextDark: "#333333",
  inputBackground: "#F0F0F0",
  borderColor: "#CCCCCC",
  navIconText: "#000d63",
  activeNavIconText: "#17296a",
  greenButton: "#7ED321",
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatId: initialChatId, otherUser: otherUserFromRoute } =
    route.params || {};

  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(initialChatId);
  const [otherParticipantInfo, setOtherParticipantInfo] =
    useState(otherUserFromRoute);
  const [isSendingFile, setIsSendingFile] = useState(false);

  const scrollViewRef = useRef();
  const currentUserIdRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getToken = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert(
          "Authentication Error",
          "No token found. Please log in again.",
        );
        navigation.navigate("Login");
        return null;
      }
      return token;
    } catch (e) {
      console.error("Failed to retrieve token:", e);
      Alert.alert("Error", "Failed to retrieve authentication token.");
      return null;
    }
  }, [navigation]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        currentUserIdRef.current = data._id;
        setCurrentUser(data);
        return data;
      } else {
        throw new Error(data.msg || "Failed to fetch user profile");
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      Alert.alert("Error", "Failed to fetch user profile");
      return null;
    }
  }, [getToken]);

  const formatTime = useCallback((dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }, []);

  const shouldShowDateSeparator = useCallback(
    (currentMessage, previousMessage) => {
      if (!previousMessage) return true;

      const currentDate = new Date(
        currentMessage.createdAt || new Date(),
      ).toDateString();
      const previousDate = new Date(
        previousMessage.createdAt || new Date(),
      ).toDateString();

      return currentDate !== previousDate;
    },
    [],
  );

  const formatMessagesForState = useCallback(
    (messagesArray) => {
      if (!currentUserIdRef.current || !messagesArray) return [];
      return messagesArray.map((msg) => {
        const isImage = msg.media?.match(/\.(jpg|jpeg|png|gif)$/i);
        return {
          id: msg._id || msg.id,
          sender: msg.sender._id === currentUserIdRef.current ? "me" : "other",
          text: msg.text || "",
          time: formatTime(msg.createdAt || new Date()),
          createdAt: msg.createdAt || new Date(),
          avatar:
            msg.sender._id === currentUserIdRef.current
              ? null
              : getFileUrl(msg.sender.avatar) || DEFAULT_AVATAR,
          media: getFileUrl(msg.media),
          type: msg.media ? (isImage ? "image" : "file") : "text",
          fileName: msg.media ? msg.media.split("/").pop().split("?")[0] : null,
        };
      });
    },
    [formatTime],
  );

  const fetchConversation = useCallback(
    async (chatId) => {
      try {
        setIsInitialLoading(true);
        const token = await getToken();
        if (!token) return;

        const response = await fetch(
          `${API_BASE_URL}/chat/conversation/${chatId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await response.json();
        if (response.ok) {
          if (isMountedRef.current) {
            const otherParticipant = data.participants?.find(
              (p) => p._id !== currentUserIdRef.current,
            );
            if (otherParticipant) {
              setOtherParticipantInfo(otherParticipant);
            }
            setMessages(formatMessagesForState(data.messages || []));
          }
        } else {
          throw new Error(data.error || "Failed to load conversation");
        }
      } catch (err) {
        console.error("Error fetching conversation:", err);
        Alert.alert("Error", err.message || "Failed to load conversation");
      } finally {
        if (isMountedRef.current) setIsInitialLoading(false);
      }
    },
    [formatMessagesForState, getToken],
  );

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !otherParticipantInfo?._id) return;

    const tempMessage = {
      id: `temp-${Date.now()}`,
      sender: "me",
      text: messageInput,
      time: formatTime(new Date()),
      type: "text",
    };

    setMessages((prev) => [...prev, tempMessage]);
    const currentMessage = messageInput;
    setMessageInput("");
    scrollViewRef.current?.scrollToEnd({ animated: true });

    try {
      const token = await getToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: otherParticipantInfo._id,
          message: currentMessage,
        }),
      });

      if (currentChatId) {
        await fetchConversation(currentChatId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    }
  }, [
    messageInput,
    otherParticipantInfo,
    formatTime,
    getToken,
    currentChatId,
    fetchConversation,
  ]);

 const handleAttachFile = useCallback(async () => {
  try {
    const to = otherParticipantInfo._id;
    setIsSendingFile(true);
    // Pick a file
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.type === 'cancel') {
      setIsSendingFile(false);
      return;
    }
    const filedata = result.assets[0];
    // Create temporary message
    const isImage = result.name?.match(/\.(jpg|jpeg|png|gif)$/i);
    const tempMessage = {
      id: `temp-file-${Date.now()}`,
      sender: "me",
      type: isImage ? "image" : "file",
      time: formatTime(new Date()),
      fileName: filedata.name,
      media: filedata.uri,
    };

    // Add temporary message to UI
    setMessages((prev) => [...prev, tempMessage]);
    scrollViewRef.current?.scrollToEnd({ animated: true });

    // Create FormData exactly like curl
    const formData = new FormData();
    formData.append('to', to); // Using the passed 'to' parameter
    
    // Match curl's file format exactly
    formData.append('file', {
      uri: filedata.uri,
      name: filedata.name || 'test.pdf',
      type: filedata.mimeType || 'application/pdf'
    });
    const token = await getToken();
    // Debug the request
    console.log("Here's result = ", result);
    console.log('Sending file upload request:', {
      url: `${API_BASE_URL}/chat/send-media`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        to: to,
        file: {
          name: filedata.name,
          type: filedata.mimeType,
          size: filedata.size
        }
      }
    });

    // Make the request
    console.log("Heyb.................",token);
    const response = await fetch(`${API_BASE_URL}/chat/send-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // Using passed token
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Upload success:', data);

    // Refresh conversation
    if (currentChatId) {
      await fetchConversation(currentChatId);
    }

  } catch (error) {
    console.error('Upload failed:', error);
    Alert.alert(
      'Upload Failed',
      error.message || 'Network request failed. Please check your connection.'
    );
    // Remove temporary message
    setMessages((prev) => prev.filter(msg => !msg.id.startsWith('temp-file-')));
  } finally {
    setIsSendingFile(false);
  }
}, [currentChatId, fetchConversation, formatTime]);


const handleDownloadFile = async (url) => {
  try {
    // 1. Extract filename
    const filename = url.split('/').pop().replace(/\?.*$/, '') || 'file.pdf';
    
    // 2. Download to cache
    const localUri = `${FileSystem.cacheDirectory}${filename}`;
    const { uri } = await FileSystem.downloadAsync(url, localUri);
    
    // 3. Get content URI (Android) or use direct path (iOS)
    let fileUri = uri;
    if (Platform.OS === 'android') {
      fileUri = await FileSystem.getContentUriAsync(uri);
    }

    // 4. Open file
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: fileUri,
        type: 'application/pdf',
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });
    } else {
      await Sharing.shareAsync(fileUri);
    }

  } catch (error) {
    console.error('File error:', error);
    // Fallback to browser
    Linking.openURL(url);
  }
};

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadChatData = async () => {
        try {
          const user = await fetchCurrentUser();
          if (!user || !isActive) return;

          if (currentChatId) {
            await fetchConversation(currentChatId);
          } else {
            console.error("No chat ID provided");
            Alert.alert("Error", "No chat ID provided", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          }
        } catch (err) {
          console.error("Error loading chat:", err);
          if (isActive) {
            Alert.alert("Error", "Failed to load chat", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          }
        }
      }

      loadChatData();

      return () => {
        isActive = false;
      };
    }, [currentChatId, fetchCurrentUser, fetchConversation, navigation]),
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadChatData = async () => {
        try {
          const user = await fetchCurrentUser();
          if (!user || !isActive) return;

          if (currentChatId) {
            await fetchConversation(currentChatId);
          } else {
            console.error("No chat ID provided");
            Alert.alert("Error", "No chat ID provided", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          }
        } catch (err) {
          console.error("Error loading chat:", err);
          if (isActive) {
            Alert.alert("Error", "Failed to load chat", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          }
        }
      }

      loadChatData();

      return () => {
        isActive = false;
      };
    }, [currentChatId, fetchCurrentUser, fetchConversation, navigation]),
  );

  useEffect(() => {
    if (messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderMessage = useCallback(
    (message, index, messages) => {
      const isMyMessage = message.sender === "me";
      const messageBubbleStyle = isMyMessage
        ? styles.myMessageBubble
        : styles.otherMessageBubble;
      const messageTextStyle = isMyMessage
        ? styles.myMessageText
        : styles.otherMessageText;
      const messageContainerStyle = isMyMessage
        ? styles.myMessageContainer
        : styles.otherMessageContainer;
      const avatarSource =
        !isMyMessage && otherParticipantInfo?.avatar
          ? { uri: getFileUrl(otherParticipantInfo.avatar) }
          : DEFAULT_AVATAR;

      const previousMessage = index > 0 ? messages[index - 1] : null;
      const showDateSeparator = shouldShowDateSeparator(
        message,
        previousMessage,
      );

      return (
        <View key={message.id}>
          {showDateSeparator && (
            <View style={styles.dateSeparatorContainer}>
              <View style={styles.dateSeparatorLine} />
              <Text style={styles.dateSeparatorText}>
                {formatDate(message.createdAt)}
              </Text>
              <View style={styles.dateSeparatorLine} />
            </View>
          )}
          <View style={messageContainerStyle}>
            {!isMyMessage && (
              <Image source={avatarSource} style={styles.messageAvatar} />
            )}
            <View style={styles.messageContent}>
              <View style={[styles.messageBubble, messageBubbleStyle]}>
                {message.type === "image" ? (
                  <TouchableOpacity 
                    onPress={() => handleDownloadFile(message.media)}
                    style={styles.fileContainer}
                  >
                    <Image
                      source={{ uri: message.media }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : message.type === "file" ? (
                  <TouchableOpacity 
                    onPress={() => handleDownloadFile(message.media)}
                    style={styles.fileContainer}
                  >
                    <View style={styles.documentContainer}>
                      <MaterialIcons 
                        name="insert-drive-file" 
                        size={40} 
                        color={isMyMessage ? Colors.messageTextWhite : Colors.messageTextDark} 
                      />
                      <Text 
                        style={[
                          styles.documentName, 
                          { color: isMyMessage ? Colors.messageTextWhite : Colors.messageTextDark }
                        ]}
                        numberOfLines={1}
                      >
                        {message.fileName}
                      </Text>
                      <Text style={[styles.fileTypeText, { color: isMyMessage ? Colors.messageTextWhite : Colors.messageTextDark }]}>
                        Tap to download
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <Text style={messageTextStyle}>{message.text}</Text>
                )}
              </View>
              <Text style={styles.messageTime}>{message.time}</Text>
            </View>
          </View>
        </View>
      );
    },
    [otherParticipantInfo, shouldShowDateSeparator, formatDate, handleDownloadFile],
  );

  if (isInitialLoading) {
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
        <Text style={styles.loadingText}>
          Could not load participant information
        </Text>
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <AntDesign name="arrowleft" size={24} color={Colors.primaryText} />
        </TouchableOpacity>
        <Image
          source={
            otherParticipantInfo.avatar
              ? { uri: getFileUrl(otherParticipantInfo.avatar) }
              : DEFAULT_AVATAR
          }
          style={styles.headerAvatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerUsername}>
            {otherParticipantInfo.username}
          </Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length > 0 ? (
          messages.map((message, index) =>
            renderMessage(message, index, messages),
          )
        ) : (
          <View style={styles.noMessagesContainer}>
            <Text style={styles.noMessagesText}>Start a conversation</Text>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={styles.inputAreaContainer}
      >
        <TouchableOpacity
          onPress={handleAttachFile}
          style={styles.attachmentButton}
          disabled={isSendingFile}
        >
          {isSendingFile ? (
            <ActivityIndicator size="small" color={Colors.secondaryText} />
          ) : (
            <Feather
              name="paperclip"
              size={24}
              color={Colors.secondaryText}
            />
          )}
        </TouchableOpacity>
        
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.secondaryText}
          value={messageInput}
          onChangeText={setMessageInput}
          multiline
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
          editable={!isSendingFile}
        />

        <TouchableOpacity
          onPress={handleSendMessage}
          style={styles.sendButton}
          disabled={!messageInput.trim()}
        >
          <Feather
            name="send"
            size={20}
            color={
              messageInput.trim()
                ? Colors.myMessageBubble
                : Colors.secondaryText
            }
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
    flex: 1,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: "bold",
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
    padding: 10,
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  noMessagesText: {
    fontSize: 16,
    color: Colors.secondaryText,
  },
  inputAreaContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 5,
    backgroundColor: Colors.inputBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.borderColor,
  },
  attachmentButton: {
    padding: 10,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.headerBackground,
    borderRadius: 20,
    marginHorizontal: 5,
    color: Colors.primaryText,
  },
  sendButton: {
    padding: 10,
  },
  myMessageContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  otherMessageContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 5,
  },
  messageContent: {
    maxWidth: "80%",
  },
  messageBubble: {
    borderRadius: 15,
    padding: 10,
  },
  myMessageBubble: {
    backgroundColor: Colors.myMessageBubble,
    borderBottomRightRadius: 0,
  },
  otherMessageBubble: {
    backgroundColor: Colors.otherMessageBubble,
    borderBottomLeftRadius: 0,
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
    marginTop: 5,
    alignSelf: "flex-end",
  },
  fileMessageContent: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  fileDetails: {
    marginLeft: 5,
    marginBottom: 5,
  },
  fileNameText: {
    fontSize: 14,
  },
  fileSizeText: {
    fontSize: 12,
    opacity: 0.7,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.secondaryText,
  },
  goBackButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: Colors.topBarDark,
    borderRadius: 5,
  },
  goBackText: {
    color: "white",
    fontSize: 16,
  },
  attachmentOptionsContainer: {
    position: "absolute",
    bottom: 60,
    left: 10,
    right: 10,
    backgroundColor: Colors.headerBackground,
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  attachmentOption: {
    alignItems: "center",
    padding: 10,
  },
  attachmentOptionText: {
    marginTop: 5,
    color: Colors.primaryText,
  },
  dateSeparatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderColor,
  },
  dateSeparatorText: {
    marginHorizontal: 15,
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: "600",
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
});