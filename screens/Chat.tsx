// Chat.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Image
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { collection, addDoc, onSnapshot, orderBy, query, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../themeColors';
import { setDoc } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  senderName?: string;
}

export default function Chat() {
  const route = useRoute<any>();
  const { groupId, groupName: initialGroupName } = route.params;
  const [groupName, setGroupName] = useState<string>(initialGroupName || 'Group Chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { theme } = useTheme();
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    const fetchGroupTitle = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          const data = groupDoc.data();
          if (data?.title) setGroupName(data.title);
        }
      } catch (error) {
        console.error('Failed to fetch group title:', error);
      }
    };
  
    fetchGroupTitle();
  }, [groupId]);

  const fetchSenderName = async (senderId: string): Promise<string> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', senderId));
      return userDoc.exists() ? userDoc.data()?.username || 'Unknown' : 'Unknown';
    } catch {
      return 'Unknown';
    }
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
      senderAvatar: userData.avatar || null, // avatar should be a URL
      timestamp: Timestamp.now(),
    };
  
    await addDoc(collection(db, 'groups', groupId, 'messages'), newMessage);

    await setDoc(
      doc(db, 'groups', groupId),
      {
        lastMessage: newMessage.text,
        lastUpdated: newMessage.timestamp.toDate().toISOString(),
      },
      { merge: true }
    );
  
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: currentTheme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: currentTheme.textPrimary }]}>
          {groupName}
        </Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 10 }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageContainer,
              { alignSelf: item.senderId === auth.currentUser?.uid ? 'flex-end' : 'flex-start' },
            ]}
          >
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
            <View
              style={[
                styles.messageBubble,
                {
                  backgroundColor:
                    item.senderId === auth.currentUser?.uid
                      ? currentTheme.primary
                      : currentTheme.secondary,
                },
              ]}
            >
              <Text style={{ color: currentTheme.buttonText }}>{item.text}</Text>
              <Text style={styles.timestamp}>
                {item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
      />
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
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageBubble: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    maxWidth: '75%',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  messageContainer: {
    marginVertical: 6,
    maxWidth: '80%',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderName: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    color: '#eee',
    alignSelf: 'flex-end',
  },
});