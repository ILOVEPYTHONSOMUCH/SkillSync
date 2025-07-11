// frontend/src/screens/ChatFeed.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Image Imports ---
// IMPORTANT: Ensure these paths are correct relative to THIS file's location.
const SkillSyncLogo = require('../assets/SkillSyncLogo.png');
const UserAvatarPlaceholder = require('../assets/Sign-in.png'); // Default placeholder if no avatar

// Remote image for search icon (can be replaced with a local asset if preferred)
const SearchIconUrl = 'https://img.icons8.com/ios-filled/20/search--v1.png';

// --- API Base URL ---
const API_BASE_URL = 'http://192.168.41.31:6000/api'; // *** REPLACE WITH YOUR ACTUAL BACKEND IP/DOMAIN ***

export default function ChatFeed() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [activeTab, setActiveTab] = useState('chats');

  // --- State for API Data ---
  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null); // Now stores full user object

  // --- Loading & Error States ---
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingAllUsers, setLoadingAllUsers] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [errorChats, setErrorChats] = useState(null);
  const [errorFriends, setErrorFriends] = useState(null);
  const [errorRequests, setErrorRequests] = useState(null);
  const [errorAllUsers, setErrorAllUsers] = useState(null);
  const [errorProfile, setErrorProfile] = useState(null);

  const [allUsersSearchQuery, setAllUsersSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Function to get the authentication token
  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Authentication Error', 'No token found. Please log in again.');
        navigation.navigate('Login');
        return null;
      }
      return token;
    } catch (e) {
      console.error("Failed to retrieve token:", e);
      Alert.alert('Error', 'Failed to retrieve authentication token.');
      return null;
    }
  };

  // --- API Fetching Functions ---

  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    setErrorChats(null);
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/chat`, { headers: { Authorization: `Bearer ${token}` }, });
      const data = await response.json();
      if (response.ok) { setChats(data); } else { setErrorChats(data.msg || 'Failed to fetch chats.'); }
    } catch (err) { console.error("Error fetching chats:", err); setErrorChats('Network error or server unreachable.'); } finally { setLoadingChats(false); }
  }, []);

  const fetchFriends = useCallback(async () => {
    setLoadingFriends(true);
    setErrorFriends(null);
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/chat/friends`, { headers: { Authorization: `Bearer ${token}` }, });
      const data = await response.json();
      if (response.ok) { setFriends(data); } else { setErrorFriends(data.msg || 'Failed to fetch friends.'); }
    } catch (err) { console.error("Error fetching friends:", err); setErrorFriends('Network error or server unreachable.'); } finally { setLoadingFriends(false); }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    setErrorRequests(null);
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const responseReceived = await fetch(`${API_BASE_URL}/chat/friends/requests/received`, { headers: headers, });
      const dataReceived = await responseReceived.json();
      const responseSent = await await fetch(`${API_BASE_URL}/chat/friends/requests/sent`, { headers: headers, });
      const dataSent = await responseSent.json();
      if (responseReceived.ok) { setReceivedRequests(dataReceived); } else { console.error("Received requests error:", dataReceived.msg || dataReceived); setErrorRequests(dataReceived.msg || 'Failed to fetch received requests.'); }
      if (responseSent.ok) { console.log('Sent requests:', dataSent); setSentRequests(dataSent); } else { console.error("Sent requests error:", dataSent.msg || dataSent); setErrorRequests(prev => prev ? prev + ' Failed to fetch sent requests.' : 'Failed to fetch sent requests.'); }
    } catch (err) { console.error("Error fetching requests:", err); setErrorRequests('Network error or server unreachable.'); } finally { setLoadingRequests(false); }
  }, []);

  const fetchAllUsers = useCallback(async (keyword = '') => {
    setLoadingAllUsers(true);
    setErrorAllUsers(null);
    try {
      const token = await getToken();
      if (!token) return;

      const url = `${API_BASE_URL}/search/users${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, });
      const data = await response.json();

      if (response.ok) {
        if (data && Array.isArray(data.users)) {
          setAllUsers(data.users);
        } else if (data && Array.isArray(data.data)) {
          setAllUsers(data.data);
        } else if (data && Array.isArray(data)) {
          setAllUsers(data);
        } else {
          console.warn("Unexpected API response structure for all users:", data);
          setAllUsers([]);
          setErrorAllUsers('Unexpected data format from server for all users.');
        }
      } else {
        setErrorAllUsers(data.msg || 'Failed to fetch all users.');
        console.error("Backend Error Fetching All Users:", data);
      }
    } catch (err) {
      console.error("Network or Client-side Error Fetching All Users:", err);
      setErrorAllUsers('Network error or server unreachable.');
    } finally {
      setLoadingAllUsers(false);
    }
  }, []);

  const fetchCurrentUserProfile = useCallback(async () => {
    setLoadingProfile(true);
    setErrorProfile(null);
    try {
      const token = await getToken();
      if (!token) {
        setLoadingProfile(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json(); // 'data' is the full user object

      if (response.ok) {
        // Store the entire user object in state
        setCurrentUserProfile(data);
      } else {
        setErrorProfile(data.msg || 'Failed to fetch user profile.');
        console.error("Backend Error Fetching Current User Profile:", data);
        if (response.status === 401 || response.status === 403) {
          Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
          navigation.navigate('Login');
        }
      }
    } catch (err) {
      console.error("Error fetching current user profile:", err);
      setErrorProfile('Network error or server unreachable for profile.');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // --- Effect Hooks for Data Fetching ---

  useEffect(() => {
    if (isFocused) {
      fetchCurrentUserProfile();
      if (activeTab === 'chats') { fetchChats(); } else if (activeTab === 'friends') { fetchFriends(); } else if (activeTab === 'requests') { fetchRequests(); } else if (activeTab === 'allUsers') { fetchAllUsers(allUsersSearchQuery); }
    }
  }, [isFocused, activeTab, fetchChats, fetchFriends, fetchRequests, fetchAllUsers, fetchCurrentUserProfile]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (activeTab === 'allUsers') { fetchAllUsers(allUsersSearchQuery); }
    }, 500);
    return () => clearTimeout(handler);
  }, [allUsersSearchQuery, activeTab, fetchAllUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCurrentUserProfile();
    if (activeTab === 'chats') await fetchChats();
    else if (activeTab === 'friends') await fetchFriends();
    else if (activeTab === 'requests') await fetchRequests();
    else if (activeTab === 'allUsers') await fetchAllUsers(allUsersSearchQuery);
    setRefreshing(false);
  }, [activeTab, fetchChats, fetchFriends, fetchRequests, fetchAllUsers, fetchCurrentUserProfile, allUsersSearchQuery]);

  // --- Interaction Handlers with API Calls ---

  const handleFriendRequest = async (recipientId) => {
    try {
      const token = await getToken(); if (!token) return;
      const response = await fetch(`${API_BASE_URL}/chat/friends/request`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ recipientId }), });
      const data = await response.json();
      if (response.ok) { Alert.alert('Success', data.msg || 'Friend request sent!'); fetchAllUsers(allUsersSearchQuery); fetchRequests(); } else { Alert.alert('Error', data.msg || 'Failed to send friend request.'); console.error("Error sending friend request:", data); }
    } catch (err) { Alert.alert('Error', 'Network error or server unreachable.'); console.error("Network error sending friend request:", err); }
  };

  const handleAcceptRequest = async (requesterId) => {
    try {
      const token = await getToken(); if (!token) return;
      const response = await fetch(`${API_BASE_URL}/chat/friends/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ requesterId }), });
      const data = await response.json();
      if (response.ok) { Alert.alert('Success', data.msg || 'Friend request accepted!'); fetchRequests(); fetchFriends(); fetchChats(); fetchAllUsers(allUsersSearchQuery); } else { Alert.alert('Error', data.msg || 'Failed to accept request.'); console.error("Error accepting request:", data); }
    } catch (err) { Alert.alert('Error', 'Network error or server unreachable.'); console.error("Network error accepting request:", err); }
  };

  const handleRejectRequest = async (requesterId) => {
    try {
      const token = await getToken(); if (!token) return;
      const response = await fetch(`${API_BASE_URL}/chat/friends/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ requesterId }), });
      const data = await response.json();
      if (response.ok) { Alert.alert('Success', data.msg || 'Friend request rejected!'); fetchRequests(); fetchAllUsers(allUsersSearchQuery); } else { Alert.alert('Error', data.msg || 'Failed to reject request.'); console.error("Error rejecting request:", data); }
    } catch (err) { Alert.alert('Error', 'Network error or server unreachable.'); console.error("Network error rejecting request:", err); }
  };

  const handleWithdrawRequest = async (recipientId) => {
    try {
      const token = await getToken(); if (!token) return;
      const response = await fetch(`${API_BASE_URL}/chat/friends/withdraw`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ recipientId }), });
      const data = await response.json();
      if (response.ok) { Alert.alert('Success', data.msg || 'Friend request withdrawn!'); fetchRequests(); fetchAllUsers(allUsersSearchQuery); } else { Alert.alert('Error', data.msg || 'Failed to withdraw request.'); console.error("Error withdrawing request:", data); }
    } catch (err) { Alert.alert('Error', 'Network error or server unreachable.'); console.error("Network error withdrawing request:", err); }
  };

  const handleRemoveFriend = async (friendId) => {
    Alert.alert("Remove Friend", "Are you sure you want to remove this friend?",
      [{ text: "Cancel", style: "cancel" },
      {
        text: "Remove", onPress: async () => {
          try {
            const token = await getToken(); if (!token) return;
            const response = await fetch(`${API_BASE_URL}/chat/friends/remove`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, }, body: JSON.stringify({ friendId }), });
            const data = await response.json();
            if (response.ok) { Alert.alert('Success', data.msg || 'Friend removed.'); fetchFriends(); fetchChats(); fetchAllUsers(allUsersSearchQuery); } else { Alert.alert('Error', data.msg || 'Failed to remove friend.'); console.error("Error removing friend:", data); }
          } catch (err) { Alert.alert('Error', 'Network error or server unreachable.'); console.error("Network error removing friend:", err); }
        }, style: "destructive"
      }
      ]);
  };

  const handleChatItemPress = (chatId, otherParticipantUsername) => {
    Alert.alert('Chat Selected', `Opening chat with ${otherParticipantUsername}${chatId ? ` (Chat ID: ${chatId})` : ''}.`);
    // Example: navigation.navigate('ChatScreen', { chatId: chatId, participantName: otherParticipantUsername });
  };

  // --- Helper to render user avatars using the file route ---
  const renderAvatar = (avatarRelativePath) => {
    if (avatarRelativePath) {
      // avatarRelativePath is expected to be like 'uploads/userId/images/filename.jpg'
      // encodeURIComponent handles special characters, and backend fileRoute correctly resolves paths.
      return { uri: `${API_BASE_URL}/file?path=${encodeURIComponent(avatarRelativePath)}` };
    }
    return UserAvatarPlaceholder;
  };

  // --- Function to truncate note for display ---
  const truncateNote = (note, maxLength = 50) => {
    if (!note) return '';
    if (note.length <= maxLength) {
      return note;
    }
    return note.substring(0, maxLength) + '...';
  };

  // --- Render Functions for Each Tab ---

  const renderChatsTab = () => (
    <View style={styles.tabContentContainer}>
      <Text style={styles.chatsTitle}>Chats</Text>
      {loadingChats ? ( <ActivityIndicator size="large" color="#000d63" style={styles.loadingIndicator} /> ) : errorChats ? ( <Text style={styles.errorText}>Error: {errorChats}</Text> ) : chats.length === 0 ? ( <Text style={styles.noDataText}>You have no chats yet.</Text> ) : (
        chats.map((chat) => (
          chat.otherParticipant && (
            <TouchableOpacity key={chat.chatId} style={styles.chatItem} onPress={() => handleChatItemPress(chat.chatId, chat.otherParticipant.username)} >
              <Image source={renderAvatar(chat.otherParticipant.avatar)} style={styles.chatAvatar} />
              <View style={styles.chatInfo}>
                <Text style={styles.chatUsername}>{chat.otherParticipant.username}</Text>
                <Text style={styles.chatLastMessage}>{chat.lastMessage ? chat.lastMessage.text : 'No messages yet'} {chat.lastMessage && ` : ${new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</Text>
              </View>
            </TouchableOpacity>
          )
        ))
      )}
    </View>
  );

  const renderFriendsTab = () => (
    <View style={styles.tabContentContainer}>
      <Text style={styles.chatsTitle}>Your Friends</Text>
      {loadingFriends ? ( <ActivityIndicator size="large" color="#000d63" style={styles.loadingIndicator} /> ) : errorFriends ? ( <Text style={styles.errorText}>Error: {errorFriends}</Text> ) : friends.length === 0 ? ( <Text style={styles.noDataText}>You don't have any friends yet.</Text> ) : (
        friends.map((friend) => (
          <View key={friend._id} style={styles.friendItem}>
            <Image source={renderAvatar(friend.avatar)} style={styles.friendAvatar} />
            <View style={styles.userInfoAndNote}>
              <Text style={styles.friendName}>{friend.username}</Text>
              {friend.note && <Text style={styles.userNote}>{truncateNote(friend.note, 30)}</Text>}
            </View>
            <TouchableOpacity style={styles.chatFriendButton} onPress={() => handleChatItemPress(null, friend.username)}> <Text style={styles.friendActionButtonText}>Chat</Text> </TouchableOpacity>
            <TouchableOpacity style={styles.removeFriendButton} onPress={() => handleRemoveFriend(friend._id)}> <Text style={styles.friendActionButtonText}>Remove</Text> </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const renderRequestsTab = () => (
    <View style={styles.tabContentContainer}>
      {loadingRequests ? ( <ActivityIndicator size="large" color="#000d63" style={styles.loadingIndicator} /> ) : errorRequests ? ( <Text style={styles.errorText}>Error: {errorRequests}</Text> ) : (
        <>
          <Text style={styles.chatsTitle}>Received Requests</Text>
          {receivedRequests.length === 0 ? ( <Text style={styles.noDataText}>No pending received requests.</Text> ) : (
            receivedRequests.map((request) => (
              <View key={request._id} style={styles.requestItem}>
                <Image source={renderAvatar(request.requester?.avatar)} style={styles.requestAvatar} />
                <View style={styles.userInfoAndNote}>
                  <Text style={styles.requestName}>{request.requester?.username || 'Unknown User'}</Text>
                  {request.requester?.note && <Text style={styles.userNote}>{truncateNote(request.requester.note, 30)}</Text>}
                </View>
                <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequest(request.requester?._id)}> <Text style={styles.requestButtonText}>Accept</Text> </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={() => handleRejectRequest(request.requester?._id)}> <Text style={styles.requestButtonText}>Reject</Text> </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={[styles.chatsTitle, { marginTop: 20 }]}>Sent Requests</Text>
          {sentRequests.length === 0 ? ( <Text style={styles.noDataText}>No pending sent requests.</Text> ) : (
            sentRequests.map((request) => (
              <View key={request._id} style={styles.requestItem}>
                <Image source={renderAvatar(request.recipient?.avatar)} style={styles.requestAvatar} />
                <View style={styles.userInfoAndNote}>
                  <Text style={styles.requestName}>{request.recipient?.username || 'Unknown User'}</Text>
                  {request.recipient?.note && <Text style={styles.userNote}>{truncateNote(request.recipient.note, 30)}</Text>}
                </View>
                <TouchableOpacity style={styles.withdrawButton} onPress={() => handleWithdrawRequest(request.recipient?._id)}> <Text style={styles.requestButtonText}>Withdraw</Text> </TouchableOpacity>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );

  const renderAllUsersTab = () => (
    <View style={styles.tabContentContainer}>
      <Text style={styles.chatsTitle}>All Users</Text>
      <View style={styles.searchContainerTab}>
        <View style={styles.searchBox}>
          <Image source={{ uri: SearchIconUrl }} style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Search all users" placeholderTextColor="#888" value={allUsersSearchQuery} onChangeText={setAllUsersSearchQuery} />
        </View>
      </View>

      {loadingAllUsers ? ( <ActivityIndicator size="large" color="#000d63" style={styles.loadingIndicator} /> ) : errorAllUsers ? ( <Text style={styles.errorText}>Error: {errorAllUsers}</Text> ) : (
        allUsers && allUsers.length > 0 ? (
          allUsers.map((user) => {
              const isCurrentUser = currentUserProfile && user._id === currentUserProfile._id;
              const isFriend = friends.some(f => f._id === user._id);
              const hasReceivedRequest = receivedRequests.some(r => r.requester?._id === user._id);
              const hasSentRequest = sentRequests.some(s => s.recipient?._id === user._id);

              return (
                // --- WRAP THE ENTIRE USER CARD IN TOUCHABLEOPACITY ---
                <TouchableOpacity
                  key={user._id}
                  style={styles.userItem}
                  onPress={() => navigation.navigate('UserInfoScreen', { userId: user._id})}
                  disabled={isCurrentUser} // Disable navigation if it's the current user
                >
                  <Image source={renderAvatar(user.avatar)} style={styles.userAvatar} />
                  <View style={styles.userInfoAndNote}>
                    <Text style={styles.userName}>
                      {user.username} {isCurrentUser && <Text style={styles.selfText}>(Self)</Text>}
                    </Text>
                    {user.note && <Text style={styles.userNote}>{truncateNote(user.note, 30)}</Text>}
                  </View>
                  {!isCurrentUser && (
                    <View style={styles.userItemActions}>
                      {isFriend ? (
                        <>
                          <TouchableOpacity style={styles.removeFriendButton} onPress={() => handleRemoveFriend(user._id)}>
                            <Text style={styles.friendActionButtonText}>Remove</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.chatButton} onPress={() => handleChatItemPress(null, user.username)}>
                            <Text style={styles.chatButtonText}>Chat</Text>
                          </TouchableOpacity>
                        </>
                      ) : hasReceivedRequest ? (
                        <Text style={styles.statusText}>Incoming Request</Text>
                      ) : hasSentRequest ? (
                        <Text style={styles.statusText}>Request Sent</Text>
                      ) : (
                        <TouchableOpacity style={styles.addUserButton} onPress={() => handleFriendRequest(user._id)}>
                          <Text style={styles.addUserButtonText}>Add Friend</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
        ) : (
          allUsersSearchQuery.length > 0 ? ( <Text style={styles.noDataText}>No users match your search.</Text> ) : ( <Text style={styles.noDataText}>No users available.</Text> )
        )
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appContainer}>
        {/* Header Spacer for iOS Notch */}
        <View style={styles.headerSpacer} />

        {/* Header Content with User Profile */}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {loadingProfile ? 'Loading...' : errorProfile ? 'User Profile Error' : currentUserProfile?.username || 'Guest User'}
          </Text>
          <Image
            source={renderAvatar(currentUserProfile?.avatar)}
            style={styles.headerLogo}
          />
        </View>

        {/* Top Search Bar (general search, not specific to 'All Users' tab) */}
        <View style={styles.topSearchContainer}>
          <View style={styles.searchBox}>
            <Image source={{ uri: SearchIconUrl }} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Searching Friends..."
              placeholderTextColor="#888"
            />
          </View>
        </View>

        {/* Tab Navigation for content */}
        <View style={styles.contentTabBar}>
          <TouchableOpacity
            style={[styles.contentTabButton, activeTab === 'chats' && styles.activeContentTabButton]}
            onPress={() => setActiveTab('chats')}
          >
            <Text style={[styles.contentTabButtonText, activeTab === 'chats' && styles.activeContentTabButtonText]}>Chats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contentTabButton, activeTab === 'friends' && styles.activeContentTabButton]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.contentTabButtonText, activeTab === 'friends' && styles.activeContentTabButtonText]}>Friends</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contentTabButton, activeTab === 'requests' && styles.activeContentTabButton]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.contentTabButtonText, activeTab === 'requests' && styles.activeContentTabButtonText]}>Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contentTabButton, activeTab === 'allUsers' && styles.activeContentTabButton]}
            onPress={() => setActiveTab('allUsers')}
          >
            <Text style={[styles.contentTabButtonText, activeTab === 'allUsers' && styles.activeContentTabButtonText]}>All Users</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Tab Content */}
        <ScrollView
          style={styles.scrollViewContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000d63" />
          }
        >
          {activeTab === 'chats' && renderChatsTab()}
          {activeTab === 'friends' && renderFriendsTab()}
          {activeTab === 'requests' && renderRequestsTab()}
          {activeTab === 'allUsers' && renderAllUsersTab()}
          {/* Add padding at the bottom of the scroll view to prevent bottom nav overlap */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </View>

      {/* --- Bottom Navigation Bar --- */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000d63',
  },
  appContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 60 : 0,
    backgroundColor: '#000d63',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000d63',
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
    backgroundColor: '#e0e0e0',
  },
  topSearchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  searchBox: {
    backgroundColor: '#f2f2f2',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: '90%',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  searchIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#555',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingLeft: 10,
    paddingVertical: 0,
    color: '#000',
  },
  contentTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  contentTabButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeContentTabButton: {
    backgroundColor: '#000d63',
  },
  contentTabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  activeContentTabButtonText: {
    color: '#fff',
  },
  scrollViewContent: {
    flex: 1,
  },
  tabContentContainer: {
    padding: 15,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#dc3545',
    fontWeight: 'bold',
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  chatsTitle: {
    color: '#000d63',
    fontSize: 22,
    marginBottom: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  chatAvatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chatInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  chatUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chatLastMessage: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
    backgroundColor: '#e0e0e0',
  },
  userInfoAndNote: {
    flex: 1,
    flexDirection: 'column',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatFriendButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 15,
    marginLeft: 'auto',
  },
  removeFriendButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 15,
    marginLeft: 8,
  },
  friendActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
    backgroundColor: '#e0e0e0',
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  acceptButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 'auto',
  },
  rejectButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
  },
  withdrawButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 'auto',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#e0e0e0',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  userNote: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  selfText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  statusText: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
  userItemActions: {
    marginLeft: 'auto',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addUserButton: {
    backgroundColor: '#000d63',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginBottom: 5, // Space between Add Friend and Chat
    alignItems: 'center',
    minWidth: 100,
  },
  chatButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 100,
  },
  addUserButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 13,
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
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 24, height: 24, marginBottom: 2 },
  navText: { fontSize: 11, color: '#000d63', fontWeight: '500' }
});