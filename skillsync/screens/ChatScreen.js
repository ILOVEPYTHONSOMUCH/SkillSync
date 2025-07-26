import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
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
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const { width, height } = Dimensions.get("window");

const API_BASE_URL = "http://10.168.128.1:6000/api";

const getFileUrl = (filePath) => {
  if (!filePath) return null;
  return `${API_BASE_URL}/file?path=${encodeURIComponent(filePath)}`;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(initialChatId);
  const [otherParticipantInfo, setOtherParticipantInfo] =
    useState(otherUserFromRoute);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);

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
      return messagesArray.map((msg) => ({
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
        type: msg.media ? "file" : "text",
        fileName: msg.media ? msg.media.split("/").pop().split("?")[0] : null,
      }));
    },
    [formatTime],
  );

  const fetchConversation = useCallback(
    async (chatId) => {
      try {
        setIsLoading(true);
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
        if (isMountedRef.current) setIsLoading(false);
      }
    },
    [formatMessagesForState, getToken],
  );

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || isSending || !otherParticipantInfo?._id) return;

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

    setIsSending(true);

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/chat/send`, {
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

      const data = await response.json();
      if (response.ok) {
        // Refresh conversation to get updated messages
        if (currentChatId) {
          await fetchConversation(currentChatId);
        }
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
      // Remove temporary message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  }, [
    messageInput,
    isSending,
    otherParticipantInfo,
    formatTime,
    getToken,
    currentChatId,
    fetchConversation,
  ]);

  const handleAttachMedia = useCallback(() => {
    setShowAttachmentOptions((prev) => !prev);
  }, []);

  const handleSelectAttachment = useCallback(async (type) => {
    setShowAttachmentOptions(false);

    try {
      let result;
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      };

      if (type === "Photo") {
        result = await ImagePicker.launchImageLibraryAsync({
          ...options,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });
      } else if (type === "Video") {
        result = await ImagePicker.launchImageLibraryAsync({
          ...options,
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        });
      } else if (type === "File") {
        // For now, use image picker for files too
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        await handleSendMedia(result.assets[0]);
      }
    } catch (error) {
      console.error("Error selecting attachment:", error);
      Alert.alert("Error", "Failed to select media");
    }
  }, []);

  const handleSendMedia = useCallback(
  async (asset) => {
    if (!otherParticipantInfo?._id || isSending) return;

    setIsSending(true);

    try {
      const token = await getToken();
      if (!token) {
        setIsSending(false);
        return;
      }

      // Create FormData with the same structure as curl
      const formData = new FormData();
      formData.append('to', otherParticipantInfo._id);
      
      // File handling with proper type detection
      const fileExtension = asset.uri.split('.').pop().toLowerCase();
      const mimeType = 
        fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' :
        fileExtension === 'png' ? 'image/png' :
        fileExtension === 'mp4' ? 'video/mp4' :
        'application/octet-stream';

      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || `media_${Date.now()}.${fileExtension}`,
        type: mimeType
      });

      // Debug logs (remove in production)
      console.log('FormData entries:');
      for (const [key, value] of formData._parts) {
        console.log(key, value);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_BASE_URL}/chat/send-media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Let React Native set Content-Type automatically!
        },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `Server error: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('Upload success:', data);

      if (currentChatId) {
        await fetchConversation(currentChatId);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert(
        'Upload Error',
        error.message || 'Failed to send media. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  },
  [otherParticipantInfo, isSending, getToken, currentChatId, fetchConversation]
);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadChatData = async () => {
        try {
          setIsLoading(true);
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
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      loadChatData();

      return () => {
        isActive = false;
      };
    }, [currentChatId, fetchCurrentUser, fetchConversation, navigation]),
  );

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return () => clearTimeout(timer);
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
                {message.type === "file" ? (
                  <View style={styles.fileMessageContent}>
                    {message.media && (
                      <TouchableOpacity>
                        <Image
                          source={{ uri: message.media }}
                          style={styles.messageImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
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
    [otherParticipantInfo, shouldShowDateSeparator, formatDate],
  );

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
          messages.map((message, index) =>
            renderMessage(message, index, messages),
          )
        ) : (
          <View style={styles.noMessagesContainer}>
            <Text style={styles.noMessagesText}>เริ่มต้นการสนทนา</Text>
          </View>
        )}
      </ScrollView>

      {showAttachmentOptions && (
        <View style={styles.attachmentOptionsContainer}>
          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => handleSelectAttachment("Photo")}
          >
            <Ionicons name="image" size={24} color={Colors.primaryText} />
            <Text style={styles.attachmentOptionText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => handleSelectAttachment("Video")}
          >
            <Ionicons name="videocam" size={24} color={Colors.primaryText} />
            <Text style={styles.attachmentOptionText}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => handleSelectAttachment("File")}
          >
            <MaterialIcons
              name="insert-drive-file"
              size={24}
              color={Colors.primaryText}
            />
            <Text style={styles.attachmentOptionText}>File</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={styles.inputAreaContainer}
      >
        <TouchableOpacity
          onPress={handleAttachMedia}
          style={styles.attachmentButton}
        >
          <Feather
            name={showAttachmentOptions ? "x" : "paperclip"}
            size={24}
            color={
              showAttachmentOptions
                ? Colors.myMessageBubble
                : Colors.secondaryText
            }
          />
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
          <ActivityIndicator
            size="small"
            color={Colors.secondaryText}
            style={styles.sendButton}
          />
        ) : (
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
        )}
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
