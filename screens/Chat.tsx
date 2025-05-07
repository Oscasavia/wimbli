import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator, // Added for potential avatar loading
  Pressable, // Use pressable for better feedback control if needed
  Alert, // Keep Alert import
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native"; // Added useNavigation
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc, // Added updateDoc for potential use
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { Feather } from "@expo/vector-icons"; // Use Feather icons
import { SafeAreaView } from "react-native-safe-area-context"; // Keep if needed for edges='bottom' on KAV
import AsyncStorage from "@react-native-async-storage/async-storage"; // Keep AsyncStorage

// Message Type - Consider adding senderAvatar if denormalized
interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp; // Assuming Firestore Timestamp
  senderName?: string; // Potentially denormalized
  senderAvatar?: string; // Potentially denormalized
  replyToMessageText?: string;
  replyToSenderName?: string;
  likedBy?: string[];
}

// Format Timestamp Function (Keep or refine)
const formatTimestamp = (timestamp: Timestamp | null | undefined) => {
  if (!timestamp) return "";
  let date: Date;
  try {
    date = timestamp.toDate();
    if (isNaN(date.getTime())) return ""; // Invalid date
  } catch (e) {
    console.error("Error converting timestamp:", e);
    return "";
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return isToday
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

// Get Initials Helper (Place outside component or in utils)
const getInitials = (name: string | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter((char) => char && char.match(/[a-zA-Z]/)) // Filter out non-alphabetic characters just in case
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function Chat() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>(); // Use navigation hook
  const { groupId, groupName: initialGroupName } = route.params;

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(true); // Loading state for messages
  const flatListRef = useRef<FlatList>(null);
  const { theme } = useTheme();
  const currentTheme = theme === "dark" ? darkTheme : lightTheme;
  const lastTapTimeRef = useRef(0); // Ref for double-tap timing

  // --- Theme variable fallbacks ---
  const cardBackgroundColor =
    currentTheme.cardBackground || (currentTheme ? "#1c1c1e" : "#ffffff");
  const bubbleSenderBg = currentTheme.primary || "#007AFF";
  const bubbleReceiverBg =
    currentTheme.inputBackground || (theme === "dark" ? "#2c2c2e" : "#f0f0f0");
  const textSenderColor = currentTheme.buttonText || "#ffffff";
  const textReceiverColor = currentTheme.textPrimary || "#000000";
  const timestampSenderColor = textSenderColor + "b0"; // Add opacity
  const timestampReceiverColor = currentTheme.textSecondary || "#8e8e93";
  const inputBackgroundColor =
    currentTheme.inputBackground || (theme === "dark" ? "#2c2c2e" : "#f0f0f0");
  const inputBorderColor =
    currentTheme.inputBorder || (theme === "dark" ? "#444" : "#ddd");
  const placeholderTextColor = currentTheme.textSecondary || "#8e8e93";
  const replyBgColor = theme === "dark" ? "#ffffff15" : "#00000010"; // Subtle reply background
  const replyBorderColor = theme === "dark" ? "#ffffff30" : "#00000020";

  // Effect to set Navigation Header Title
  useEffect(() => {
    const fetchGroupTitle = async () => {
      try {
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        let title = initialGroupName || "Group Chat"; // Use passed name as fallback
        if (groupDoc.exists()) {
          title = groupDoc.data()?.title || title;
        }
        navigation.setOptions({ title: title }); // Set header title
      } catch (error) {
        console.error("Error fetching group title:", error);
        navigation.setOptions({ title: initialGroupName || "Group Chat" }); // Set fallback on error
      }
    };
    fetchGroupTitle();
  }, [groupId, navigation, initialGroupName]); // Rerun if groupId changes

  // Effect to Fetch Messages
  useEffect(() => {
    setLoadingMessages(true);
    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc")); // Order ascending for FlatList

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        console.log(
          `Chat snapshot received. Size: ${snapshot.size}, Changes: ${snapshot.docChanges().length}`
        );
        // PERFORMANCE NOTE: Fetching sender info per message (N+1) is inefficient.
        // Denormalize senderName/senderAvatar onto the message document when sending.
        const msgsPromises = snapshot.docs.map(
          async (docSnap): Promise<Message> => {
            const data = docSnap.data();
            let senderName = data.senderName || "Unknown"; // Use denormalized first
            let senderAvatar = data.senderAvatar || null;

            // Fallback fetch if info isn't denormalized (keep for compatibility if needed)
            if ((senderName === "Unknown" || !senderAvatar) && data.senderId) {
              try {
                const senderDoc = await getDoc(doc(db, "users", data.senderId));
                if (senderDoc.exists()) {
                  const senderData = senderDoc.data();
                  senderName = senderData.username || "Unknown";
                  senderAvatar = senderData.profilePicture || null; // Assuming 'profilePicture' field
                }
              } catch (fetchError) {
                console.error("Error fetching sender doc:", fetchError);
              }
            }

            return {
              id: docSnap.id,
              text: data.text || "",
              senderId: data.senderId || "",
              timestamp: data.timestamp || Timestamp.now(), // Provide default timestamp
              replyToMessageText: data.replyToMessageText,
              replyToSenderName: data.replyToSenderName,
              likedBy: data.likedBy || [], // Default to empty array
              senderName,
              senderAvatar,
            };
          }
        );

        const msgs = await Promise.all(msgsPromises);
        setMessages(msgs);
        setLoadingMessages(false);

        // Scroll to end slightly delayed to allow layout calculation
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100); // Adjust delay if needed
      },
      (error) => {
        console.error("Error fetching messages:", error);
        Alert.alert("Error", "Could not load messages.");
        setLoadingMessages(false);
      }
    );

    // --- Cleanup function: Mark as read on EXIT ---
    return () => {
      console.log(
        "ChatScreen exiting. Unsubscribing messages listener and updating lastSeen."
      );
      unsubscribe(); // Unsubscribe from message listener

      // Update lastSeen again when leaving the screen
      // Use a new timestamp reflecting the time of exit
      AsyncStorage.setItem(`lastSeen_${groupId}`, new Date().toISOString())
        .then(() => console.log(`Updated lastSeen_${groupId} on exit.`))
        .catch((err) => console.error("Error setting lastSeen on exit:", err));
    };
  }, [groupId]); // Only depends on groupId

  // --- Actions ---

  const handleDoubleTapLike = (messageId: string, currentLikes?: string[]) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300; // ms
    if (now - lastTapTimeRef.current < DOUBLE_PRESS_DELAY) {
      likeMessage(messageId, currentLikes);
    }
    lastTapTimeRef.current = now;
  };

  const likeMessage = async (
    messageId: string,
    currentLikes: string[] = []
  ) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const messageRef = doc(db, "groups", groupId, "messages", messageId);
    const isLiked = currentLikes.includes(userId);

    const updatedLikes = isLiked
      ? currentLikes.filter((uid) => uid !== userId) // Unlike
      : [...currentLikes, userId]; // Like

    try {
      // Use updateDoc for potentially better performance on existing fields
      await updateDoc(messageRef, { likedBy: updatedLikes });
    } catch (error) {
      console.error("Error updating likes:", error);
      Alert.alert("Error", "Could not update like status.");
      // Optional: Revert optimistic UI update if implemented
    }
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.uid) {
      Alert.alert("Error", "You must be logged in to send messages.");
      return;
    }
    const userId = currentUser.uid;

    // Fetch sender info ONCE before sending (if not already available/cached)
    // Ideally, get this info on app load or login and store in context/state
    let senderName = "Unknown";
    let senderAvatar = null;
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        senderName = userData.username || "Unknown";
        senderAvatar = userData.profilePicture || null;
      }
    } catch (error) {
      console.error("Error fetching sender info for sending message:", error);
      // Proceed with defaults, but log error
    }

    const newMessageData: any = {
      // Use 'any' for flexibility or create a specific SendMessage type
      text: trimmedInput,
      senderId: userId,
      timestamp: Timestamp.now(),
      likedBy: [], // Initialize likes
      // Denormalize sender info
      senderName: senderName,
      senderAvatar: senderAvatar,
      // Add reply info if present
      ...(replyingTo && {
        replyToMessageText: replyingTo.text,
        replyToSenderName: replyingTo.senderName,
      }),
    };

    setInput(""); // Clear input optimistically
    setReplyingTo(null); // Clear reply state optimistically

    try {
      // Add the message to the subcollection
      await addDoc(
        collection(db, "groups", groupId, "messages"),
        newMessageData
      );

      // Update the parent group document's last message/timestamp
      await updateDoc(doc(db, "groups", groupId), {
        lastMessage: trimmedInput, // Store the new message text
        lastUpdated: newMessageData.timestamp, // Store the new timestamp (as Timestamp)
      });

      // Scroll to end after sending (might need slight delay)
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100
      );
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Could not send message.");
      // Optional: Restore input/reply state if needed
      setInput(trimmedInput);
      setReplyingTo(replyingTo);
    }
  };

  // --- Render Message Item ---
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isSender = item.senderId === auth.currentUser?.uid;

    return (
      <Pressable // Use Pressable for better control over feedback/gestures
        onPress={() => handleDoubleTapLike(item.id, item.likedBy)}
        onLongPress={() => setReplyingTo(item)}
        delayLongPress={300}
        style={[
          styles.messageRow,
          { justifyContent: isSender ? "flex-end" : "flex-start" },
        ]}
      >
        {/* Avatar for Receiver */}
        {!isSender && (
          <Image
            source={
              item.senderAvatar
                ? { uri: item.senderAvatar }
                : require("../assets/default-profile.png")
            }
            style={styles.avatar}
          />
          // Alternative: Initials Placeholder
          // <View style={[styles.avatar, styles.initialsAvatar, { backgroundColor: currentTheme.secondary + '50'}]}>
          //    <Text style={[styles.initialsText, {color: currentTheme.secondary}]}>{getInitials(item.senderName)}</Text>
          // </View>
        )}

        {/* Message Content Container */}
        <View
          style={[
            styles.messageContentContainer,
            isSender ? styles.senderMessageAlign : styles.receiverMessageAlign,
          ]}
        >
          {/* Sender Name for Receiver */}
          {!isSender && (
            <Text
              style={[styles.senderName, { color: currentTheme.textSecondary }]}
            >
              {item.senderName || "User"}
            </Text>
          )}

          {/* Message Bubble */}
          <View
            style={[
              styles.messageBubbleBase,
              isSender ? styles.senderBubble : styles.receiverBubble,
              { backgroundColor: isSender ? bubbleSenderBg : bubbleReceiverBg },
            ]}
          >
            {/* Reply Snippet */}
            {item.replyToMessageText && (
              <View
                style={[
                  styles.replyContainer,
                  {
                    borderLeftColor: isSender
                      ? textSenderColor + "50"
                      : replyBorderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.replySender,
                    {
                      color: isSender
                        ? textSenderColor + "b0"
                        : currentTheme.textSecondary,
                    },
                  ]}
                >
                  {item.replyToSenderName || "Unknown"}
                </Text>
                <Text
                  style={[
                    styles.replyText,
                    {
                      color: isSender
                        ? textSenderColor + "d0"
                        : textReceiverColor + "d0",
                    },
                  ]}
                  numberOfLines={2}
                >
                  {item.replyToMessageText}
                </Text>
              </View>
            )}
            {/* Main Message Text */}
            <Text
              style={[
                styles.messageText,
                { color: isSender ? textSenderColor : textReceiverColor },
              ]}
            >
              {item.text}
            </Text>
            {/* Timestamp & Likes Row */}
            <View style={styles.bubbleFooter}>
              {/* Likes */}
              {item.likedBy && item.likedBy.length > 0 && (
                <Text
                  style={[
                    styles.likeText,
                    {
                      color: isSender
                        ? timestampSenderColor
                        : timestampReceiverColor,
                    },
                  ]}
                >
                  ❤️ {item.likedBy.length}
                </Text>
              )}
              {/* Timestamp */}
              <Text
                style={[
                  styles.timestamp,
                  {
                    color: isSender
                      ? timestampSenderColor
                      : timestampReceiverColor,
                  },
                ]}
              >
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  // --- Main Component Return ---
  return (
    // Use SafeAreaView edges if needed, especially for 'bottom' with KAV
    <SafeAreaView
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined} // "height" might also work
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // Adjust offset based on header height
      >
        {/* Header is now handled by navigation.setOptions */}

        {/* Message List */}
        {loadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={currentTheme.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={{ color: currentTheme.textSecondary }}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContentContainer}
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            } // Scroll on initial layout
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            } // Scroll on content size change
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Reply Preview Area */}
        {replyingTo && (
          <View
            style={[
              styles.replyPreviewContainer,
              {
                backgroundColor: inputBackgroundColor,
                borderTopColor: inputBorderColor,
              },
            ]}
          >
            <View style={styles.replyPreviewTextContainer}>
              <Text
                style={[
                  styles.replyPreviewLabel,
                  { color: currentTheme.primary },
                ]}
              >
                Replying to {replyingTo.senderName || "Unknown"}
              </Text>
              <Text
                style={[
                  styles.replyPreviewText,
                  { color: currentTheme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {replyingTo.text}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyingTo(null)}
              style={styles.cancelReplyButton}
            >
              <Feather name="x" size={20} color={currentTheme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View
          style={[
            styles.inputAreaContainer,
            { borderTopColor: inputBorderColor },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: inputBackgroundColor,
                borderColor: inputBorderColor,
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              style={[styles.textInput, { color: currentTheme.textPrimary }]}
              placeholder="Type a message..."
              placeholderTextColor={placeholderTextColor}
              multiline // Allow multiline input
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: input.trim()
                  ? currentTheme.primary
                  : currentTheme.textSecondary,
              },
            ]} // Dim button if no input
            onPress={sendMessage}
            disabled={!input.trim()} // Disable if no input
          >
            <Feather
              name="send"
              size={20}
              color={currentTheme.buttonText || "#fff"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContentContainer: {
    paddingVertical: 10, // Add vertical padding for list
    paddingHorizontal: 10,
  },
  // Header (Removed custom view, now uses navigation options)
  // --- Message Row & Content ---
  messageRow: {
    flexDirection: "row",
    marginVertical: 4, // Vertical space between messages
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 2, // Align avatar slightly lower
    alignSelf: "flex-start", // Keep avatar at the top
  },
  initialsAvatar: {
    // backgroundColor set dynamically
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    // color set dynamically
    fontWeight: "bold",
    fontSize: 12,
  },
  messageContentContainer: {
    maxWidth: "80%", // Limit bubble width
  },
  senderMessageAlign: {
    // No specific alignment needed if row justifyContent is 'flex-end'
  },
  receiverMessageAlign: {
    // No specific alignment needed if row justifyContent is 'flex-start'
  },
  senderName: {
    fontSize: 12,
    // fontWeight: '600', // Optional: slightly bolder sender name
    marginBottom: 3,
    marginLeft: 2, // Indent name slightly
  },
  // --- Message Bubble Styles ---
  messageBubbleBase: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18, // General rounding
    minWidth: 50, // Ensure very short messages have some width
  },
  senderBubble: {
    borderBottomRightRadius: 4, // Squarish corner towards user
    // backgroundColor set dynamically
  },
  receiverBubble: {
    borderBottomLeftRadius: 4, // Squarish corner towards user
    // backgroundColor set dynamically
  },
  replyContainer: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 6,
    opacity: 0.9, // Make reply slightly transparent
    // borderLeftColor set dynamically
  },
  replySender: {
    fontWeight: "600", // Bold sender in reply
    fontSize: 11,
    marginBottom: 1,
    // color set dynamically
  },
  replyText: {
    fontSize: 12,
    // color set dynamically
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    // color set dynamically
  },
  bubbleFooter: {
    flexDirection: "row",
    justifyContent: "flex-end", // Align items to the end
    alignItems: "center",
    marginTop: 5,
  },
  likeContainer: {
    // If needed for separate like positioning
  },
  likeText: {
    fontSize: 11,
    // color set dynamically
    marginRight: 6, // Space between like and timestamp
  },
  timestamp: {
    fontSize: 10,
    // color set dynamically
    // alignSelf: 'flex-end', // Removed, handled by bubbleFooter
  },
  // --- Reply Preview Styles ---
  replyPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderTopWidth: 0,
    // backgroundColor, borderTopColor set dynamically
  },
  replyPreviewTextContainer: {
    flex: 1, // Take available space
    marginRight: 10,
  },
  replyPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 1,
    // color set dynamically
  },
  replyPreviewText: {
    fontSize: 13,
    // color set dynamically
  },
  cancelReplyButton: {
    padding: 5, // Tappable area
  },
  // --- Input Area Styles ---
  inputAreaContainer: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    //  borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center", // Align input and button vertically
    // borderTopColor set dynamically
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25, // Rounder input container
    borderWidth: 0,
    paddingHorizontal: 12,
    marginRight: 8,
    // backgroundColor, borderColor set dynamically
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 14 : 12, // Adjust padding per platform
    fontSize: 16,
    maxHeight: 100, // Limit height for multiline
    // color set dynamically
  },
  sendButton: {
    width: 44, // Circular button
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor set dynamically
  },
  // sendIcon: { // Not strictly needed if only icon is used
  // },
});
