// Enhanced Chat.tsx with reply functionality
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, Image
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import {
  collection, addDoc, onSnapshot, orderBy,
  query, Timestamp, doc, getDoc, setDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../themeColors';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  senderName?: string;
  replyToMessageText?: string;
  replyToSenderName?: string;
}

const formatTimestamp = (timestamp: Timestamp) => {
  const date = timestamp.toDate();
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // shows time like 2:00 PM
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });     // shows date like Mar 20
};

export default function Chat() {
  const route = useRoute<any>();
  const { groupId, groupName: initialGroupName } = route.params;
  const [groupName, setGroupName] = useState<string>(initialGroupName || 'Group Chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { theme } = useTheme();
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    const fetchGroupTitle = async () => {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        const data = groupDoc.data();
        if (data?.title) setGroupName(data.title);
      }
    };
    fetchGroupTitle();
  }, [groupId]);

  const fetchSenderName = async (senderId: string): Promise<string> => {
    const userDoc = await getDoc(doc(db, 'users', senderId));
    return userDoc.exists() ? userDoc.data()?.username || 'Unknown' : 'Unknown';
  };

  useEffect(() => {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const q = query(messagesRef, orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs: Message[] = await Promise.all(
        snapshot.docs.map(async docSnap => {
          const data = docSnap.data();
          const senderName = await fetchSenderName(data.senderId);
          return {
            id: docSnap.id,
            ...data,
            senderName,
          } as Message;
        })
      );
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    });
    return unsubscribe;
  }, [groupId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : {};

    const newMessage = {
      text: input.trim(),
      senderId: userId,
      senderName: userData.username || 'Unknown',
      senderAvatar: userData.avatar || null,
      timestamp: Timestamp.now(),
      ...(replyingTo && {
        replyToMessageText: replyingTo.text,
        replyToSenderName: replyingTo.senderName,
      })
    };

    await addDoc(collection(db, 'groups', groupId, 'messages'), newMessage);

    await setDoc(doc(db, 'groups', groupId), {
      lastMessage: newMessage.text,
      lastUpdated: newMessage.timestamp.toDate().toISOString(),
    }, { merge: true });

    setInput('');
    setReplyingTo(null);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: currentTheme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: currentTheme.textPrimary }]}>{groupName}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => setReplyingTo(item)}
            delayLongPress={300}
          >
            <View style={[
              styles.messageContainer,
              { alignSelf: item.senderId === auth.currentUser?.uid ? 'flex-end' : 'flex-start' },
            ]}>
              {item.senderId !== auth.currentUser?.uid && (
                <View style={styles.senderInfo}>
                  {item.senderAvatar ? (
                    <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
                  )}
                  <Text style={[styles.senderName, { color: currentTheme.textSecondary }]}>
                    {item.senderName || 'User'}
                  </Text>
                </View>
              )}
              <View style={[styles.messageBubble, {
                backgroundColor: item.senderId === auth.currentUser?.uid ? currentTheme.primary : currentTheme.secondary,
              }]}
              >
                {item.replyToMessageText && (
                  <View style={styles.replyContainer}>
                    <Text style={styles.replySender}>{item.replyToSenderName}</Text>
                    <Text style={styles.replyText}>{item.replyToMessageText}</Text>
                  </View>
                )}
                <Text style={{ color: currentTheme.buttonText }}>{item.text}</Text>
                <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {replyingTo && (
        <View style={styles.replyPreview}>
          <View>
            <Text style={styles.replySender}>{replyingTo.senderName}</Text>
            <Text style={styles.replyText} numberOfLines={1}>{replyingTo.text}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Text style={styles.cancelReply}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          style={[styles.textInput, { backgroundColor: currentTheme.inputBackground, color: currentTheme.textPrimary }]}
          placeholder="Type a message..."
          placeholderTextColor={currentTheme.textSecondary}
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: currentTheme.primary }]} onPress={sendMessage}>
          <Text style={{ color: currentTheme.buttonText }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingBottom: 15, alignItems: 'center', borderBottomWidth: 1, borderColor: '#ccc' },
  headerText: { fontSize: 18, fontWeight: 'bold' },
  messageBubble: { marginVertical: 6, padding: 12, borderRadius: 12, maxWidth: '75%' },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  textInput: { flex: 1, padding: 12, borderRadius: 20, fontSize: 16, marginRight: 10 },
  sendButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
  messageContainer: { marginVertical: 6, maxWidth: '80%' },
  senderInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  senderName: { marginLeft: 6, fontSize: 12, fontWeight: '600' },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  timestamp: { fontSize: 10, marginTop: 4, color: '#eee', alignSelf: 'flex-end' },
  replyContainer: { borderLeftWidth: 3, borderLeftColor: '#ccc', paddingLeft: 8, marginBottom: 5 },
  replySender: { fontWeight: 'bold', fontSize: 12, color: '#eee' },
  replyText: { fontSize: 12, color: '#ddd' },
  replyPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#eee', borderTopWidth: 1, borderColor: '#ccc' },
  cancelReply: { color: 'red', fontSize: 14, marginLeft: 10 }
});
